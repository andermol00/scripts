/**
 * Ofuscación ligera y sin dependencias para userscripts.
 * Empaqueta el código original en un array de caracteres ofuscado y lo
 * reconstruye en tiempo de ejecución dentro de un IIFE.
 */
export function obfuscateScript(code: string, banner = ""): string {
  const payload = Buffer.from(code, "utf8").toString("base64");
  const chunks = payload.match(/.{1,96}/g) ?? [];
  const pieces = chunks.map((chunk) => `"${chunk}"`).join(",\n  ");

  return `${banner}// ==/UserScript==
/* Ofuscado por Tampervault */
(function () {
  "use strict";
  var parts = [
  ${pieces}
  ];
  var encoded = parts.join("");
  function decode(b64) {
    var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    var clean = b64.replace(/[^A-Za-z0-9+/=]/g, "");
    var out = "";
    var bits = 0;
    var acc = 0;
    for (var i = 0; i < clean.length; i++) {
      var idx = chars.indexOf(clean.charAt(i));
      if (idx === -1) continue;
      acc = (acc << 6) | idx;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out += String.fromCharCode((acc >> bits) & 0xff);
      }
    }
    return decodeURIComponent(escape(out));
  }
  var source = decode(encoded);
  var boot = new Function(source + "\\n//# sourceURL=tampervault.user.js");
  boot();
})();
`;
}

export function buildUserscriptHeader(script: {
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  matches: string[];
  grants: string[];
  runAt: string;
  updateUrl: string;
  downloadUrl: string;
}): string {
  const lines: string[] = ["// ==UserScript=="];
  const push = (key: string, value: string) => {
    if (value && value.trim().length > 0) lines.push(`// @${key}          ${value.trim()}`);
  };

  push("name", script.name);
  push("namespace", script.namespace);
  push("version", script.version);
  push("description", script.description);
  push("author", script.author);

  for (const pattern of script.matches) {
    const trimmed = pattern.trim();
    if (trimmed) lines.push(`// @match         ${trimmed}`);
  }
  for (const grant of script.grants) {
    const trimmed = grant.trim();
    if (trimmed) lines.push(`// @grant         ${trimmed}`);
  }

  lines.push(`// @run-at        ${script.runAt}`);
  if (script.updateUrl.trim()) lines.push(`// @updateURL     ${script.updateUrl.trim()}`);
  if (script.downloadUrl.trim()) lines.push(`// @downloadURL   ${script.downloadUrl.trim()}`);
  lines.push("// ==/UserScript==");

  return `${lines.join("\n")}\n`;
}
