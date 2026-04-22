type StripeEnv = Partial<
  Pick<Env, "SITE_NAME"> & {
    STRIPE_SECRET: string;
    STRIPE_PUBLIC: string;
  }
>;

export interface StripeIntentPayload {
  id: string;
  client_secret: string | null;
  status: string;
  amount: number;
  currency: string;
  payment_method_types?: string[];
}

function getStripeSecret(env: StripeEnv): string | null {
  return (env as { STRIPE_SECRET?: string }).STRIPE_SECRET || null;
}

export function getStripePublishableKey(env: StripeEnv): string | null {
  return (env as { STRIPE_PUBLIC?: string }).STRIPE_PUBLIC || null;
}

export function hasStripeConfig(env: StripeEnv) {
  return Boolean(getStripeSecret(env) && getStripePublishableKey(env));
}

async function readStripeResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & {
    error?: {
      message?: string;
    };
  };

  if (!response.ok) {
    throw new Error(payload.error?.message || "Stripe request failed.");
  }

  return payload;
}

export async function createStripePaymentIntent(
  env: StripeEnv,
  input: {
    amount: number;
    currency?: string;
    email: string;
    orderReference: string;
  }
): Promise<StripeIntentPayload> {
  const secret = getStripeSecret(env);
  if (!secret) {
    throw new Error("Stripe secret key is missing.");
  }

  const form = new URLSearchParams();
  form.set("amount", String(input.amount));
  form.set("currency", input.currency || "npr");
  form.append("payment_method_types[]", "card");
  form.set("receipt_email", input.email);
  form.set("description", `${env.SITE_NAME || "KTMDrip"} checkout`);
  form.set("metadata[order_reference]", input.orderReference);

  const response = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  return readStripeResponse<StripeIntentPayload>(response);
}

export async function retrieveStripePaymentIntent(
  env: StripeEnv,
  paymentIntentId: string
): Promise<StripeIntentPayload> {
  const secret = getStripeSecret(env);
  if (!secret) {
    throw new Error("Stripe secret key is missing.");
  }

  const response = await fetch(`https://api.stripe.com/v1/payment_intents/${paymentIntentId}`, {
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  });

  return readStripeResponse<StripeIntentPayload>(response);
}
