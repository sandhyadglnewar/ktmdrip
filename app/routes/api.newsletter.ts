// ═══════════════════════════════════════════
// KTMDrip — Newsletter API Endpoint
// Stores subscriber emails in D1 (with fallback)
// ═══════════════════════════════════════════

import type { Route } from "./+types/api.newsletter";

export async function action({ request, context }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim();

    if (!email || !email.includes("@")) {
      return Response.json({ error: "Invalid email" }, { status: 400 });
    }

    // Try D1 database if available
    try {
      const env = context?.cloudflare?.env || {};
      const db = (env as any).DB;
      if (db) {
        await db
          .prepare("INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)")
          .bind(email)
          .run();
      } else {
        throw new Error("Cloudflare D1 is not available for newsletter subscriptions.");
      }
    } catch {
      return Response.json({ error: "Cloudflare D1 is not available for newsletter subscriptions." }, { status: 500 });
    }

    // Also try KV for fast lookup / caching
    try {
      const env = context?.cloudflare?.env || {};
      const kv = (env as any).KV;
      if (kv) {
        await kv.put(`newsletter:${email}`, JSON.stringify({ email, subscribedAt: new Date().toISOString() }));
      }
    } catch {
      // KV not configured
    }

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
