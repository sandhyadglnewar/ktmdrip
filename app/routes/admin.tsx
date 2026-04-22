import { Link } from "react-router";
import type { Route } from "./+types/admin";
import { getCurrentUser } from "~/lib/auth.server";
import { ALL_PRODUCTS } from "~/lib/data";
import { formatPrice } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Admin Dashboard — KTMDrip" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  const user = await getCurrentUser(request, env as any);
  if (!user || user.role !== "admin") {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  // Try D1 for real data
  let products = ALL_PRODUCTS;
  let orders: any[] = [];
  let userCount = 1;

  try {
    const env = context?.cloudflare?.env || {};
    const db = (env as any).DB as D1Database | undefined;
    if (db) {
      const pResult = await db.prepare("SELECT * FROM products ORDER BY created_at DESC").all();
      if (pResult.results?.length) products = pResult.results as any;

      const oResult = await db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 20").all();
      orders = oResult.results || [];

      const uResult = await db.prepare("SELECT COUNT(*) as count FROM users").first();
      userCount = (uResult as any)?.count || 1;
    }
  } catch {
    // Demo data
    orders = [
      { id: 1001, guest_email: "ram@example.com", status: "pending", total: 9300, created_at: "2026-04-22T08:00:00Z" },
      { id: 1002, guest_email: "sita@example.com", status: "shipped", total: 4599, created_at: "2026-04-21T10:00:00Z" },
      { id: 1003, guest_email: "hari@example.com", status: "delivered", total: 12600, created_at: "2026-04-20T12:00:00Z" },
    ];
  }

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0);

  return { user, products, orders, userCount, totalRevenue };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get("intent") as string;

  if (intent === "update-status") {
    const orderId = form.get("orderId") as string;
    const status = form.get("status") as string;
    try {
      const env = context?.cloudflare?.env || {};
      const db = (env as any).DB as D1Database | undefined;
      if (db) {
        await db.prepare("UPDATE orders SET status = ? WHERE id = ?").bind(status, orderId).run();
      }
    } catch {
      console.log("[Admin] Order status updated (demo):", orderId, status);
    }
    return { updated: true };
  }

  if (intent === "add-product") {
    const name = form.get("name") as string;
    const price = Number(form.get("price"));
    const category = form.get("category") as string;
    const gender = form.get("gender") as string;
    const tag = form.get("tag") as string;
    const imageUrl = form.get("image_url") as string;
    const description = form.get("description") as string;
    const slug = name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-");

    try {
      const env = context?.cloudflare?.env || {};
      const db = (env as any).DB as D1Database | undefined;
      if (db) {
        await db.prepare(
          "INSERT INTO products (name, slug, description, price, tag, category, gender, image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(name, slug, description, price, tag, category, gender, imageUrl).run();
      }
    } catch {
      console.log("[Admin] Product added (demo):", name);
    }
    return { productAdded: true };
  }

  return {};
}

