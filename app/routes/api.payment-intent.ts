import type { Route } from "./+types/api.payment-intent";
import { requireUser } from "~/lib/auth.server";
import { getCheckoutQuote } from "~/lib/catalog.server";
import { createStripePaymentIntent, hasStripeConfig } from "~/lib/stripe.server";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed." }, { status: 405 });
  }

  const env = context?.cloudflare?.env || {};
  await requireUser(request, env as any);

  if (!hasStripeConfig(env as any)) {
    return Response.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const body = (await request.json()) as {
    cart?: Array<{ id: number; quantity: number }>;
    email?: string;
  };

  const cart = Array.isArray(body.cart) ? body.cart : [];
  const email = String(body.email || "").trim().toLowerCase();

  if (!email) {
    return Response.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const quote = await getCheckoutQuote(env as Partial<Env>, cart);
    const paymentIntent = await createStripePaymentIntent(env as any, {
      amount: quote.total * 100,
      currency: "npr",
      email,
      orderReference: `ktmdrip-${Date.now()}`,
    });

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: quote.total,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to create payment intent." },
      { status: 400 }
    );
  }
}
