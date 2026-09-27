/** Ofuscacion ligera sin dependencias: empaqueta el codigo en base64 ofuscado. */
export function obfuscateScript(code: string, header = ""): string {
  const payload = Buffer.from(code, "utf8").toString("base64");
  const chunks = payload.match(/.{1,96}/g) ?? [];
  const pieces = chunks.map((chunk) => `"${chunk}"`).join(",\n  ");

  return `${header}
/* Ofuscado por Tampervault */
(function () {
  "use strict";
  var parts = [
  ${pieces}
  ];
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
  new Function(decode(parts.join("")))();
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
    if (value.trim()) lines.push(`// @${key}          ${value.trim()}`);
  };

  push("name", script.name);
  push("namespace", script.namespace);
  push("version", script.version);
  push("description", script.description);
  push("author", script.author);
  for (const match of script.matches) if (match.trim()) lines.push(`// @match         ${match.trim()}`);
  for (const grant of script.grants) if (grant.trim()) lines.push(`// @grant         ${grant.trim()}`);
  lines.push(`// @run-at        ${script.runAt}`);
  if (script.updateUrl.trim()) lines.push(`// @updateURL     ${script.updateUrl.trim()}`);
  if (script.downloadUrl.trim()) lines.push(`// @downloadURL   ${script.downloadUrl.trim()}`);
  lines.push("// ==/UserScript==");

  return `${lines.join("\n")}\n`;
}
