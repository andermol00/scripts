import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  __tampervaultPool?: Pool;
  __tampervaultDb?: Database;
};

/**
 * El pool y el cliente se crean de forma perezosa: así el módulo se puede
 * importar durante el build de Vercel (recogida de páginas) sin que explote
 * por falta de DATABASE_URL. El error solo aparece al usarlo de verdad.
 */
function getClient(): { pool: Pool; db: Database } {
  if (globalForDb.__tampervaultDb && globalForDb.__tampervaultPool) {
    return { pool: globalForDb.__tampervaultPool, db: globalForDb.__tampervaultDb };
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const pool =
    globalForDb.__tampervaultPool ??
    new Pool({
      connectionString,
      max: 10,
      ssl: connectionString.includes("sslmode=require")
        ? { rejectUnauthorized: false }
        : undefined,
    });

  const db = drizzle(pool, { schema });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__tampervaultPool = pool;
    globalForDb.__tampervaultDb = db;
  }

  return { pool, db };
}

/**
 * Proxy compatible con la API de Drizzle: `db.select()`, `db.insert()`,
 * `db.query...` siguen funcionando, pero nada se conecta hasta la primera
 * consulta real.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const client = getClient().db as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? (value as () => unknown).bind(client) : value;
  },
  has(_target, prop) {
    return Reflect.has(getClient().db as unknown as object, prop);
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, prop) {
    const real = getClient().pool as unknown as Record<string | symbol, unknown>;
    const value = Reflect.get(real, prop);
    return typeof value === "function" ? (value as () => unknown).bind(real) : value;
  },
});

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
