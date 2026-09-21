import type { Script } from "@/db/schema";
import { obfuscateCode } from "./obfuscate";

function parseList(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Build a complete Tampermonkey userscript from a stored record. */
export function buildUserscript(script: Script): string {
  const matches = parseList(script.matches);
  const grants = parseList(script.grants);

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
  lines.push(`// @run-at       ${script.runAt}`);
  lines.push("// ==/UserScript==");
  lines.push("");

  const body = script.obfuscate ? obfuscateCode(script.code) : script.code;

  lines.push("(function() {");
  lines.push("    'use strict';");
  lines.push("");
  lines.push(indent(body, 4));
  lines.push("})();");

  return lines.join("\n");
}

function indent(text: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}
