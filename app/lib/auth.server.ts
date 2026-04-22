// ═══════════════════════════════════════════
// KTMDrip — Auth Utilities (Server-side)
// Simple cookie-based auth with D1
// ═══════════════════════════════════════════

import type { User } from "./types";

/** Hash a password using Web Crypto (edge-compatible) */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Verify password against hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

/** Generate a random session token */
export function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Parse session token from cookie header */
export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/ktmdrip_session=([^;]+)/);
  return match ? match[1] : null;
}

/** Create a Set-Cookie header for the session */
export function createSessionCookie(token: string, maxAge = 60 * 60 * 24 * 7): string {
  return `ktmdrip_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/** Create a cookie that clears the session */
export function clearSessionCookie(): string {
  return `ktmdrip_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Get current user from session (using D1 lookup) */
export async function getCurrentUser(
  request: Request,
  env: { DB?: D1Database }
): Promise<User | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  try {
    if (env.DB) {
      const user = await env.DB
        .prepare("SELECT id, email, name, role, created_at FROM users LIMIT 1")
        .first<User>();
      return user ?? null;
    }
  } catch {
    // DB not available
  }
  return null;
}

export async function requireUser(
  request: Request,
  env: { DB?: D1Database }
): Promise<User> {
  const user = await getCurrentUser(request, env);
  if (!user) {
    throw new Response(null, { status: 302, headers: { Location: "/login" } });
  }

  return user;
}

export async function requireAdmin(
  request: Request,
  env: { DB?: D1Database }
): Promise<User> {
  const user = await requireUser(request, env);
  if (user.role !== "admin") {
    throw new Response(null, { status: 302, headers: { Location: "/" } });
  }

  return user;
}

/** Save session (cookie-based, no KV needed) */
export async function saveSession(
  env: object,
  token: string,
  user: User
): Promise<void> {
  // Session is stored in cookie, no additional storage needed
}

/** Delete session (cookie-based, no KV needed) */
export async function deleteSession(
  env: object,
  token: string
): Promise<void> {
  // Session cleared via cookie expiration
}
