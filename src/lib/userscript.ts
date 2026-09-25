import type { Script } from "@/db/schema";
import {
  obfuscateCode,
  isObfuscationLevel,
  type ObfuscationLevel,
} from "./obfuscate";

/**
 * Always returns "strong" obfuscation level.
 */
export function resolveLevel(
  level: unknown,
  obfuscateByDefault: boolean,
): ObfuscationLevel {
  return "strong";
}

/**
 * Increment version automatically when script changes
 * @param version - Current version (e.g., "1.0.0")
 * @returns Incremented version (e.g., "1.0.1")
 */
export function incrementVersion(version: string): string {
  const parts = version.split(".");
  if (parts.length < 3) {
    // Fallback if version is malformed
    return version + ".1";
  }

  // Increment patch version (last number)
  const patch = parseInt(parts[parts.length - 1], 10);
  if (isNaN(patch)) {
    parts[parts.length - 1] = "1";
  } else {
    parts[parts.length - 1] = String(patch + 1);
  }

  return parts.join(".");
}

/**
 * Build a complete Tampermonkey userscript from a stored record.
 *
 * @param script - Stored script record
 * @param level - Obfuscation level (always "strong")
 * @param baseUrl - Base URL for @updateURL and @downloadURL (from environment or parameter)
 */
export function buildUserscript(
  script: Script,
  level?: ObfuscationLevel | string,
  baseUrl?: string,
): string {
  const matches = script.matches ?? [];
  const grants = script.grants ?? [];
  const chosen = resolveLevel(level, script.obfuscateByDefault);

  // Get base URL from environment or parameter
  const publicUrl = baseUrl || process.env.TAMPERVAULT_PUBLIC_URL || "";

  const lines: string[] = [];
  lines.push("// ==UserScript==");
  lines.push(`// @name         ${script.name}`);
  lines.push(`// @namespace    ${script.namespace}`);
  lines.push(`// @version      ${script.version}`);
  if (script.description) lines.push(`// @description  ${script.description}`);
  if (script.author) lines.push(`// @author       ${script.author}`);
  if (matches.length === 0) {
    lines.push("// @match        *://*/*");
  } else {
    for (const m of matches) lines.push(`// @match        ${m}`);
  }
  if (grants.length === 0) {
    lines.push("// @grant        none");
  } else {
    for (const g of grants) lines.push(`// @grant        ${g}`);
  }
  
  // ✨ AUTO-UPDATE: Add updateURL and downloadURL automatically
  if (publicUrl) {
    const updateUrl = `${publicUrl.replace(/\/$/, "")}/api/scripts/${script.id}/raw`;
    lines.push(`// @updateURL    ${updateUrl}`);
    lines.push(`// @downloadURL  ${updateUrl}`);
  }
  
  if (script.updateUrl) lines.push(`// @updateURL    ${script.updateUrl}`);
  if (script.downloadUrl)
    lines.push(`// @downloadURL  ${script.downloadUrl}`);
  lines.push(`// @run-at       ${script.runAt}`);
  lines.push("// ==/UserScript==");
  lines.push("");

  const body = obfuscateCode(script.code, chosen);

  lines.push("(function () {");
  lines.push("    'use strict';");
  lines.push("");
  lines.push(indent(body, 4));
  lines.push("})();");

  return lines.join("\n");
}

/** Safe filename for the generated .user.js download. */
export function scriptFilename(name: string): string {
  const base =
    name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase().replace(/^_+|_+$/g, "") ||
    "script";
  return `${base}.user.js`;
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}
