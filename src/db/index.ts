import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

/**
 * IMPORTANT: this module must never throw at import time.
 *
 * `next build` imports the route graph while "Collecting page data", and on
 * Render there is no `.env` file (it is gitignored), so `DATABASE_URL` can be
 * undefined during the build. Throwing here fails the deploy even though the
 * app would work fine at runtime. The connection is opened lazily by `pg` on
 * the first query instead.
 */
const connectionString = process.env.DATABASE_URL;

// Render's managed Postgres requires TLS; a local socket does not. Decide by
// host rather than by NODE_ENV so production builds against localhost work.
function needsSsl(url: string | undefined): boolean {
  if (!url) return false;
  return !/(localhost|127\.0\.0\.1|\[::1\])/.test(url);
}

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

/**
 * Explicit, friendly check for runtime code paths that want a clear error
 * message instead of a low-level connection failure.
 */
export function assertDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL no está definida. Configúrala en Render → Environment.",
    );
  }
  return url;
}
