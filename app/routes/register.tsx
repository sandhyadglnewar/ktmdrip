import { useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/register";
import { createSessionCookie, generateSessionToken, hashPassword, saveSession } from "~/lib/auth.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Register — KTMDrip" },
    { name: "description", content: "Create your KTMDrip account." },
  ];
}

export async function action({ request, context }: Route.ActionArgs) {
  const form = await request.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = form.get("password") as string;

  if (!name || !email || !password) {
    return { error: "All fields are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const env = context?.cloudflare?.env || {};
  const db = (env as any).DB as D1Database | undefined;
  if (!db) {
    return { error: "Cloudflare D1 is not available in this dev session. Start the app with the Cloudflare Vite plugin and run /seed." };
  }

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return { error: "An account with this email already exists." };

  const hash = await hashPassword(password);
  const result = await db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .bind(name, email, hash)
    .run();

  const token = generateSessionToken();
  const user = {
    id: Number(result.meta.last_row_id),
    email,
    name,
    role: "customer" as const,
    created_at: new Date().toISOString(),
  };
  await saveSession(env as any, token, user);

  return new Response(null, {
    status: 302,
    headers: { Location: "/", "Set-Cookie": createSessionCookie(token) },
  });
}

export default function Register({ actionData }: Route.ComponentProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-page" id="register-page">
      <div className="auth-card">
        <p className="section-eyebrow" style={{ textAlign: "center", marginBottom: 8 }}>Join the Drip</p>
        <h1 className="auth-title">Create Account</h1>

        {actionData?.error && <div className="auth-error">{actionData.error}</div>}

        <form method="post" className="auth-form">
          <div className="auth-field">
            <label htmlFor="name">Full Name</label>
            <input type="text" name="name" id="name" placeholder="Your name" required />
          </div>
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
              placeholder="Min 6 characters"
              required
              minLength={6}
            />
            <button type="button" className="auth-toggle-pw" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 8 }}>Create Account</button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in →</Link>
        </p>
      </div>
    </div>
  );
}
