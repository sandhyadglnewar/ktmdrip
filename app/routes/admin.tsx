import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/admin";
import { requireAdmin } from "~/lib/auth.server";
import { SetupNotice } from "~/components/ui/SetupNotice";
import { formatPrice } from "~/lib/utils";
import { addProduct, deleteProduct, getAdminDashboard, updateOrderStatus, updateProduct } from "~/lib/catalog.server";
import type { Product } from "~/lib/types";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin Dashboard — KTMDrip" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  try {
    const user = await requireAdmin(request, env as any);
    const dashboard = await getAdminDashboard(env as Partial<Env>);
    return { user, ...dashboard, setupRequired: false as const };
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      user: null,
      products: [],
      orders: [],
      userCount: 0,
      totalRevenue: 0,
      setupRequired: true as const,
      setupMessage:
        error instanceof Error
          ? `${error.message} Visit /seed, then sign in with the seeded admin account.`
          : "Visit /seed, then sign in with the seeded admin account.",
    };
  }
}

export async function action({ request, context }: Route.ActionArgs) {
  const env = context?.cloudflare?.env || {};
  await requireAdmin(request, env as any);
  const form = await request.formData();
  const intent = form.get("intent") as string;

  function parseProductInput() {
    const name = String(form.get("name") || "").trim();
    const price = Number(form.get("price"));
    const salePriceRaw = String(form.get("sale_price") || "").trim();
    const sale_price = salePriceRaw ? Number(salePriceRaw) : null;
    const category = String(form.get("category") || "").trim();
    const gender = form.get("gender") as "men" | "women" | "unisex";
    const tag = String(form.get("tag") || "New").trim();
    const image_url = String(form.get("image_url") || "").trim();
    const description = String(form.get("description") || "").trim();
    const stock = Number(form.get("stock") || 0);
    const featured = form.get("featured") === "on";
    const is_new = form.get("is_new") === "on";

    if (!name || !category || !gender || !image_url || !Number.isFinite(price) || price <= 0) {
      throw new Error("Please fill out all product fields correctly.");
    }

    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error("Stock must be zero or more.");
    }

    if (sale_price !== null && (!Number.isFinite(sale_price) || sale_price <= 0 || sale_price >= price)) {
      throw new Error("Sale price must be lower than the main price.");
    }

    const discount =
      sale_price !== null ? Math.max(1, Math.round(((price - sale_price) / price) * 100)) : null;

    return {
      name,
      price,
      sale_price,
      discount,
      category,
      gender,
      tag,
      image_url,
      description,
      stock,
      featured,
      is_new,
    };
  }

  if (intent === "update-status") {
    const orderId = Number(form.get("orderId"));
    const status = form.get("status") as "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
    await updateOrderStatus(env as Partial<Env>, orderId, status);
    return { updated: true };
  }

  if (intent === "add-product") {
    try {
      const result = await addProduct(env as Partial<Env>, parseProductInput());
      return { productAdded: true, productSlug: result.slug };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to add product." };
    }
  }

  if (intent === "update-product") {
    try {
      const productId = Number(form.get("productId"));
      if (!Number.isFinite(productId) || productId <= 0) {
        return { error: "Invalid product selected." };
      }

      const result = await updateProduct(env as Partial<Env>, productId, parseProductInput());
      return { productUpdated: true, productSlug: result.slug };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to update product." };
    }
  }

  if (intent === "delete-product") {
    try {
      const productId = Number(form.get("productId"));
      if (!Number.isFinite(productId) || productId <= 0) {
        return { error: "Invalid product selected." };
      }

      await deleteProduct(env as Partial<Env>, productId);
      return { productDeleted: true };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to delete product." };
    }
  }

  return {};
}