export default function Admin({ loaderData, actionData }: Route.ComponentProps) {
  const { user, products, orders, userCount, totalRevenue } = loaderData;

  return (
    <>
      <div className="page-header" id="admin-header">
        <p className="section-eyebrow">Administration</p>
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user.name} · <Link to="/profile" style={{ color: "var(--color-teal)" }}>My Profile</Link></p>
      </div>

      {/* STATS */}
      <div className="perks" id="admin-stats">
        <div className="perk"><span className="perk-icon">📦</span><span>{products.length} Products</span></div>
        <div className="perk"><span className="perk-icon">🛒</span><span>{orders.length} Orders</span></div>
        <div className="perk"><span className="perk-icon">👥</span><span>{userCount} Users</span></div>
        <div className="perk"><span className="perk-icon">💰</span><span>{formatPrice(totalRevenue)} Revenue</span></div>
      </div>

      {/* MANAGE ORDERS */}
      <section className="section section-sand" id="admin-orders">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Order Management</p>
            <h2 className="section-title">Recent Orders</h2>
          </div>
        </div>

        {actionData?.updated && <div className="subscribed-msg" style={{ marginBottom: 20 }}>✓ Order status updated.</div>}

        <div className="orders-list">
          {orders.map((order: any) => (
            <div className="order-card" key={order.id}>
              <div className="order-card-header">
                <span className="order-id">#{order.id} — {order.guest_email || "Customer"}</span>
                <span className="order-status" style={{ background: order.status === "delivered" ? "var(--color-teal)" : order.status === "pending" ? "#e67e22" : "#9b59b6" }}>
                  {order.status}
                </span>
              </div>
              <div className="order-card-body">
                <span>{formatPrice(order.total)}</span>
                <span>{new Date(order.created_at).toLocaleDateString()}</span>
                <form method="post" style={{ display: "flex", gap: 8 }}>
                  <input type="hidden" name="intent" value="update-status" />
                  <input type="hidden" name="orderId" value={order.id} />
                  <select name="status" defaultValue={order.status} style={{ padding: "4px 8px", fontSize: 11, border: "1px solid #cec6bc" }}>
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button type="submit" className="filter-btn active" style={{ padding: "4px 12px", fontSize: 10 }}>Update</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ADD PRODUCT */}
      <section className="section section-light" id="admin-add-product">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Product Management</p>
            <h2 className="section-title">Add New Product</h2>
          </div>
        </div>

        {actionData?.productAdded && <div className="subscribed-msg" style={{ marginBottom: 20 }}>✓ Product added successfully.</div>}

        <form method="post" className="auth-form" style={{ maxWidth: 600 }}>
          <input type="hidden" name="intent" value="add-product" />
          <div className="auth-field">
            <label htmlFor="p-name">Product Name</label>
            <input type="text" name="name" id="p-name" required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="auth-field">
              <label htmlFor="p-price">Price (NPR)</label>
              <input type="number" name="price" id="p-price" required min={1} />
            </div>
            <div className="auth-field">
              <label htmlFor="p-category">Category</label>
              <select name="category" id="p-category" style={{ width: "100%", padding: "12px 14px", border: "1px solid #cec6bc", fontSize: 14, fontFamily: "var(--font-sans)" }}>
                <option>Tops</option><option>Bottoms</option><option>Outerwear</option><option>Dresses</option><option>Accessories</option>
              </select>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="auth-field">
              <label htmlFor="p-gender">Gender</label>
              <select name="gender" id="p-gender" style={{ width: "100%", padding: "12px 14px", border: "1px solid #cec6bc", fontSize: 14, fontFamily: "var(--font-sans)" }}>
                <option value="men">Men</option><option value="women">Women</option><option value="unisex">Unisex</option>
              </select>
            </div>
            <div className="auth-field">
              <label htmlFor="p-tag">Tag</label>
              <input type="text" name="tag" id="p-tag" defaultValue="New" />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="p-image">Image URL</label>
            <input type="url" name="image_url" id="p-image" placeholder="https://..." required />
          </div>
          <div className="auth-field">
            <label htmlFor="p-desc">Description</label>
            <textarea name="description" id="p-desc" rows={3} style={{ width: "100%", padding: "12px 14px", border: "1px solid #cec6bc", fontSize: 14, fontFamily: "var(--font-sans)", resize: "vertical" }} />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }}>Add Product</button>
        </form>
      </section>

      {/* PRODUCT LIST */}
      <section className="section section-sand" id="admin-products">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Inventory</p>
            <h2 className="section-title">All Products ({products.length})</h2>
          </div>
        </div>
        <div className="orders-list">
          {products.slice(0, 20).map((p: any) => (
            <div className="order-card" key={p.id}>
              <div className="order-card-header">
                <span className="order-id">{p.name}</span>
                <span className="order-status" style={{ background: "var(--color-teal)" }}>{p.tag}</span>
              </div>
              <div className="order-card-body">
                <span>{formatPrice(p.price)}</span>
                <span>{p.category}</span>
                <span>{p.gender}</span>
                <span>Stock: {p.stock}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
