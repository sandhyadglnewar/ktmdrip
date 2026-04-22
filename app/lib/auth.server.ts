// ═══════════════════════════════════════════
// KTMDrip — Auth Utilities (Server-side)
// Simple cookie-based auth with D1
// ═══════════════════════════════════════════

import type { User } from "./types";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

async function ensureSessionsTable(db: D1Database): Promise<void> {
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)"),
  ]);
}

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
export function createSessionCookie(token: string, maxAge = SESSION_TTL_SECONDS): string {
  return `ktmdrip_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

/** Create a cookie that clears the session */
export function clearSessionCookie(): string {
  return `ktmdrip_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

/** Get current user from session (using D1) */
export async function getCurrentUser(
  request: Request,
  env: { DB?: D1Database }
): Promise<User | null> {
  const token = getSessionToken(request);
  if (!token) return null;

  if (!env.DB) return null;

  try {
    await ensureSessionsTable(env.DB);

    const session = await env.DB
      .prepare(
        `SELECT u.id, u.email, u.name, u.role, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = ? AND s.expires_at > ?
         LIMIT 1`
      )
      .bind(token, Date.now())
      .first<User>();

    if (session) {
      return session;
    }

    await env.DB.prepare("DELETE FROM sessions WHERE token = ? OR expires_at <= ?").bind(token, Date.now()).run();
  } catch {
    // Ignore auth storage lookup failures and treat the request as logged out.
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

/** Save session to D1 */
export async function saveSession(
  env: { DB?: D1Database },
  token: string,
  user: User
): Promise<void> {
  if (!env.DB) {
    return;
  }

  await ensureSessionsTable(env.DB);

  const expiresAt = Date.now() + SESSION_TTL_MS;
  await env.DB
    .prepare("INSERT OR REPLACE INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, user.id, expiresAt)
    .run();
}

/** Delete session from D1 */
export async function deleteSession(
  env: { DB?: D1Database },
  token: string
): Promise<void> {
  if (!env.DB) return;

  await ensureSessionsTable(env.DB);
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
}
