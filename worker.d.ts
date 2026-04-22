declare namespace Cloudflare {
	interface GlobalProps {
		mainModule: typeof import("./workers/app");
	}
	interface Env {
		KV: KVNamespace;
		DB: D1Database;
		SITE_NAME: "KTMDrip";
		SITE_URL: "https://ktmdrip.com";
	}
}
interface Env extends Cloudflare.Env {}
type StringifyValues<EnvType extends Record<string, unknown>> = {
	[Binding in keyof EnvType]: EnvType[Binding] extends string ? EnvType[Binding] : string;
};
declare namespace NodeJS {
	interface ProcessEnv extends StringifyValues<Pick<Cloudflare.Env, "SITE_NAME" | "SITE_URL">> {}
}
