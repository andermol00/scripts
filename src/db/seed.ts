import { db } from "@/db";
import { scripts, users } from "@/db/schema";
import { hashSecret, sha256 } from "@/lib/auth";

export const DEFAULT_USERNAME = "admin";
export const DEFAULT_PASSWORD = "tampervault";
export const DEFAULT_PIN = "123456";

let seeded = false;

/**
 * Crea el usuario por defecto (y unos scripts de ejemplo) la primera vez que
 * se usa la aplicación sobre una base de datos vacía.
 */
export async function ensureSeed(): Promise<void> {
  if (seeded) return;
  seeded = true;

  try {
    const existing = await db.select({ id: users.id }).from(users).limit(1);
    if (existing.length > 0) return;

    const passwordHash = await hashSecret(DEFAULT_PASSWORD);
    const pinHash = await hashSecret(DEFAULT_PIN);

    const inserted = await db
      .insert(users)
      .values({ username: DEFAULT_USERNAME, passwordHash, pinHash })
      .returning({ id: users.id });

    const userId = inserted[0]?.id;
    if (!userId) return;

    await db.insert(scripts).values([
      {
        userId,
        name: "Dark GitHub Pro",
        version: "1.2.0",
        description: "Tema oscuro mejorado para github.com",
        author: DEFAULT_USERNAME,
        matches: ["https://github.com/*"],
        grants: ["GM_addStyle"],
        runAt: "document-idle",
        code: `// ==UserScript==\n// @name         Dark GitHub Pro\n// @version      1.2.0\n// @match        https://github.com/*\n// @grant        GM_addStyle\n// @run-at       document-idle\n// ==/UserScript==\n\n(function () {\n  "use strict";\n  GM_addStyle("body { filter: brightness(0.92) contrast(1.05); }");\n})();\n`,
        obfuscateByDefault: false,
      },
      {
        userId,
        name: "Auto Scroll Largo",
        version: "0.4.1",
        description: "Desplazamiento suave en paginas de lectura infinita",
        author: DEFAULT_USERNAME,
        matches: ["https://*.medium.com/*", "https://news.ycombinator.com/*"],
        grants: ["GM_registerMenuCommand"],
        runAt: "document-end",
        sourceUrl: null,
        code: `// ==UserScript==\n// @name         Auto Scroll Largo\n// @version      0.4.1\n// @match        https://news.ycombinator.com/*\n// @grant        GM_registerMenuCommand\n// @run-at       document-end\n// ==/UserScript==\n\n(function () {\n  "use strict";\n  let active = false;\n  function step() {\n    if (!active) return;\n    window.scrollBy({ top: 2, behavior: "instant" });\n    requestAnimationFrame(step);\n  }\n  GM_registerMenuCommand("Alternar auto-scroll", () => {\n    active = !active;\n    if (active) step();\n  });\n})();\n`,
        obfuscateByDefault: true,
      },
    ]);
  } catch (error) {
    seeded = false;
    console.error("[seed] no se pudo inicializar la base:", error);
  }
}

export function fingerprint(value: string): string {
  return sha256(value).slice(0, 12);
}
