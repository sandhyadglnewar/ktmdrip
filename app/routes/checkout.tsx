import { useEffect, useRef, useState } from "react";
import { Link, useSubmit } from "react-router";
import type { Route } from "./+types/checkout";
import { requireUser } from "~/lib/auth.server";
import { useCart } from "~/lib/cart";
import { formatPrice } from "~/lib/utils";
import { createOrder, getCheckoutQuote } from "~/lib/catalog.server";
import {
  getStripePublishableKey,
  hasStripeConfig,
  retrieveStripePaymentIntent,
} from "~/lib/stripe.server";

declare global {
  interface StripeCardElement {
    mount: (selector: string | HTMLElement) => void;
    destroy: () => void;
  }

  interface StripeElementsInstance {
    create: (type: "card", options?: Record<string, unknown>) => StripeCardElement;
  }

  interface StripePaymentIntentResult {
    paymentIntent?: {
      id: string;
      status: string;
    };
    error?: {
      message?: string;
    };
  }

  interface StripeInstance {
    elements: () => StripeElementsInstance;
    confirmCardPayment: (
      clientSecret: string,
      data: {
        payment_method: {
          card: StripeCardElement;
          billing_details: {
            name: string;
            email: string;
            phone: string;
            address: {
              line1: string;
              city: string;
            };
          };
        };
      }
    ) => Promise<StripePaymentIntentResult>;
  }

  interface Window {
    Stripe?: (key: string) => StripeInstance;
  }
}

