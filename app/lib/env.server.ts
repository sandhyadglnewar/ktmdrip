export function getRequiredCloudflareEnv(context: { cloudflare?: { env?: Partial<Env> } } | undefined): Env {
  const env = context?.cloudflare?.env;

  if (!env?.DB) {
    throw new Error(
      "Cloudflare D1 binding is required. Start local development with `npm run dev` and ensure the `DB` binding exists in `wrangler.jsonc`."
    );
  }

  return env as Env;
}
