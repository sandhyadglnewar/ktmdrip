import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { CartProvider } from "./lib/cart";
import { AuthProvider } from "./lib/auth.context";
import { getCurrentUser } from "./lib/auth.server";
import { Navbar } from "./components/layout/Navbar";
import { Footer } from "./components/layout/Footer";
import { CartDrawer } from "./components/layout/CartDrawer";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap",
  },
];

export async function loader({ request, context }: Route.LoaderArgs) {
  // Handle dev mode where context.cloudflare might be undefined
  const env = context?.cloudflare?.env || {};
  const user = await getCurrentUser(request, env as any);
  return { user };
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <AuthProvider user={loaderData.user}>
      <CartProvider>
        <Navbar />
        <Outlet />
        <Footer />
        <CartDrawer />
      </CartProvider>
    </AuthProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <AuthProvider user={null}>
      <CartProvider>
        <Navbar />
        <div style={{ padding: "80px 36px", textAlign: "center", background: "var(--color-light)", minHeight: "60vh" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 64, letterSpacing: 4, marginBottom: 16 }}>{message}</h1>
          <p style={{ color: "var(--color-mid)", fontSize: 14 }}>{details}</p>
          {stack && (
            <pre style={{ marginTop: 24, textAlign: "left", maxWidth: 600, margin: "24px auto", overflow: "auto", fontSize: 12, padding: 16, background: "#fff" }}>
              <code>{stack}</code>
            </pre>
          )}
        </div>
        <Footer />
        <CartDrawer />
      </CartProvider>
    </AuthProvider>
  );
}
