import { Link } from "react-router";
import type { Route } from "./+types/profile";
import { getCurrentUser } from "~/lib/auth.server";

export function meta({}: Route.MetaArgs) {
  return [{ title: "My Account — KTMDrip" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  const user = await getCurrentUser(request, env as any);
  if (!user) {
    return new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  // Try to fetch orders from D1
  let orders: any[] = [];
  try {
    const db = (env as any).DB as D1Database | undefined;
    if (db) {
      const result = await db.prepare(
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20"
      ).bind(user.id).all();
      orders = result.results || [];
    }
  } catch {
    // D1 not available — return demo orders
    orders = [
      { id: 1001, status: "delivered", total: 9300, shipping_city: "Kathmandu", created_at: "2026-04-15T10:30:00Z" },
      { id: 1002, status: "shipped", total: 4599, shipping_city: "Lalitpur", created_at: "2026-04-20T14:00:00Z" },
      { id: 1003, status: "pending", total: 6800, shipping_city: "Bhaktapur", created_at: "2026-04-22T08:00:00Z" },
    ];
  }

  return { user, orders };
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const { user, orders } = loaderData;

  const statusColor: Record<string, string> = {
    pending: "#e67e22",
    confirmed: "#3498db",
    shipped: "#9b59b6",
    delivered: "#00A19B",
    cancelled: "#e74c3c",
  };

  return (
    <>
      <div className="page-header" id="profile-header">
        <p className="section-eyebrow">My Account</p>
        <h1>Welcome, {user.name || user.email.split("@")[0]}</h1>
        <p>{user.email} · {user.role === "admin" ? "Administrator" : "Customer"}</p>
      </div>

      <section className="section section-sand" id="profile-orders">
        <div className="section-header">
          <div>
            <p className="section-eyebrow">Order History</p>
            <h2 className="section-title">Your Orders</h2>
          </div>
          {user.role === "admin" && <Link to="/admin" className="view-all">Admin Dashboard →</Link>}
        </div>

        {orders.length === 0 ? (
          <div className="cart-empty" style={{ padding: "40px 0" }}>
            <p>No orders yet. Start shopping!</p>
            <Link to="/men" className="btn-primary" style={{ display: "inline-block", marginTop: 16, textDecoration: "none" }}>Shop Now</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order: any) => (
              <div className="order-card" key={order.id}>
                <div className="order-card-header">
                  <span className="order-id">Order #{order.id}</span>
                  <span className="order-status" style={{ background: statusColor[order.status] || "#999" }}>
                    {order.status}
                  </span>
                </div>
                <div className="order-card-body">
                  <span>NPR {order.total?.toLocaleString()}</span>
                  <span>{order.shipping_city || "—"}</span>
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 32 }}>
          <Link to="/logout" style={{ color: "var(--color-red)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>
            Sign Out
          </Link>
        </div>
      </section>
    </>
  );
}
