import type { ScriptForm } from "./types";

export type ImportResult =
  | { ok: true; form: ScriptForm; hadHeader: boolean }
  | { ok: false; error: string };

function dedent(text: string): string {
  const lines = text.split("\n");
  const indents = lines
    .filter((l) => l.trim().length > 0)
    .map((l) => l.match(/^[ \t]*/)?.[0].length ?? 0);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join("\n");
}

/**
 * Detects a wrapping IIFE like `(function () { ... })();` or `!function(){...}();`
 * and returns the inner code so it isn't duplicated when we re-wrap the script.
 */
function unwrapIife(code: string): string {
  const s = code.trim();
  const m = s.match(/^[(\!]?\s*function\s*\w*\s*\([^)]*\)\s*\{/);
  if (!m || m.index !== 0) return s;

  const openIdx = s.indexOf("{");
  let depth = 0;
  let end = -1;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end < 0) return s;

  const tail = s.slice(end + 1).trim();
  if (!/^\)?\s*\(\s*\)\s*;?$/.test(tail)) return s;

  let inner = s.slice(openIdx + 1, end);
  // Remove the directive only (don't eat the next line's indentation).
  inner = inner.replace(/^[ \t\n]*(['"])use strict\1[ \t]*;?/, "");
  return dedent(inner).replace(/^\n+/, "").replace(/\s+$/, "");
}

/**
 * Parse a pasted userscript (or raw JS) into the editor form.
 * Metadata is read from the `// ==UserScript==` header when present.
 */
export function parseUserscript(raw: string): ImportResult {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) {
    return { ok: false, error: "Pega primero el contenido del script." };
  }

  const open = text.match(/^[ \t]*\/\/\s*==UserScript==\s*$/m);
  const close = text.match(/^[ \t]*\/\/\s*==\/UserScript==\s*$/m);

  let hadHeader = false;
  let header = "";
  let body = text;

  if (open && close && close.index! > open.index!) {
    hadHeader = true;
    const openEnd = open.index! + open[0].length;
    header = text.slice(openEnd, close.index!);
    body = text.slice(close.index! + close[0].length);
  } else if (open && !close) {
    return {
      ok: false,
      error: "Falta la línea de cierre // ==/UserScript== en la cabecera.",
    };
  }

  const matches: string[] = [];
  const grants: string[] = [];
  const meta: Record<string, string> = {};

  for (const line of header.split("\n")) {
    const m = line.match(/^[ \t]*\/\/\s*@([\w:-]+)[ \t]*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    switch (key) {
      case "match":
      case "include":
        if (value) matches.push(value);
        break;
      case "grant":
        if (value && !grants.includes(value)) grants.push(value);
        break;
      case "name":
      case "namespace":
      case "version":
      case "description":
      case "author":
      case "run-at":
        if (value) meta[key] = value;
        break;
      default:
        break;
    }
  }

  const code = unwrapIife(body);

  if (!hadHeader && !code.trim()) {
    return { ok: false, error: "No se encontró código para importar." };
  }
  if (hadHeader && !meta["name"] && !code.trim()) {
    return { ok: false, error: "La cabecera no contiene @name ni código." };
  }

  return {
    ok: true,
    hadHeader,
    form: {
      name: meta["name"] ?? "",
      namespace: meta["namespace"] ?? "http://tampermonkey.net/",
      version: meta["version"] ?? "1.0.0",
      description: meta["description"] ?? "",
      author: meta["author"] ?? "",
      matches: matches.length ? matches.join("\n") : "*://*/*",
      grants: grants.length ? grants.join("\n") : "none",
      runAt: meta["run-at"] ?? "document-idle",
      code,
      obfuscate: false,
    },
  };
}
