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

/** Parse session data from cookie (token + user ID) */
export function getSessionData(request: Request): { token: string | null; userId: string | null } {
  const cookie = request.headers.get("Cookie") || "";
  const tokenMatch = cookie.match(/ktmdrip_session=([^;]+)/);
  const userIdMatch = cookie.match(/ktmdrip_user=([^;]+)/);
  return {
    token: tokenMatch ? tokenMatch[1] : null,
    userId: userIdMatch ? userIdMatch[1] : null,
  };
}

/** Create session cookies with token + user ID */
export function createSessionCookie(token: string, userId: number, maxAge = 60 * 60 * 24 * 7): [string, string] {
  const sessionCookie = `ktmdrip_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  const userCookie = `ktmdrip_user=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
  return [sessionCookie, userCookie];
}

/** Create cookies that clear the session */
export function clearSessionCookie(): [string, string] {
  return [
    `ktmdrip_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    `ktmdrip_user=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  ];
}

/** Get current user from session (using user ID stored in cookie) */
export async function getCurrentUser(
  request: Request,
  env: { DB?: D1Database }
): Promise<User | null> {
  const { userId } = getSessionData(request);
  if (!userId) return null;

  try {
    if (env.DB) {
      const user = await env.DB
        .prepare("SELECT id, email, name, role, created_at FROM users WHERE id = ? LIMIT 1")
        .bind(Number(userId))
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
