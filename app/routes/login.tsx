import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/login";
import { createSessionCookie, generateSessionToken, saveSession, verifyPassword } from "~/lib/auth.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login — KTMDrip" },
    { name: "description", content: "Sign in to your KTMDrip account." },
  ];
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = form.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const env = context?.cloudflare?.env || {};
  const db = (env as any).DB as D1Database | undefined;
  if (!db) {
    return { error: "Cloudflare D1 is not available in this dev session. Start the app with the Cloudflare Vite plugin and run /seed." };
  }

  const record = await db
    .prepare("SELECT id, email, name, role, created_at, password_hash FROM users WHERE email = ? LIMIT 1")
    .bind(email)
    .first<{ id: number; email: string; name: string; role: "customer" | "admin"; created_at: string; password_hash: string }>();

  if (!record || !(await verifyPassword(password, record.password_hash))) {
    return { error: "Invalid email or password." };
  }

  const token = generateSessionToken();
  const user = {
    id: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    created_at: record.created_at,
  };
  await saveSession(env as any, token, user);

  return new Response(null, {
    status: 302,
    headers: {
      Location: user.role === "admin" ? "/admin" : "/",
      "Set-Cookie": createSessionCookie(token),
    },
  });
}

export default function Login({ actionData }: Route.ComponentProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-page" id="login-page">
      <div className="auth-card">
        <p className="section-eyebrow" style={{ textAlign: "center", marginBottom: 8 }}>Welcome Back</p>
        <h1 className="auth-title">Sign In</h1>

        {actionData?.error && <div className="auth-error">{actionData.error}</div>}

        <form method="post" className="auth-form">
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input type="email" name="email" id="email" placeholder="you@email.com" required />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              id="password"
              placeholder="••••••••"
              required
            />
            <button type="button" className="auth-toggle-pw" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }}>Sign In</button>
        </form>

        <div className="order-card" style={{ marginTop: 18 }}>
          <div className="order-card-header">
            <span className="order-id">Admin Access</span>
            <span className="order-status" style={{ background: "var(--color-teal)" }}>Same Login</span>
          </div>
          <div className="order-card-body" style={{ display: "block" }}>
            <p style={{ marginBottom: 6 }}>Use the normal sign-in form for both customer and admin accounts.</p>
            <p><strong>Admin email:</strong> admin@ktmdrip.com</p>
            <p><strong>Password:</strong> Admin@12345</p>
            <p style={{ marginTop: 6 }}>Run <code>/seed</code> first if the admin account does not exist yet.</p>
          </div>
        </div>

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one →</Link>
        </p>
      </div>
    </div>
  );
}
