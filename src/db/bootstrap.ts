import { pool, assertDatabaseUrl } from "@/db";

/**
 * Runtime database bootstrap.
 *
 * Render sometimes does not expose DATABASE_URL during the build and the
 * service was configured with `yarn build` (without init-db). This guarantees
 * that the schema exists on the first runtime request. PostgreSQL advisory
 * locks prevent two cold-start requests from running DDL simultaneously.
 */
const globalForBootstrap = globalThis as typeof globalThis & {
  __tampervaultSchemaPromise?: Promise<void>;
};

const SCHEMA_VERSION = 3;
const LOCK_KEY = 7_431_029;

const statements = [
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
     "ip" text NOT NULL DEFAULT '',
     "username" text,
     "success" boolean NOT NULL DEFAULT false,
     "identifier" text,
     "attempts" integer NOT NULL DEFAULT 0,
     "locked_until" timestamp,
     "last_attempt_at" timestamp,
     "created_at" timestamp NOT NULL DEFAULT now()
   )`,
  `ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS "identifier" text`,
  `ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS "attempts" integer NOT NULL DEFAULT 0`,
  `ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS "locked_until" timestamp`,
  `ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp`,
  `ALTER TABLE login_attempts ALTER COLUMN "ip" SET DEFAULT ''`,
  `CREATE INDEX IF NOT EXISTS "login_attempts_ip_idx" ON login_attempts ("ip")`,
  `CREATE INDEX IF NOT EXISTS "login_attempts_identifier_idx" ON login_attempts ("identifier")`,
  `CREATE TABLE IF NOT EXISTS login_events (
     "id" serial PRIMARY KEY,
     "identifier" text NOT NULL,
     "success" boolean NOT NULL DEFAULT false,
     "reason" text NOT NULL DEFAULT '',
     "created_at" timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS "login_events_identifier_idx" ON login_events ("identifier")`,
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
  `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS "update_url" text NOT NULL DEFAULT ''`,
  `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS "download_url" text NOT NULL DEFAULT ''`,
  `ALTER TABLE scripts ADD COLUMN IF NOT EXISTS "obfuscate_by_default" boolean NOT NULL DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS "scripts_user_idx" ON scripts ("user_id")`,
  // Convert the first-generation JSON-text columns to native Postgres arrays.
  `DO $$
   BEGIN
     IF EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'scripts' AND column_name = 'matches'
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
       WHERE table_schema = current_schema()
         AND table_name = 'scripts' AND column_name = 'grants'
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
       WHERE table_schema = current_schema()
         AND table_name = 'scripts' AND column_name = 'obfuscate'
     ) THEN
       UPDATE scripts SET obfuscate_by_default = obfuscate;
       ALTER TABLE scripts DROP COLUMN obfuscate;
     END IF;
   END $$`,
];

async function bootstrap(): Promise<void> {
  assertDatabaseUrl();
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query("BEGIN");
    try {
      for (const statement of statements) {
        await client.query(statement);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    // The session-level lock must be released on this same pooled connection.
    await client
      .query("SELECT pg_advisory_unlock($1)", [LOCK_KEY])
      .catch(() => undefined);
    client.release();
  }
}

/** Ensures the DB schema once per server process; failures remain retryable. */
export async function ensureDatabaseSchema(): Promise<void> {
  if (!globalForBootstrap.__tampervaultSchemaPromise) {
    globalForBootstrap.__tampervaultSchemaPromise = bootstrap().catch((error) => {
      delete globalForBootstrap.__tampervaultSchemaPromise;
      throw error;
    });
  }
  await globalForBootstrap.__tampervaultSchemaPromise;
}

// Backward-compatible name used by src/instrumentation.ts in the multi-page
// generation of the project. Both names intentionally point to the same
// once-per-process, retryable bootstrap.
export const ensureSchema = ensureDatabaseSchema;

export function getSchemaVersion(): number {
  return SCHEMA_VERSION;
}
