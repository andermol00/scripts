import { Pool } from "pg";
import fs from "fs";
import path from "path";

export async function bootstrapDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }

  const pool = new Pool({ connectionString });

  try {
    const client = await pool.connect();

    const schema = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        pin_hash TEXT,
        totp_secret TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        token_hash TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_agent TEXT,
        ip TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions(token_hash);

      CREATE TABLE IF NOT EXISTS pin_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip TEXT NOT NULL,
        attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        password_required_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS pin_attempts_user_id_idx ON pin_attempts(user_id);
      CREATE INDEX IF NOT EXISTS pin_attempts_ip_idx ON pin_attempts(ip);

      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        ip TEXT NOT NULL,
        username TEXT,
        success BOOLEAN DEFAULT FALSE,
        identifier TEXT,
        attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        last_attempt_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS login_attempts_ip_idx ON login_attempts(ip);
      CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx ON login_attempts(identifier);

      CREATE TABLE IF NOT EXISTS login_events (
        id SERIAL PRIMARY KEY,
        identifier TEXT NOT NULL,
        success BOOLEAN DEFAULT FALSE,
        reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS login_events_identifier_idx ON login_events(identifier);

      CREATE TABLE IF NOT EXISTS scripts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        namespace TEXT DEFAULT 'http://tampermonkey.net/',
        version TEXT DEFAULT '1.0.0',
        description TEXT DEFAULT '',
        author TEXT DEFAULT '',
        matches TEXT[] DEFAULT '{}',
        grants TEXT[] DEFAULT '{}',
        run_at TEXT DEFAULT 'document-idle',
        update_url TEXT DEFAULT '',
        download_url TEXT DEFAULT '',
        code TEXT DEFAULT '',
        obfuscate_by_default BOOLEAN DEFAULT FALSE,
        code_hash TEXT DEFAULT '',
        source_url TEXT,
        last_check_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    for (const statement of schema.split(";").filter((s) => s.trim())) {
      await client.query(statement);
    }

    console.log("✓ Database schema created/verified");
    client.release();
  } finally {
    await pool.end();
  }
}
