/**
 * Inicializa el esquema de la base de datos de forma idempotente.
 *
 * Se ejecuta durante el build (`npm run build:deploy`) para que Render cree
 * las tablas automáticamente en una base de datos recién provisionada, sin
 * necesidad de pasos manuales ni prompts interactivos de drizzle-kit.
 *
 * Uso: node scripts/init-db.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = resolve(__dirname, "..", ".env");
  if (existsSync(envPath)) {
    const raw = readFileSync(envPath, "utf-8");
    const match = raw.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("DATABASE_URL no está definida");
}

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
     "id" serial PRIMARY KEY,
     "username" text NOT NULL UNIQUE,
     "password_hash" text NOT NULL,
     "totp_secret" text,
     "created_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     "id" serial PRIMARY KEY,
     "token_hash" text NOT NULL UNIQUE,
     "user_id" integer NOT NULL REFERENCES users("id") ON DELETE CASCADE,
     "user_agent" text,
     "ip" text,
     "expires_at" timestamp NOT NULL,
     "created_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON sessions ("token_hash")`,
  `CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON sessions ("user_id")`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
     "id" serial PRIMARY KEY,
     "ip" text NOT NULL,
     "username" text,
     "success" boolean NOT NULL DEFAULT false,
     "created_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "login_attempts_ip_idx" ON login_attempts ("ip")`,
  `CREATE TABLE IF NOT EXISTS scripts (
     "id" serial PRIMARY KEY,
     "user_id" integer NOT NULL REFERENCES users("id") ON DELETE CASCADE,
     "name" text NOT NULL,
     "namespace" text NOT NULL DEFAULT 'http://tampermonkey.net/',
     "version" text NOT NULL DEFAULT '1.0.0',
     "description" text NOT NULL DEFAULT '',
     "author" text NOT NULL DEFAULT '',
     "matches" text[] NOT NULL DEFAULT '{}',
     "grants" text[] NOT NULL DEFAULT '{}',
     "run_at" text NOT NULL DEFAULT 'document-idle',
     "update_url" text NOT NULL DEFAULT '',
     "download_url" text NOT NULL DEFAULT '',
     "code" text NOT NULL DEFAULT '',
     "obfuscate_by_default" boolean NOT NULL DEFAULT false,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now()
   )`,
  // Migración segura para bases de datos ya existentes (columnas viejas).
  `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS "update_url" text NOT NULL DEFAULT ''`,
  `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS "download_url" text NOT NULL DEFAULT ''`,
  `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS "obfuscate_by_default" boolean NOT NULL DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS "scripts_user_idx" ON scripts ("user_id")`,
];

/**
 * Migraciones para bases de datos que ya existían con el esquema anterior
 * (matches/grants como texto JSON y booleano `obfuscate`). Son idempotentes.
 */
const MIGRATIONS = [
  // Postgres no permite subconsultas en ALTER COLUMN ... USING, así que se
  // crea una columna temporal, se copian los datos y se renombra.
  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'scripts' AND column_name = 'matches'
         AND data_type = 'text'
     ) THEN
       ALTER TABLE scripts ADD COLUMN "matches_new" text[] NOT NULL DEFAULT '{}';
       UPDATE scripts SET "matches_new" = CASE
         WHEN matches IS NULL OR matches !~ '^\\s*\\[' THEN '{}'::text[]
         ELSE COALESCE(
           (SELECT array_agg(v) FROM jsonb_array_elements_text(matches::jsonb) AS v),
           '{}'::text[]
         )
       END;
       ALTER TABLE scripts DROP COLUMN "matches";
       ALTER TABLE scripts RENAME COLUMN "matches_new" TO "matches";
     END IF;
   END $$`,
  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'scripts' AND column_name = 'grants'
         AND data_type = 'text'
     ) THEN
       ALTER TABLE scripts ADD COLUMN "grants_new" text[] NOT NULL DEFAULT '{}';
       UPDATE scripts SET "grants_new" = CASE
         WHEN grants IS NULL OR grants !~ '^\\s*\\[' THEN '{}'::text[]
         ELSE COALESCE(
           (SELECT array_agg(v) FROM jsonb_array_elements_text(grants::jsonb) AS v),
           '{}'::text[]
         )
       END;
       ALTER TABLE scripts DROP COLUMN "grants";
       ALTER TABLE scripts RENAME COLUMN "grants_new" TO "grants";
     END IF;
   END $$`,
  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_name = 'scripts' AND column_name = 'obfuscate'
     ) THEN
       UPDATE scripts SET obfuscate_by_default = obfuscate;
       ALTER TABLE scripts DROP COLUMN obfuscate;
     END IF;
   END $$`,
];

async function main() {
  const client = new pg.Client({
    connectionString: resolveDatabaseUrl(),
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await client.connect();
    for (const stmt of STATEMENTS) {
      await client.query(stmt);
    }
    for (const stmt of MIGRATIONS) {
      await client.query(stmt);
    }
    console.log("[init-db] Esquema verificado/creado y migrado correctamente.");
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => {
  console.error("[init-db] Error al inicializar la base de datos:", err.message);
  process.exit(1);
});
