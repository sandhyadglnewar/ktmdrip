import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/profile";
import { requireUser } from "~/lib/auth.server";
import { SetupNotice } from "~/components/ui/SetupNotice";
import { getUserOrders } from "~/lib/catalog.server";
import { formatPrice } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [{ title: "My Account — KTMDrip" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  try {
    const user = await requireUser(request, env as any);
    const orders = await getUserOrders(env as Partial<Env>, user.id);
    return { user, orders, setupRequired: false as const };
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      user: null,
      orders: [],
      setupRequired: true as const,
      setupMessage:
        error instanceof Error
          ? `${error.message} Visit /seed before using account features.`
          : "Visit /seed before using account features.",
    };
  }
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  if (loaderData.setupRequired) {
    return <SetupNotice title="Account Not Ready" message={loaderData.setupMessage} />;
  }

  const { user, orders } = loaderData;
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
  const sortBy = searchParams.get("sort") || "newest";

  const statusColor: Record<string, string> = {
    pending: "#e67e22",
    confirmed: "#3498db",
    shipped: "#9b59b6",
    delivered: "#00A19B",
    cancelled: "#e74c3c",
  };
  const paymentColor: Record<string, string> = {
    unpaid: "#95a5a6",
    paid: "#00A19B",
    action_required: "#f39c12",
    failed: "#e74c3c",
  };

  const filteredOrders = orders
    .filter((order) => statusFilter === "all" || order.status === statusFilter || order.payment_status === statusFilter)
    .sort((a, b) => {
      if (sortBy === "highest") return b.total - a.total;
      if (sortBy === "lowest") return a.total - b.total;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const totalSpent = orders.reduce((sum, order) => sum + order.total, 0);
  const deliveredCount = orders.filter((order) => order.status === "delivered").length;
  const pendingCount = orders.filter((order) => order.status === "pending" || order.payment_status === "action_required").length;
  const lastOrder = orders[0] ?? null;
  const memberSince = new Date(user.created_at).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
  });

  function updateFilter(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all" || value === "newest") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  return (
    <>
      <section className="account-shell account-shell-profile">
        <div className="account-sidebar">
          <p className="section-eyebrow">My Account</p>
          <h1 className="account-title">{user.name || user.email.split("@")[0]}</h1>
          <p className="account-subtitle">{user.email}</p>

          <div className="account-stat-grid">
            <div className="account-stat-card">
              <span className="account-stat-label">Orders</span>
              <strong>{orders.length}</strong>
            </div>
            <div className="account-stat-card">
              <span className="account-stat-label">Delivered</span>
              <strong>{deliveredCount}</strong>
            </div>
            <div className="account-stat-card">
              <span className="account-stat-label">Spent</span>
              <strong>{formatPrice(totalSpent)}</strong>
            </div>
            <div className="account-stat-card">
              <span className="account-stat-label">Role</span>
              <strong>{user.role}</strong>
            </div>
          </div>

          <div className="account-sidebar-links">
            {user.role === "admin" && <Link to="/admin">Open Admin Dashboard</Link>}
            <Link to="/men">Shop New Arrivals</Link>
            <Link to="/logout" className="danger-link">Sign Out</Link>
          </div>
        </div>

        <div className="account-main">
          <div className="account-toolbar">
            <div>
              <p className="section-eyebrow">Order History</p>
              <h2 className="section-title">Orders & Profile</h2>
            </div>
            <div className="account-toolbar-controls">
              <select
                value={statusFilter}
                onChange={(e) => updateFilter({ status: e.target.value })}
                className="dashboard-select"
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="paid">Paid</option>
                <option value="action_required">Needs action</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => updateFilter({ sort: e.target.value })}
                className="dashboard-select"
              >
                <option value="newest">Newest first</option>
                <option value="highest">Highest total</option>
                <option value="lowest">Lowest total</option>
              </select>
            </div>
          </div>

          <div className="profile-overview-grid">
            <article className="profile-detail-card">
              <p className="profile-detail-label">Account Snapshot</p>
              <h3>{user.name || "Customer"} Profile</h3>
              <div className="profile-detail-list">
                <span>Email: {user.email}</span>
                <span>Role: {user.role}</span>
                <span>Member since: {memberSince}</span>
              </div>
            </article>

            <article className="profile-detail-card accent">
              <p className="profile-detail-label">Latest Activity</p>
              <h3>{lastOrder ? `Order #${lastOrder.id}` : "No orders yet"}</h3>
              <div className="profile-detail-list">
                <span>{lastOrder ? new Date(lastOrder.created_at).toLocaleDateString() : "Your next order will appear here."}</span>
                <span>{lastOrder ? `${lastOrder.item_count} item${lastOrder.item_count === 1 ? "" : "s"} · ${formatPrice(lastOrder.total)}` : "Start with new arrivals or sale picks."}</span>
                <span>{pendingCount} open update{pendingCount === 1 ? "" : "s"}</span>
              </div>
            </article>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="account-empty-state">
              <p>No matching orders yet.</p>
              <Link to="/women" className="btn-primary" style={{ textDecoration: "none", display: "inline-block", marginTop: 16 }}>
                Keep Shopping
              </Link>
            </div>
          ) : (
            <div className="enhanced-orders">
              {filteredOrders.map((order) => (
                <article className="enhanced-order-card" key={order.id}>
                  <div className="enhanced-order-media">
                    {order.preview_image_url ? (
                      <img src={order.preview_image_url} alt={order.items[0]?.name || `Order ${order.id}`} />
                    ) : (
                      <div className="enhanced-order-placeholder">KTM</div>
                    )}
                  </div>

                  <div className="enhanced-order-content">
                    <div className="enhanced-order-top">
                      <div>
                        <p className="enhanced-order-id">Order #{order.id}</p>
                        <h3>{order.item_count} item{order.item_count === 1 ? "" : "s"} · {formatPrice(order.total)}</h3>
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
                      <span>{new Date(order.created_at).toLocaleDateString()}</span>
                      <span>{order.shipping_city || "Kathmandu"}</span>
                      {order.payment_intent_id && <span>{order.payment_intent_id}</span>}
                    </div>

                    <div className="enhanced-order-items">
                      {order.items.slice(0, 3).map((item) => (
                        <Link key={`${order.id}-${item.product_id}`} to={`/product/${item.slug}`} className="enhanced-order-item">
                          <img src={item.image_url} alt={item.name} />
                          <div>
                            <strong>{item.name}</strong>
                            <span>Qty {item.quantity} · {formatPrice(item.price)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
