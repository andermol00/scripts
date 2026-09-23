import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

/**
 * Never throw at import time: Next imports route modules during `next build`,
 * where DATABASE_URL might intentionally be unavailable. Queries are lazy.
 */
const connectionString = process.env.DATABASE_URL;

function poolConfig(url: string | undefined): PoolConfig {
  const config: PoolConfig = {
    connectionString: url,
    max: 10,
    connectionTimeoutMillis: 8_000,
    idleTimeoutMillis: 30_000,
    // Prevent a broken query from occupying a connection forever.
    statement_timeout: 15_000,
    query_timeout: 18_000,
    application_name: "tampervault",
  };

  if (!url) return config;

  try {
    const parsed = new URL(url);
    const sslMode = parsed.searchParams.get("sslmode")?.toLowerCase();
    const local = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    const renderExternal = parsed.hostname.endsWith(".render.com");

    if (sslMode === "disable" || local) {
      config.ssl = false;
    } else if (
      sslMode === "require" ||
      sslMode === "verify-ca" ||
      sslMode === "verify-full" ||
      renderExternal
    ) {
      // Render's external URL requires TLS; internal TLS uses self-signed certs.
      config.ssl = { rejectUnauthorized: false };
    }
    // For a Render internal URL without sslmode, leave SSL unspecified: Render
    // supports plain private-network connections and this avoids TLS mismatch.
  } catch {
    // A malformed URL will fail quickly on the first query with a useful pg
    // error; it still must not break `next build` at module import time.
  }

  return config;
}

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ?? new Pool(poolConfig(connectionString));

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

export function assertDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL no está definida. Configúrala en Render → Environment.",
    );
  }
  return url;
}
