import { z } from "zod";

export const runAtOptions = [
  "document-start",
  "document-end",
  "document-idle",
  "context-menu",
] as const;

export const scriptInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(200),
  description: z.string().trim().max(2000).default(""),
  code: z.string().min(1, "El código es obligatorio").max(500_000),
  namespace: z.string().trim().max(300).default("https://tampermonkey.local/"),
  version: z.string().trim().max(50).default("1.0.0"),
  author: z.string().trim().max(200).default(""),
  matches: z.array(z.string().trim().min(1)).max(50).default([]),
  grants: z.array(z.string().trim().min(1)).max(50).default([]),
  runAt: z.enum(runAtOptions).default("document-idle"),
  updateUrl: z.string().trim().max(500).default(""),
  downloadUrl: z.string().trim().max(500).default(""),
  obfuscateByDefault: z.boolean().default(false),
});

export type ScriptInput = z.infer<typeof scriptInputSchema>;

export const generateSchema = z.object({
  level: z.enum(["none", "basic", "strong"]).default("none"),
});

export const obfuscateToolSchema = z.object({
  code: z.string().min(1).max(500_000),
  level: z.enum(["none", "basic", "strong"]).default("basic"),
});
