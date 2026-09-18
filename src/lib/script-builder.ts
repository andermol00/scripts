const metadataBlock = /(^\s*\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\s*)/;

function defaultMetadata(title: string) {
  const safeName = title.replace(/[\r\n]/g, " ").trim() || "Script Vault";
  return `// ==UserScript==\n// @name         ${safeName}\n// @namespace    https://scriptvault.local\n// @version      1.0.0\n// @description  Entregado desde Script Vault\n// @match        *://*/*\n// @grant        none\n// ==/UserScript==\n`;
}

export function buildTampermonkeyOutput(source: string, title: string, obfuscate: boolean) {
  if (!obfuscate) return source;

  const match = source.match(metadataBlock);
  const metadata = match?.[1] ?? defaultMetadata(title);
  const body = source.slice(match?.[1].length ?? 0).trim();
  const reversedPayload = Buffer.from(body, "utf8").toString("base64").split("").reverse().join("");

  return `${metadata}\n(function () {\n  "use strict";\n  const _0x9f3a = "${reversedPayload}";\n  const _0x7b1c = _0x9f3a.split("").reverse().join("");\n  const _0x4d2e = new TextDecoder().decode(\n    Uint8Array.from(atob(_0x7b1c), (char) => char.charCodeAt(0)),\n  );\n  (0, eval)(_0x4d2e);\n})();\n`;
}
