import { promises as fs } from "node:fs";
import path from "node:path";

export const BUNDLE_DIR = path.join(process.cwd(), "bundle");

export type BundleFile = {
  path: string;
  size: number;
  group: string;
  language: string;
  description: string;
};

const META: Record<string, { group: string; language: string; description: string }> = {
  ".gitignore": { group: "Raíz", language: "text", description: "Archivos que Git debe ignorar" },
  ".env.example": {
    group: "Raíz",
    language: "bash",
    description: "Plantilla de variables de entorno",
  },
  "package.json": { group: "Raíz", language: "json", description: "Dependencias y scripts npm" },
  "tsconfig.json": { group: "Raíz", language: "json", description: "Configuración de TypeScript" },
  "next.config.ts": { group: "Raíz", language: "ts", description: "Configuración de Next.js" },
  "postcss.config.mjs": {
    group: "Raíz",
    language: "js",
    description: "PostCSS + plugin de Tailwind 4",
  },
  "eslint.config.mjs": {
    group: "Raíz",
    language: "js",
    description: "Flat config de ESLint sin dependencias extra",
  },
  "drizzle.config.ts": {
    group: "Raíz",
    language: "ts",
    description: "Config de Drizzle Kit (carga .env)",
  },
  "vercel.json": {
    group: "Raíz",
    language: "json",
    description: "Build de Vercel + init de base de datos",
  },
  "README.md": {
    group: "Raíz",
    language: "markdown",
    description: "Guía de instalación, seguridad y despliegue",
  },
};

function metaFor(relPath: string) {
  const custom = META[relPath];
  if (custom) return custom;
  if (relPath.startsWith("scripts/")) {
    return {
      group: "scripts/",
      language: "js",
      description: relPath.endsWith("init-db.mjs")
        ? "Crea el esquema SQL en Postgres"
        : "Crea el usuario admin + script de ejemplo",
    };
  }
  if (relPath.startsWith("src/db/")) {
    return {
      group: "src/db/",
      language: "ts",
      description: relPath.endsWith("schema.ts")
        ? "Tablas Drizzle (users, sessions, pin_attempts, scripts...)"
        : relPath.endsWith("index.ts")
          ? "Pool de Postgres + cliente Drizzle"
          : relPath.endsWith("seed.ts")
            ? "Usuario por defecto la primera vez"
            : "DDL idempotente de la base de datos",
    };
  }
  if (relPath.startsWith("src/lib/")) {
    return {
      group: "src/lib/",
      language: "ts",
      description: relPath.endsWith("auth.ts")
        ? "scrypt, sha256, tokens y utilidades de PIN"
        : relPath.endsWith("session.ts")
          ? "Sesiones en base de datos + cookie httpOnly"
          : relPath.endsWith("obfuscate.ts")
            ? "Ofuscación de userscripts y cabecera @meta"
            : "Normalización, hash y render de userscripts",
    };
  }
  if (relPath.startsWith("src/app/api/")) {
    return {
      group: "src/app/api/",
      language: "ts",
      description: relPath.includes("auth/pin")
        ? "POST login con PIN + bloqueo por IP"
        : relPath.includes("auth/logout")
          ? "Cierra la sesión y borra la cookie"
          : relPath.includes("credentials")
            ? "Cambia PIN y contraseña"
            : relPath.includes("download")
              ? "Sirve el .user.js instalable"
              : relPath.includes("check-updates")
                ? "Sincroniza los scripts con su URL de origen"
                : relPath.endsWith("health/route.ts")
                  ? "Healthcheck de la base de datos"
                  : "CRUD de scripts",
    };
  }
  if (relPath.startsWith("src/app/")) {
    return {
      group: "src/app/",
      language: relPath.endsWith(".tsx") ? "tsx" : "css",
      description: relPath.includes("dashboard")
        ? "Panel protegido por sesión"
        : relPath.endsWith("layout.tsx")
          ? "Layout raíz + metadata"
          : relPath.endsWith("page.tsx")
            ? "Pantalla de login con PIN"
            : "Estilos base con Tailwind 4",
    };
  }
  if (relPath.startsWith("src/components/")) {
    return {
      group: "src/components/",
      language: "tsx",
      description: relPath.includes("pin-login")
        ? "Formulario PIN + recuperación por contraseña"
        : "Panel de gestión de scripts",
    };
  }
  return { group: "otros", language: "text", description: "" };
}

async function walk(dir: string, base = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await walk(path.join(dir, entry.name), relPath)));
    } else if (entry.isFile()) {
      files.push(relPath);
    }
  }

  return files.sort((a, b) => {
    const rank = (value: string) => (value.includes("/") ? 1 : 0);
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return a.localeCompare(b);
  });
}

export async function listBundleFiles(): Promise<BundleFile[]> {
  const relPaths = await walk(BUNDLE_DIR);

  const files = await Promise.all(
    relPaths.map(async (relPath) => {
      const stat = await fs.stat(path.join(BUNDLE_DIR, relPath));
      return { path: relPath, size: stat.size, ...metaFor(relPath) };
    }),
  );

  return files;
}

export type BundleFileContent = { path: string; content: string; size: number };

export async function readBundleFile(relPath: string): Promise<BundleFileContent | null> {
  const normalized = relPath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || normalized.startsWith(".")) return null;

  const absolute = path.join(BUNDLE_DIR, normalized);
  if (!absolute.startsWith(BUNDLE_DIR)) return null;

  try {
    const content = await fs.readFile(absolute, "utf8");
    return { path: normalized, content, size: Buffer.byteLength(content, "utf8") };
  } catch {
    return null;
  }
}

export function groupFiles(files: BundleFile[]): { group: string; files: BundleFile[] }[] {
  const groups = new Map<string, BundleFile[]>();
  for (const file of files) {
    const list = groups.get(file.group) ?? [];
    list.push(file);
    groups.set(file.group, list);
  }
  return [...groups.entries()].map(([group, list]) => ({ group, files: list }));
}
