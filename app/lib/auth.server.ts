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

/** Get current user from session (using KV) */
export async function getCurrentUser(
  request: Request,
  env: { KV?: KVNamespace; DB?: D1Database }
): Promise<User | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  try {
    // Look up session in KV
    if (env.KV) {
      const sessionData = await env.KV.get(`session:${token}`);
      if (sessionData) {
        return JSON.parse(sessionData) as User;
      }
    }
  } catch {
    // KV not available
  }
  return null;
}

/** Save session to KV */
export async function saveSession(
  env: { KV?: KVNamespace },
  token: string,
  user: User
): Promise<void> {
  try {
    if (env.KV) {
      await env.KV.put(
        `session:${token}`,
        JSON.stringify(user),
        { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
      );
    }
  } catch {
    console.log("[Auth] KV not available, session not persisted");
  }
}

/** Delete session from KV */
export async function deleteSession(
  env: { KV?: KVNamespace },
  token: string
): Promise<void> {
  try {
    if (env.KV) {
      await env.KV.delete(`session:${token}`);
    }
  } catch {
    // ignore
  }
}
