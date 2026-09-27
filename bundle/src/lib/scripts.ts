import { sha256 } from "@/lib/auth";
import { buildUserscriptHeader, obfuscateScript } from "@/lib/obfuscate";
import type { Script } from "@/db/schema";

export const RUN_AT_OPTIONS = [
  "document-start",
  "document-body",
  "document-end",
  "document-idle",
] as const;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

export function normalizeScriptInput(input: Record<string, unknown>) {
  const runAt = asString(input.runAt, "document-idle");
  return {
    name: asString(input.name, "Script sin nombre").slice(0, 160),
    namespace: asString(input.namespace, "http://tampermonkey.net/").slice(0, 300),
    version: asString(input.version, "1.0.0").slice(0, 40),
    description: asString(input.description).slice(0, 500),
    author: asString(input.author).slice(0, 120),
    matches: toStringList(input.matches),
    grants: toStringList(input.grants),
    runAt: (RUN_AT_OPTIONS as readonly string[]).includes(runAt) ? runAt : "document-idle",
    updateUrl: asString(input.updateUrl).slice(0, 500),
    downloadUrl: asString(input.downloadUrl).slice(0, 500),
    code: asString(input.code),
    sourceUrl: asString(input.sourceUrl).trim() || null,
    obfuscateByDefault: input.obfuscateByDefault === true,
  };
}

export function scriptHash(code: string): string {
  return sha256(code);
}

export function renderUserScript(script: Script, obfuscated: boolean): string {
  const header = buildUserscriptHeader(script);
  return obfuscated ? obfuscateScript(script.code, header) : `${header}${script.code}\n`;
}

export async function fetchRemoteCode(
  url: string,
): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { ok: false, error: "Solo se permiten URLs http/https" };
    }
    if (["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname)) {
      return { ok: false, error: "URL interna bloqueada por seguridad" };
    }

    const response = await fetch(parsed.toString(), {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
      headers: { "user-agent": "Tampervault/1.0 (+userscript-vault)" },
      cache: "no-store",
    });

    if (!response.ok) return { ok: false, error: `El servidor respondio ${response.status}` };

    const text = await response.text();
    if (text.length > 2_000_000) return { ok: false, error: "El archivo supera 2 MB" };
    return { ok: true, code: text };
  } catch (error) {
    return { ok: false, error: (error as Error).message || "Fallo la descarga" };
  }
}

export function publicScript(script: Script) {
  const { code, ...rest } = script;
  return {
    ...rest,
    codeSize: code.length,
    codePreview: code.slice(0, 400),
    hasCode: code.trim().length > 0,
  };
}
