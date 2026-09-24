import { z } from "zod";

export const runAtOptions = [
  "document-start",
  "document-body",
  "document-end",
  "document-idle",
  "context-menu",
] as const;

export const obfuscationLevels = ["strong"] as const;

/** Payload accepted by POST/PUT /api/scripts. */
export const scriptInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  description: z.string().trim().max(2000).default(""),
  code: z.string().max(500_000).default(""),
  namespace: z.string().trim().max(300).default("http://tampermonkey.net/"),
  version: z.string().trim().max(50).default("1.0.0"),
  author: z.string().trim().max(200).default(""),
  // Acepta arrays nativos o texto (una entrada por línea / JSON) por
  // compatibilidad con clientes antiguos.
  matches: z
    .union([z.array(z.string().trim().min(1)), z.string()])
    .transform((v) => normalizeList(v))
    .default([]),
  grants: z
    .union([z.array(z.string().trim().min(1)), z.string()])
    .transform((v) => normalizeList(v))
    .default([]),
  runAt: z.enum(runAtOptions).default("document-idle"),
  updateUrl: z.string().trim().max(500).default(""),
  downloadUrl: z.string().trim().max(500).default(""),
  obfuscateByDefault: z.boolean().default(false),
});

export type ScriptInput = z.infer<typeof scriptInputSchema>;

/** Payload accepted by POST /api/scripts/[id]/generate. */
export const generateSchema = z.object({
  level: z.enum(obfuscationLevels).default("strong"),
});

export type GenerateInput = z.infer<typeof generateSchema>;

/** Payload accepted by POST /api/tools/obfuscate. */
export const obfuscateToolSchema = z.object({
  code: z.string().min(1).max(500_000),
  level: z.enum(obfuscationLevels).default("strong"),
});

export type ObfuscateToolInput = z.infer<typeof obfuscateToolSchema>;

function normalizeList(value: string[] | string): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => v.trim()).filter(Boolean).slice(0, 50);
  }
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, 50);
      }
    } catch {
      /* falls through */
    }
  }
  return trimmed
    .split(/[\r\n,]+/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 50);
}
