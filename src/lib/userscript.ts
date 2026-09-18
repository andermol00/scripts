export type ScriptRecord = {
  name: string;
  description: string;
  code: string;
  namespace: string;
  version: string;
  author: string;
  matches: string[];
  grants: string[];
  runAt: string;
  updateUrl: string;
  downloadUrl: string;
};

import { obfuscateCode, type ObfuscationLevel } from "./obfuscate";

function metaLine(tag: string, value: string) {
  return `// @${tag.padEnd(12, " ")} ${value}`;
}

export function buildUserscript(script: ScriptRecord, level: ObfuscationLevel) {
  const lines: string[] = [];
  lines.push("// ==UserScript==");
  lines.push(metaLine("name", script.name || "Sin nombre"));
  if (script.namespace) lines.push(metaLine("namespace", script.namespace));
  lines.push(metaLine("version", script.version || "1.0.0"));
  if (script.description) lines.push(metaLine("description", script.description));
  if (script.author) lines.push(metaLine("author", script.author));

  const matches = script.matches.length > 0 ? script.matches : ["*://*/*"];
  for (const match of matches) {
    lines.push(metaLine("match", match));
  }

  const grants = script.grants.length > 0 ? script.grants : ["none"];
  for (const grant of grants) {
    lines.push(metaLine("grant", grant));
  }

  if (script.runAt) lines.push(metaLine("run-at", script.runAt));
  if (script.updateUrl) lines.push(metaLine("updateURL", script.updateUrl));
  if (script.downloadUrl) lines.push(metaLine("downloadURL", script.downloadUrl));
  lines.push("// ==/UserScript==");

  const header = lines.join("\n");
  const body = obfuscateCode(script.code, level);

  return `${header}\n\n${body}\n`;
}
