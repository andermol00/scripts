import { sql } from "drizzle-orm";
import { db } from ".";

/**
 * Idempotent schema bootstrap.
 *
 * Render provisions an empty PostgreSQL instance; nothing runs
 * `drizzle-kit push` for us. We create the tables on server boot so a fresh
 * deploy works with zero manual steps. Everything is `IF NOT EXISTS`, so this
 * is a no-op once the tables already exist, and any failure is non-fatal (the
 * app still boots and the error is logged instead of crashing the process).
 */
const STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS "users" (
     "id" serial PRIMARY KEY NOT NULL,
     "username" text NOT NULL,
     "password_hash" text NOT NULL,
     "totp_secret" text,
     "created_at" timestamp DEFAULT now() NOT NULL,
     CONSTRAINT "users_username_unique" UNIQUE("username")
   )`,
  `CREATE TABLE IF NOT EXISTS "sessions" (
     "id" serial PRIMARY KEY NOT NULL,
     "token_hash" text NOT NULL,
     "user_id" integer NOT NULL,
     "user_agent" text,
     "ip" text,
     "expires_at" timestamp NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL,
     CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
   )`,
  `CREATE INDEX IF NOT EXISTS "sessions_token_idx" ON "sessions" ("token_hash")`,
  `CREATE TABLE IF NOT EXISTS "login_attempts" (
     "id" serial PRIMARY KEY NOT NULL,
     "ip" text NOT NULL,
     "username" text,
     "success" boolean DEFAULT false NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS "login_attempts_ip_idx" ON "login_attempts" ("ip")`,
  `CREATE TABLE IF NOT EXISTS "scripts" (
     "id" serial PRIMARY KEY NOT NULL,
     "user_id" integer NOT NULL,
     "name" text NOT NULL,
     "namespace" text DEFAULT 'http://tampermonkey.net/' NOT NULL,
     "version" text DEFAULT '1.0.0' NOT NULL,
     "description" text DEFAULT '' NOT NULL,
     "author" text DEFAULT '' NOT NULL,
     "matches" text DEFAULT '[]' NOT NULL,
     "grants" text DEFAULT '[]' NOT NULL,
     "run_at" text DEFAULT 'document-idle' NOT NULL,
     "code" text DEFAULT '' NOT NULL,
     "obfuscate" boolean DEFAULT false NOT NULL,
     "created_at" timestamp DEFAULT now() NOT NULL,
     "updated_at" timestamp DEFAULT now() NOT NULL
   )`,
  `DO $$
   BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk') THEN
       ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk"
         FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
     END IF;
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scripts_user_id_users_id_fk') THEN
       ALTER TABLE "scripts" ADD CONSTRAINT "scripts_user_id_users_id_fk"
         FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
     END IF;
   END $$`,
];

let pending: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  pending ??= (async () => {
    for (const statement of STATEMENTS) {
      try {
        await db.execute(sql.raw(statement));
      } catch (error) {
        console.error("[db] bootstrap statement failed:", error);
      }
    }
  })();
  return pending;
}
