import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/appspecific/com.chrome.devtools.json") {
      return new Response(null, { status: 204 });
    }

    if (!env.DB) {
      return new Response(
        "Cloudflare D1 binding `DB` is required. Start local development with `npm run dev` and verify `wrangler.jsonc` includes the D1 binding.",
        { status: 500 }
      );
    }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