export function meta({}: Route.MetaArgs) {
  return [{ title: "Checkout — KTMDrip" }];
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  const user = await requireUser(request, env as any);
  return {
    user,
    stripePublicKey: getStripePublishableKey(env as any),
    stripeEnabled: hasStripeConfig(env as any),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const address = String(form.get("address") || "").trim();
  const city = String(form.get("city") || "").trim();
  const phone = String(form.get("phone") || "").trim();
  const cartJson = String(form.get("cart") || "[]");
  const paymentIntentId = String(form.get("payment_intent_id") || "").trim();

  if (!name || !email || !address || !city || !phone) {
    return { error: "All fields are required." };
  }
  if (!paymentIntentId) {
    return { error: "Payment confirmation is required." };
  }

  const env = context?.cloudflare?.env || {};
  try {
    const user = await requireUser(request, env as any);
    const cart = JSON.parse(cartJson) as Array<{ id: number; quantity: number }>;
    const quote = await getCheckoutQuote(env as Partial<Env>, cart);
    const intent = await retrieveStripePaymentIntent(env as any, paymentIntentId);

    if (intent.amount !== quote.total * 100) {
      return { error: "Payment amount does not match the current cart." };
    }
    if (intent.currency.toLowerCase() !== "npr") {
      return { error: "Unexpected payment currency returned by Stripe." };
    }

    if (intent.status !== "succeeded" && intent.status !== "processing") {
      return { error: `Stripe payment is not complete. Current status: ${intent.status}.` };
    }

    const payment = {
      paymentIntentId: intent.id,
      paymentMethod: intent.payment_method_types?.join(", ") || "card",
      paymentStatus: intent.status === "succeeded" ? ("paid" as const) : ("action_required" as const),
      orderStatus: intent.status === "succeeded" ? ("confirmed" as const) : ("pending" as const),
      message:
        intent.status === "succeeded"
          ? "Payment authorized through Stripe."
          : "Payment is processing in Stripe. The order stays pending until it settles.",
      rawStatus: intent.status,
    };

    const order = await createOrder(env as Partial<Env>, {
      user,
      items: cart.map((item) => ({ id: Number(item.id), quantity: Number(item.quantity) })),
      shipping: { name, email, address, city, phone },
      payment,
    });

    return {
      success: true,
      orderId: order.orderId,
      total: order.total,
      paymentStatus: payment.paymentStatus,
      paymentMessage: payment.message,
      orderStatus: payment.orderStatus,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to place order.";
    return { error: message };
  }
}

export default function Checkout({ loaderData, actionData }: Route.ComponentProps) {
  const { user, stripePublicKey, stripeEnabled } = loaderData;
  const { items, total, clearCart } = useCart();
  const submit = useSubmit();
  const [submitted, setSubmitted] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const cardContainerRef = useRef<HTMLDivElement | null>(null);
  const stripeRef = useRef<StripeInstance | null>(null);
  const cardRef = useRef<StripeCardElement | null>(null);
  const canRenderPaymentForm = items.length > 0 && !submitted && !actionData?.success;

  useEffect(() => {
    if (actionData?.success && !submitted) {
      setSubmitted(true);
      clearCart();
    }
  }, [actionData?.success, clearCart, submitted]);

  useEffect(() => {
    if (!stripePublicKey || cardRef.current || !canRenderPaymentForm) return;

    let cancelled = false;
    const mountStripe = () => {
      if (cancelled || !window.Stripe || cardRef.current || !cardContainerRef.current) return false;

      const stripe = window.Stripe(stripePublicKey);
      stripeRef.current = stripe;
      const elements = stripe.elements();
      const card = elements.create("card", {
        style: {
          base: {
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: "14px",
            color: "#1a1a1a",
            "::placeholder": { color: "#8d8d8d" },
          },
        },
      });
      card.mount(cardContainerRef.current);
      cardRef.current = card;
      setStripeReady(true);
      return true;
    };

    if (mountStripe()) {
      return () => {
        cancelled = true;
        cardRef.current?.destroy();
        cardRef.current = null;
      };
    }

    const interval = window.setInterval(() => {
      if (mountStripe()) {
        window.clearInterval(interval);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      cardRef.current?.destroy();
      cardRef.current = null;
      setStripeReady(false);
    };
  }, [canRenderPaymentForm, stripePublicKey]);

  useEffect(() => {
    if (actionData?.error) {
      setProcessingPayment(false);
    }
  }, [actionData]);

  async function handleCheckoutSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);

    const form = formRef.current;
    const stripe = stripeRef.current;
    const card = cardRef.current;

    if (!form || !form.reportValidity()) {
      return;
    }
    if (!stripe || !card) {
      setClientError("Stripe card form is still loading.");
      return;
    }

    setProcessingPayment(true);
    try {
      const formData = new FormData(form);
      const cart = JSON.parse(String(formData.get("cart") || "[]"));
      const email = String(formData.get("email") || "").trim();

      const paymentIntentResponse = await fetch("/api/payment-intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cart, email }),
      });

      const paymentIntentPayload = (await paymentIntentResponse.json()) as {
        clientSecret?: string;
        paymentIntentId?: string;
        error?: string;
      };

      if (!paymentIntentResponse.ok || !paymentIntentPayload.clientSecret) {
        throw new Error(paymentIntentPayload.error || "Unable to start Stripe payment.");
      }

      const result = await stripe.confirmCardPayment(paymentIntentPayload.clientSecret, {
        payment_method: {
          card,
          billing_details: {
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            phone: String(formData.get("phone") || ""),
            address: {
              line1: String(formData.get("address") || ""),
              city: String(formData.get("city") || ""),
            },
          },
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Stripe could not confirm the card payment.");
      }

      if (!result.paymentIntent?.id) {
        throw new Error("Stripe did not return a payment confirmation.");
      }

      formData.set("payment_intent_id", result.paymentIntent.id);
      submit(formData, { method: "post" });
    } catch (error) {
      setClientError(error instanceof Error ? error.message : "Unable to complete payment.");
      setProcessingPayment(false);
    }
  }

  if (submitted || actionData?.success) {
    return (
      <div className="auth-page" id="order-success">
        <div className="auth-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
          <h1 className="auth-title" style={{ color: "var(--color-teal)" }}>
            {actionData?.paymentStatus === "action_required" ? "Order Pending Payment" : "Order Confirmed!"}
          </h1>
          <p style={{ color: "var(--color-mid)", marginBottom: 24 }}>
            Order #{actionData?.orderId || "—"} has been placed. {actionData?.paymentMessage || "We'll email you tracking details soon."}
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
          <form method="post" className="auth-form checkout-form-col" ref={formRef} onSubmit={handleCheckoutSubmit}>
            <input type="hidden" name="cart" value={JSON.stringify(items)} />
            <input type="hidden" name="payment_intent_id" value="" />
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

            <div className="payment-panel">
              <div className="payment-panel-head">
                <div>
                  <p className="section-eyebrow" style={{ marginBottom: 6 }}>Payment</p>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: 3 }}>Stripe Card Payment</h3>
                </div>
                <span className={`payment-chip ${stripeEnabled && stripeReady ? "active" : ""}`}>
                  {stripeEnabled ? (stripeReady ? "Ready" : "Loading") : "Missing Keys"}
                </span>
              </div>
              <p className="payment-note">
                This now uses the real Stripe PaymentIntent API. With your current test keys, use Stripe test cards like <strong>4242 4242 4242 4242</strong>, any future date, and any CVC.
              </p>
              <div className="payment-card-shell">
                <label htmlFor="card-element" className="payment-card-label">Card Details</label>
                <div ref={cardContainerRef} className="payment-card-element" />
                <p className="payment-hint">
                  Test cards: <code>4242 4242 4242 4242</code> for success, <code>4000 0025 0000 3155</code> for 3D Secure, or <code>4000 0000 0000 9995</code> for a decline.
                </p>
              </div>
            </div>

            {actionData?.error && <div className="auth-error">{actionData.error}</div>}
            {clientError && <div className="auth-error">{clientError}</div>}

            <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 16, padding: "16px" }} disabled={processingPayment || !stripeEnabled}>
              {processingPayment ? "Processing Payment..." : `Pay ${formatPrice(total)}`}
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
            <div className="summary-note">
              Stripe public key: {stripePublicKey ? `${stripePublicKey.slice(0, 12)}...` : "not configured"}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
