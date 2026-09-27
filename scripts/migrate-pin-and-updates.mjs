import pkg from "pg";
import { config } from "dotenv";

const { Client } = pkg;

config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    await client.connect();
    console.log("✓ Conectado a la BD");

    // 1. Agregar columnas a users si no existen
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS pin_hash TEXT;
    `);
    console.log("✓ Columna pin_hash agregada a users");

    // 2. Crear tabla pin_attempts
    await client.query(`
      CREATE TABLE IF NOT EXISTS pin_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMP,
        password_required_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("✓ Tabla pin_attempts creada");

    // 3. Crear índices
    await client.query(`
      CREATE INDEX IF NOT EXISTS pin_attempts_user_id_idx 
      ON pin_attempts(user_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS pin_attempts_ip_idx 
      ON pin_attempts(ip);
    `);
    console.log("✓ Índices de pin_attempts creados");

    // 4. Agregar columnas a scripts
    await client.query(`
      ALTER TABLE scripts
      ADD COLUMN IF NOT EXISTS code_hash TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS source_url TEXT,
      ADD COLUMN IF NOT EXISTS last_check_at TIMESTAMP;
    `);
    console.log("✓ Columnas de actualización agregadas a scripts");

    // 5. Populuar code_hash con scripts existentes
    await client.query(`
      UPDATE scripts 
      SET code_hash = encode(digest(code, 'sha256'), 'hex')
      WHERE code_hash = '';
    `);
    console.log("✓ code_hash populado para scripts existentes");

    console.log("\n✅ Migración completada exitosamente");
  } catch (error) {
    console.error("❌ Error en migración:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
