import type { Route } from "./+types/logout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSessionToken, clearSessionCookie, deleteSession } = await import("~/lib/auth.server");
  const token = getSessionToken(request);
  if (token) {
    const env = context?.cloudflare?.env || {};
    await deleteSession(env as any, token);
  }
  return new Response(null, {
    status: 302,
    headers: { Location: "/", "Set-Cookie": clearSessionCookie() },
  });
}
