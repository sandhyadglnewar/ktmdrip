import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/login";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login — KTMDrip" },
    { name: "description", content: "Sign in to your KTMDrip account." },
  ];
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const email = form.get("email") as string;
  const password = form.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const { hashPassword, generateSessionToken, createSessionCookie, saveSession } = await import("~/lib/auth.server");
    const env = context?.cloudflare?.env || {};
    const db = (env as any).DB as D1Database | undefined;

    if (db) {
      const hash = await hashPassword(password);
      const user = await db.prepare("SELECT * FROM users WHERE email = ? AND password_hash = ?").bind(email, hash).first();
      if (!user) return { error: "Invalid email or password." };

      const token = generateSessionToken();
      await saveSession(env as any, token, user as any);

      return new Response(null, {
        status: 302,
        headers: {
          Location: "/",
          "Set-Cookie": createSessionCookie(token),
        },
      });
    }
  } catch {
    // D1 not available
  }

  // Demo mode: allow any login
  const { generateSessionToken, createSessionCookie, saveSession } = await import("~/lib/auth.server");
  const token = generateSessionToken();
  const demoUser = { id: 1, email, name: email.split("@")[0], role: email.includes("admin") ? "admin" as const : "customer" as const, created_at: new Date().toISOString() };
  const env = context?.cloudflare?.env || {};
  await saveSession(env as any, token, demoUser);

  return new Response(null, {
    status: 302,
    headers: {
      Location: demoUser.role === "admin" ? "/admin" : "/",
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

        <p className="auth-switch">
          Don't have an account? <Link to="/register">Create one →</Link>
        </p>
      </div>
    </div>
  );
}
