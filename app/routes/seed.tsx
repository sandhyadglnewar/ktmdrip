import type { Route } from "./+types/seed";
import schemaSql from "../../db/schema.sql?raw";
import seedSql from "../../db/seed.sql?raw";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Seed Database — KTMDrip" }];
}

function splitSqlStatements(sql: string) {
  return sql
    .replace(/\r\n/g, "\n")
    .replace(/^\s*--.*$/gm, "")
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

async function runSeed(env: Partial<Env>) {
  const db = env.DB;
  if (!db) {
    throw new Error("Cloudflare D1 database binding is not configured in local dev. Start the app with `npm run dev` so the Cloudflare Vite plugin provides bindings.");
  }

  const schemaStatements = splitSqlStatements(schemaSql);
  const seedStatements = splitSqlStatements(seedSql);

  const schemaResults = await db.batch(schemaStatements.map((statement) => db.prepare(statement)));
  const seedResults = await db.batch(seedStatements.map((statement) => db.prepare(statement)));

  return {
    schemaQueries: schemaStatements.length,
    seedQueries: seedStatements.length,
    durationMs: [...schemaResults, ...seedResults].reduce((sum, result) => sum + (result.meta.duration || 0), 0),
  };
}

export async function loader({ context }: Route.LoaderArgs) {
  const env = context?.cloudflare?.env || {};
  try {
    const result = await runSeed(env as Partial<Env>);
    return { ok: true, ...result };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to seed the database.",
    };
  }
}

export default function SeedRoute({ loaderData }: Route.ComponentProps) {
  const seeded = loaderData.ok && "schemaQueries" in loaderData;
  const schemaQueries = seeded ? loaderData.schemaQueries : 0;
  const seedQueries = seeded ? loaderData.seedQueries : 0;
  const durationMs = seeded ? loaderData.durationMs : 0;

  return (
    <div className="auth-page" id="seed-page">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        <p className="section-eyebrow" style={{ textAlign: "center", marginBottom: 8 }}>Developer Utility</p>
        <h1 className="auth-title">Database Seed</h1>
        {seeded ? (
          <div className="subscribed-msg" style={{ width: "100%", justifyContent: "center", marginBottom: 20 }}>
            ✓ Schema and seed completed
          </div>
        ) : (
          <div className="auth-error">{loaderData.error}</div>
        )}
        <div className="orders-list">
          <div className="order-card">
            <div className="order-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <span>Schema queries</span>
              <strong>{seeded ? schemaQueries : "—"}</strong>
              <span>Seed queries</span>
              <strong>{seeded ? seedQueries : "—"}</strong>
              <span>Total duration</span>
              <strong>{seeded ? `${durationMs} ms` : "—"}</strong>
            </div>
          </div>
        </div>
        <p style={{ marginTop: 18, color: "var(--color-mid)", fontSize: 13, lineHeight: 1.7, textAlign: "center" }}>
          Visiting <code>/seed</code> runs schema and product/admin seed directly against the Cloudflare D1 local database.
        </p>
        <div className="order-card" style={{ marginTop: 18 }}>
          <div className="order-card-header">
            <span className="order-id">Default Admin Login</span>
            <span className="order-status" style={{ background: "var(--color-teal)" }}>Seeded</span>
          </div>
          <div className="order-card-body" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <span>Email</span>
            <strong>admin@ktmdrip.com</strong>
            <span>Password</span>
            <strong>Admin@12345</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
