import { sql } from "drizzle-orm";
import { db } from "@/db";

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  pin_hash TEXT,
  totp_secret TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  token_hash TEXT UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent TEXT,
  ip TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS pin_attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  password_required_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS pin_attempts_user_id_idx ON pin_attempts(user_id);
CREATE INDEX IF NOT EXISTS pin_attempts_ip_idx ON pin_attempts(ip);

CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL DEFAULT '',
  username TEXT,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  identifier TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  last_attempt_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts(ip);
CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON login_attempts(identifier);

CREATE TABLE IF NOT EXISTS login_events (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_events_identifier_idx ON login_events(identifier);

CREATE TABLE IF NOT EXISTS scripts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'http://tampermonkey.net/',
  version TEXT NOT NULL DEFAULT '1.0.0',
  description TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  matches TEXT[] NOT NULL DEFAULT '{}'::text[],
  grants TEXT[] NOT NULL DEFAULT '{}'::text[],
  run_at TEXT NOT NULL DEFAULT 'document-idle',
  update_url TEXT NOT NULL DEFAULT '',
  download_url TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  obfuscate_by_default BOOLEAN NOT NULL DEFAULT FALSE,
  code_hash TEXT NOT NULL DEFAULT '',
  source_url TEXT,
  last_check_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
`;

const globalForBootstrap = globalThis as typeof globalThis & {
  __tampervaultSchemaReady?: boolean;
};

/**
 * Crea las tablas si no existen. Se ejecuta una sola vez por proceso, así que
 * el primer request tras un deploy deja la base lista sin pasos manuales.
 */
export async function ensureSchema(): Promise<boolean> {
  if (globalForBootstrap.__tampervaultSchemaReady) return true;

  try {
    await db.execute(sql.raw(DDL));
    globalForBootstrap.__tampervaultSchemaReady = true;
    console.log("[db] esquema listo");
    return true;
  } catch (error) {
    console.error("[db] no se pudo preparar el esquema:", error);
    return false;
  }
}
