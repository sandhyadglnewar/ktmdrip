import type { Route } from "./+types/logout";

export async function loader({ request, context }: Route.LoaderArgs) {
  const { getSessionData, clearSessionCookie, deleteSession } = await import("~/lib/auth.server");
  const { token } = getSessionData(request);
  if (token) {
    const env = context?.cloudflare?.env || {};
    await deleteSession(env as any, token);
  }
  const [sessionCookie, userCookie] = clearSessionCookie();
  return new Response(null, {
    status: 302,
    headers: { 
      Location: "/", 
      "Set-Cookie": [sessionCookie, userCookie]
    },
  });
}
