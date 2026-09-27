import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __tampervaultPool?: Pool;
};

export const pool =
  globalForDb.__tampervaultPool ??
  new Pool({
    connectionString,
    max: 10,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__tampervaultPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
