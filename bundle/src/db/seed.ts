import { db } from "@/db";
import { scripts, users } from "@/db/schema";
import { hashSecret } from "@/lib/auth";

export const DEFAULT_USERNAME = "admin";
export const DEFAULT_PASSWORD = "tampervault";
export const DEFAULT_PIN = "123456";

let seeded = false;

/**
 * Crea el usuario por defecto la primera vez que se usa la app
 * sobre una base de datos vacia.
 */
export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  seeded = true;

  try {
    const existing = await db.select({ id: users.id }).from(users).limit(1);
    if (existing.length > 0) return;

    const inserted = await db
      .insert(users)
      .values({
        username: DEFAULT_USERNAME,
        passwordHash: await hashSecret(DEFAULT_PASSWORD),
        pinHash: await hashSecret(DEFAULT_PIN),
      })
      .returning({ id: users.id });

    const userId = inserted[0]?.id;
    if (!userId) return;

    await db.insert(scripts).values({
      userId,
      name: "Ejemplo: Hola Tampervault",
      version: "1.0.0",
      description: "Userscript de ejemplo para comprobar la instalacion",
      author: DEFAULT_USERNAME,
      matches: ["https://example.com/*"],
      grants: ["GM_addStyle"],
      runAt: "document-idle",
      code: `// ==UserScript==\n// @name         Ejemplo: Hola Tampervault\n// @version      1.0.0\n// @match        https://example.com/*\n// @grant        GM_addStyle\n// @run-at       document-idle\n// ==/UserScript==\n\n(function () {\n  "use strict";\n  GM_addStyle("body { outline: 4px solid #10b981; }");\n  console.log("[Tampervault] userscript activo");\n})();\n`,
    });

    console.log("[seed] usuario y script de ejemplo creados");
  } catch (error) {
    seeded = false;
    console.error("[seed] fallo la inicializacion:", error);
  }
}