export default function Admin({ loaderData, actionData }: Route.ComponentProps) {
  if (loaderData.setupRequired) {
    return <SetupNotice title="Admin Not Ready" message={loaderData.setupMessage} />;
  }

  const { user, products, orders, userCount, totalRevenue } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "orders";
  const orderFilter = searchParams.get("order") || "all";
  const productFilter = searchParams.get("inventory") || "all";
  const productSort = searchParams.get("sort") || "newest";
  const orderQuery = (searchParams.get("q") || "").trim().toLowerCase();
  const inventoryQuery = (searchParams.get("inventory_q") || "").trim().toLowerCase();
  const [productModal, setProductModal] = useState<{ mode: "add" } | { mode: "edit"; product: Product } | null>(null);

  const paymentColor: Record<string, string> = {
    unpaid: "#95a5a6",
    paid: "var(--color-teal)",
    action_required: "#f39c12",
    failed: "var(--color-red)",
  };
  const statusColor: Record<string, string> = {
    pending: "#e67e22",
    confirmed: "#3498db",
    shipped: "#9b59b6",
    delivered: "var(--color-teal)",
    cancelled: "var(--color-red)",
  };

  const filteredOrders = orders
    .filter((order) => {
      if (orderFilter === "all") return true;
      return order.status === orderFilter || order.payment_status === orderFilter;
    })
    .filter((order) => {
      if (!orderQuery) return true;
      return [
        order.customer_label,
        order.shipping_city,
        order.payment_intent_id,
        String(order.id),
        ...order.items.map((item) => item.name),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(orderQuery);
    });

  const filteredProducts = [...products]
    .filter((product) => {
      if (productFilter === "low-stock") return product.stock <= 10;
      if (productFilter === "new") return Boolean(product.is_new);
      if (productFilter === "featured") return Boolean(product.featured);
      return true;
    })
    .filter((product) => {
      if (!inventoryQuery) return true;
      return [product.name, product.category, product.gender, product.tag]
        .join(" ")
        .toLowerCase()
        .includes(inventoryQuery);
    })
    .sort((a, b) => {
      if (productSort === "price-high") return b.price - a.price;
      if (productSort === "price-low") return a.price - b.price;
      if (productSort === "stock-low") return a.stock - b.stock;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const paidOrders = orders.filter((order) => order.payment_status === "paid").length;
  const lowStockCount = products.filter((product) => product.stock <= 10).length;
  const processingCount = orders.filter((order) => order.status === "pending" || order.status === "confirmed").length;

  useEffect(() => {
    if (actionData?.productAdded || actionData?.productUpdated) {
      setProductModal(null);
      setSearchParams((previous) => {
        const params = new URLSearchParams(previous);
        params.set("tab", "inventory");
        return params;
      });
    }
  }, [actionData, setSearchParams]);

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" || value === "newest" || (key === "tab" && value === "orders")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  return (
    <section className="account-shell admin-shell">
      <aside className="account-sidebar admin-sidebar">
        <p className="section-eyebrow">Administration</p>
        <h1 className="account-title">Control Room</h1>
        <p className="account-subtitle">Welcome back, {user.name}</p>

        <div className="account-stat-grid">
          <div className="account-stat-card">
            <span className="account-stat-label">Products</span>
            <strong>{products.length}</strong>
          </div>
          <div className="account-stat-card">
            <span className="account-stat-label">Orders</span>
            <strong>{orders.length}</strong>
          </div>
          <div className="account-stat-card">
            <span className="account-stat-label">Users</span>
            <strong>{userCount}</strong>
          </div>
          <div className="account-stat-card">
            <span className="account-stat-label">Revenue</span>
            <strong>{formatPrice(totalRevenue)}</strong>
          </div>
        </div>

        <div className="dashboard-tabs">
          {[
            { id: "orders", label: "Orders" },
            { id: "inventory", label: "Inventory" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`dashboard-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => updateParams({ tab: tab.id })}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="account-sidebar-links">
          <Link to="/profile">Open Customer View</Link>
          <Link to="/logout" className="danger-link">Sign Out</Link>
        </div>
      </aside>

      <div className="account-main admin-main">
        <div className="admin-highlights">
          <article className="admin-highlight-card">
            <p>Paid Orders</p>
            <strong>{paidOrders}</strong>
            <span>Checkout to fulfilled pipeline</span>
          </article>
          <article className="admin-highlight-card">
            <p>Processing Now</p>
            <strong>{processingCount}</strong>
            <span>Pending or confirmed orders</span>
          </article>
          <article className="admin-highlight-card">
            <p>Low Stock</p>
            <strong>{lowStockCount}</strong>
            <span>Products at 10 units or less</span>
          </article>
        </div>

        {activeTab === "orders" && (
          <section className="dashboard-panel">
            <div className="account-toolbar">
              <div>
                <p className="section-eyebrow">Order Management</p>
                <h2 className="section-title">Recent Orders</h2>
              </div>
              <div className="account-toolbar-controls">
                <input
                  type="search"
                  value={orderQuery}
                  onChange={(e) => updateParams({ q: e.target.value })}
                  className="dashboard-search"
                  placeholder="Search customer, order, payment, product..."
                />
                <select
                  value={orderFilter}
                  onChange={(e) => updateParams({ order: e.target.value })}
                  className="dashboard-select"
                >
                  <option value="all">All orders</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="paid">Paid</option>
                  <option value="action_required">Needs action</option>
                </select>
              </div>
            </div>

            {actionData?.updated && <div className="subscribed-msg" style={{ marginBottom: 20 }}>✓ Order status updated.</div>}

            <div className="enhanced-orders admin-orders-grid">
              {filteredOrders.map((order) => (
                <article className="enhanced-order-card admin-order-card" key={order.id}>
                  <div className="enhanced-order-media">
                    {order.preview_image_url ? (
                      <img src={order.preview_image_url} alt={order.items[0]?.name || `Order ${order.id}`} />
                    ) : (
                      <div className="enhanced-order-placeholder">ADM</div>
                    )}
                  </div>
                  <div className="enhanced-order-content">
                    <div className="enhanced-order-top">
                      <div>
                        <p className="enhanced-order-id">Order #{order.id}</p>
                        <h3>{order.customer_label}</h3>
                      </div>
                      <div className="enhanced-order-statuses">
                        <span className="order-status" style={{ background: paymentColor[order.payment_status] || "#999" }}>
                          {order.payment_status || "unpaid"}
                        </span>
                        <span className="order-status" style={{ background: statusColor[order.status] || "#999" }}>
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <div className="enhanced-order-meta">
                      <span>{formatPrice(order.total)}</span>
                      <span>{order.item_count} item{order.item_count === 1 ? "" : "s"}</span>
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      {order.payment_intent_id && <span>{order.payment_intent_id}</span>}
                    </div>

                    <div className="enhanced-order-items">
                      {order.items.slice(0, 2).map((item) => (
                        <div key={`${order.id}-${item.product_id}`} className="enhanced-order-item static">
                          <img src={item.image_url} alt={item.name} />
                          <div>
                            <strong>{item.name}</strong>
                            <span>Qty {item.quantity} · {formatPrice(item.price)}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form method="post" className="admin-inline-form">
                      <input type="hidden" name="intent" value="update-status" />
                      <input type="hidden" name="orderId" value={order.id} />
                      <select name="status" defaultValue={order.status} className="dashboard-select">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <button type="submit" className="btn-primary">Update</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {activeTab === "inventory" && (
          <section className="dashboard-panel">
            <div className="account-toolbar">
              <div>
                <p className="section-eyebrow">Inventory</p>
                <h2 className="section-title">Products</h2>
              </div>
              <div className="account-toolbar-controls">
                <button type="button" className="btn-primary" onClick={() => setProductModal({ mode: "add" })}>
                  Add Product
                </button>
                <input
                  type="search"
                  value={inventoryQuery}
                  onChange={(e) => updateParams({ inventory_q: e.target.value })}
                  className="dashboard-search"
                  placeholder="Search product, category, tag..."
                />
                <select
                  value={productFilter}
                  onChange={(e) => updateParams({ inventory: e.target.value })}
                  className="dashboard-select"
                >
                  <option value="all">All products</option>
                  <option value="low-stock">Low stock</option>
                  <option value="new">New arrivals</option>
                  <option value="featured">Featured</option>
                </select>
                <select
                  value={productSort}
                  onChange={(e) => updateParams({ sort: e.target.value })}
                  className="dashboard-select"
                >
                  <option value="newest">Newest</option>
                  <option value="price-high">Price high</option>
                  <option value="price-low">Price low</option>
                  <option value="stock-low">Stock low</option>
                </select>
              </div>
            </div>

            {(actionData?.productAdded || actionData?.productUpdated || actionData?.productDeleted) && (
              <div className="subscribed-msg" style={{ marginBottom: 20 }}>
                ✓ {actionData.productDeleted ? "Product deleted." : actionData.productUpdated ? "Product updated." : "Product added successfully."}
              </div>
            )}
            {actionData?.error && <div className="auth-error" style={{ marginBottom: 20 }}>{actionData.error}</div>}

            <div className="inventory-grid">
              {filteredProducts.map((product) => (
                <article className="inventory-card" key={product.id}>
                  <img src={product.image_url} alt={product.name} />
                  <div className="inventory-card-body">
                    <div className="inventory-card-top">
                      <div>
                        <p className="inventory-name">{product.name}</p>
                        <span className="inventory-meta">{product.category} · {product.gender}</span>
                      </div>
                      <span className="order-status" style={{ background: product.stock <= 10 ? "var(--color-red)" : "var(--color-teal)" }}>
                        {product.stock <= 10 ? `Only ${product.stock}` : `Stock ${product.stock}`}
                      </span>
                    </div>
                    <div className="inventory-card-footer">
                      <strong>{formatPrice(product.sale_price || product.price)}</strong>
                      <span>{product.tag}</span>
                    </div>
                    <div className="inventory-badges">
                      {Boolean(product.featured) && <span className="product-pill">Featured</span>}
                      {Boolean(product.is_new) && <span className="product-pill alt">New</span>}
                      {product.sale_price ? <span className="product-pill sale">Sale {product.discount ?? 0}%</span> : null}
                    </div>
                    <div className="inventory-card-actions">
                      <button type="button" className="inventory-action-btn" onClick={() => setProductModal({ mode: "edit", product })}>
                        Edit
                      </button>
                      <form
                        method="post"
                        onSubmit={(event) => {
                          if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
                            event.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="intent" value="delete-product" />
                        <input type="hidden" name="productId" value={product.id} />
                        <button type="submit" className="inventory-action-btn danger">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      {productModal && (
        <div className="admin-modal-backdrop" onClick={() => setProductModal(null)}>
          <div className="admin-modal" onClick={(event) => event.stopPropagation()}>
            <div className="admin-modal-head">
              <div>
                <p className="section-eyebrow">Product Management</p>
                <h2 className="section-title">{productModal.mode === "edit" ? "Edit Product" : "Add Product"}</h2>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setProductModal(null)}>
                ×
              </button>
            </div>

            <form method="post" className="auth-form admin-create-form admin-modal-form">
              <input type="hidden" name="intent" value={productModal.mode === "edit" ? "update-product" : "add-product"} />
              {productModal.mode === "edit" && <input type="hidden" name="productId" value={productModal.product.id} />}

              <div className="admin-form-grid">
                <div className="auth-field">
                  <label htmlFor="p-name">Product Name</label>
                  <input type="text" name="name" id="p-name" required defaultValue={productModal.mode === "edit" ? productModal.product.name : ""} />
                </div>
                <div className="auth-field">
                  <label htmlFor="p-price">Price (NPR)</label>
                  <input type="number" name="price" id="p-price" required min={1} defaultValue={productModal.mode === "edit" ? productModal.product.price : ""} />
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="auth-field">
                  <label htmlFor="p-sale-price">Sale Price</label>
                  <input type="number" name="sale_price" id="p-sale-price" min={1} defaultValue={productModal.mode === "edit" && productModal.product.sale_price ? productModal.product.sale_price : ""} />
                </div>
                <div className="auth-field">
                  <label htmlFor="p-stock">Stock</label>
                  <input type="number" name="stock" id="p-stock" min={0} required defaultValue={productModal.mode === "edit" ? productModal.product.stock : 50} />
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="auth-field">
                  <label htmlFor="p-category">Category</label>
                  <select name="category" id="p-category" className="dashboard-select" defaultValue={productModal.mode === "edit" ? productModal.product.category : "Tops"}>
                    <option value="Tops">Tops</option>
                    <option value="Bottoms">Bottoms</option>
                    <option value="Outerwear">Outerwear</option>
                    <option value="Dresses">Dresses</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Lifestyle">Lifestyle</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label htmlFor="p-gender">Gender</label>
                  <select name="gender" id="p-gender" className="dashboard-select" defaultValue={productModal.mode === "edit" ? productModal.product.gender : "unisex"}>
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                    <option value="unisex">Unisex</option>
                  </select>
                </div>
              </div>

              <div className="admin-form-grid">
                <div className="auth-field">
                  <label htmlFor="p-tag">Tag</label>
                  <input type="text" name="tag" id="p-tag" defaultValue={productModal.mode === "edit" ? productModal.product.tag : "New"} />
                </div>
                <div className="auth-field">
                  <label htmlFor="p-image">Image URL</label>
                  <input type="url" name="image_url" id="p-image" placeholder="https://..." required defaultValue={productModal.mode === "edit" ? productModal.product.image_url : ""} />
                </div>
              </div>

              <div className="auth-field">
                <label htmlFor="p-desc">Description</label>
                <textarea
                  name="description"
                  id="p-desc"
                  rows={4}
                  className="admin-textarea"
                  defaultValue={productModal.mode === "edit" ? productModal.product.description : ""}
                />
              </div>

              <div className="admin-checkbox-row">
                <label className="admin-checkbox">
                  <input type="checkbox" name="featured" defaultChecked={productModal.mode === "edit" ? Boolean(productModal.product.featured) : false} />
                  <span>Featured</span>
                </label>
                <label className="admin-checkbox">
                  <input type="checkbox" name="is_new" defaultChecked={productModal.mode === "edit" ? Boolean(productModal.product.is_new) : true} />
                  <span>New arrival</span>
                </label>
              </div>

              <div className="admin-modal-actions">
                <button type="button" className="inventory-action-btn" onClick={() => setProductModal(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {productModal.mode === "edit" ? "Save Changes" : "Publish Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
