import "dotenv/config";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Client } = pg;
const scrypt = promisify(scryptCallback);

const USERNAME = process.env.SEED_USERNAME ?? "admin";
const PASSWORD = process.env.SEED_PASSWORD ?? "tampervault";
const PIN = process.env.SEED_PIN ?? "123456";

async function hashSecret(secret) {
  const salt = randomBytes(16);
  const derived = await scrypt(secret, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$${salt.toString("hex")}$${derived.toString("hex")}`;
}

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no esta definida");
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await client.connect();

    const existing = await client.query("SELECT id FROM users WHERE username = $1", [USERNAME]);
    if (existing.rowCount > 0) {
      console.log(`[seed] el usuario "${USERNAME}" ya existe, nada que hacer`);
      return;
    }

    const inserted = await client.query(
      "INSERT INTO users (username, password_hash, pin_hash) VALUES ($1, $2, $3) RETURNING id",
      [USERNAME, await hashSecret(PASSWORD), await hashSecret(PIN)],
    );
    const userId = inserted.rows[0].id;

    await client.query(
      `INSERT INTO scripts
        (user_id, name, version, description, author, matches, grants, run_at, code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        userId,
        "Ejemplo: Hola Tampervault",
        "1.0.0",
        "Userscript de ejemplo",
        USERNAME,
        ["https://example.com/*"],
        ["GM_addStyle"],
        "document-idle",
        `// ==UserScript==\n// @name         Ejemplo: Hola Tampervault\n// @version      1.0.0\n// @match        https://example.com/*\n// @grant        GM_addStyle\n// ==/UserScript==\n\n(function () {\n  "use strict";\n  GM_addStyle("body { outline: 4px solid #10b981; }");\n})();\n`,
      ],
    );

    console.log(`[seed] usuario "${USERNAME}" creado con PIN ${PIN}`);
  } catch (error) {
    console.error("[seed] error:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seed();
