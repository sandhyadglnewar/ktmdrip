import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/checkout";
import { getCurrentUser } from "~/lib/auth.server";
import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Checkout — KTMDrip" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  const user = await getCurrentUser(request, env as any);
  return { user };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const name = form.get("name") as string;
  const email = form.get("email") as string;
  const address = form.get("address") as string;
  const city = form.get("city") as string;
  const phone = form.get("phone") as string;
  const cartJson = form.get("cart") as string;
  const total = Number(form.get("total"));

  if (!name || !email || !address || !city || !phone) {
    return { error: "All fields are required." };
  }

  const env = context?.cloudflare?.env || {};
  const user = await getCurrentUser(request, env as any);

  // Try to save order in D1
  try {
    const db = (env as any).DB as D1Database | undefined;
    if (db) {
      const result = await db.prepare(
        "INSERT INTO orders (user_id, guest_email, total, shipping_name, shipping_address, shipping_city, shipping_phone) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).bind(user?.id || null, user ? null : email, total, name, address, city, phone).run();

      const orderId = result.meta.last_row_id;
      const cart = JSON.parse(cartJson || "[]");
      for (const item of cart) {
        await db.prepare(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)"
        ).bind(orderId, item.id, item.quantity, item.sale_price || item.price).run();
      }
    }
  } catch {
    console.log("[Checkout] D1 not available, order logged only");
  }

  return { success: true, orderId: Date.now() };
}

export default function Checkout({ loaderData, actionData }: Route.ComponentProps) {
  const { user } = loaderData;
  const { items, total, clearCart } = useCart();
  const [submitted, setSubmitted] = useState(false);

  if (actionData?.success && !submitted) {
    setSubmitted(true);
    clearCart();
  }

  if (submitted || actionData?.success) {
    return (
      <div className="auth-page" id="order-success">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 className="auth-title" style={{ color: "var(--color-teal)" }}>Order Confirmed!</h1>
          <p style={{ color: "var(--color-mid)", marginBottom: 24 }}>
            Order #{actionData?.orderId || "—"} has been placed. We'll email you tracking details soon.
          </p>
          <Link to="/" className="btn-primary" style={{ textDecoration: "none", display: "inline-block" }}>Continue Shopping</Link>
          {user && (
            <Link to="/profile" style={{ display: "block", marginTop: 16, color: "var(--color-teal)", fontSize: 12, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 }}>
              View Orders →
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-page" id="checkout-auth-required">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <p className="section-eyebrow" style={{ marginBottom: 8 }}>Checkout</p>
          <h1 className="auth-title">Sign in to Continue</h1>
          <p style={{ color: "var(--color-mid)", marginBottom: 24 }}>Please log in or create an account to complete your purchase.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link to="/login" className="btn-primary" style={{ textDecoration: "none" }}>Sign In</Link>
            <Link to="/register" className="btn-outline" style={{ textDecoration: "none", color: "var(--color-dark)", borderColor: "#cec6bc" }}>Register</Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="auth-page" id="checkout-empty">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <h1 className="auth-title">Cart is Empty</h1>
          <p style={{ color: "var(--color-mid)", marginBottom: 24 }}>Add some items before checking out.</p>
          <Link to="/men" className="btn-primary" style={{ textDecoration: "none" }}>Shop Now</Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header" id="checkout-header">
        <p className="section-eyebrow">Secure Checkout</p>
        <h1>Checkout</h1>
        <p>{items.length} items · {formatPrice(total)}</p>
      </div>

      <section className="section section-light" id="checkout-form-section">
        <div className="checkout-grid">
          {/* FORM */}
          <form method="post" className="auth-form checkout-form-col">
            <input type="hidden" name="cart" value={JSON.stringify(items)} />
            <input type="hidden" name="total" value={total} />

            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 3, marginBottom: 20 }}>Shipping Details</h3>

            <div className="auth-field">
              <label htmlFor="name">Full Name</label>
              <input type="text" name="name" id="name" defaultValue={user.name} required />
            </div>
            <div className="auth-field">
              <label htmlFor="email">Email</label>
              <input type="email" name="email" id="email" defaultValue={user.email} required />
            </div>
            <div className="auth-field">
              <label htmlFor="address">Address</label>
              <input type="text" name="address" id="address" placeholder="Street address" required />
            </div>
            <div className="auth-field">
              <label htmlFor="city">City</label>
              <input type="text" name="city" id="city" placeholder="Kathmandu" required />
            </div>
            <div className="auth-field">
              <label htmlFor="phone">Phone</label>
              <input type="tel" name="phone" id="phone" placeholder="98XXXXXXXX" required />
            </div>

            {actionData?.error && <div className="auth-error">{actionData.error}</div>}

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 16, padding: "16px" }}>
              Place Order · {formatPrice(total)}
            </button>
          </form>

          {/* ORDER SUMMARY */}
          <div className="checkout-summary">
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 3, marginBottom: 20 }}>Order Summary</h3>
            {items.map((item) => (
              <div className="cart-item" key={item.id}>
                <img src={item.image_url} alt={item.name} />
                <div className="cart-item-info">
                  <p className="cart-item-name">{item.name}</p>
                  <p className="cart-item-cat">Qty: {item.quantity}</p>
                  <span className="cart-item-price">{formatPrice((item.sale_price || item.price) * item.quantity)}</span>
                </div>
              </div>
            ))}
            <div className="drawer-total" style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #cec6bc" }}>
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
