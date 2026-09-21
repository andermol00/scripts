/**
 * Lightweight, dependency-free JS obfuscator.
 *
 * It encodes the source with a per-payload XOR key and Base64, then emits a
 * small self-decoding loader. This keeps the readable source hidden while
 * remaining 100% functional inside Tampermonkey (which runs it via eval-like
 * execution). It is an obfuscator, not real encryption — treat it as such.
 */

function toBase64(input: string): string {
  return Buffer.from(input, "utf-8").toString("base64");
}

export function obfuscateCode(source: string): string {
  // Random XOR key (0-255) and rotated variable names.
  const key = Math.floor(Math.random() * 200) + 20;

  const xored = Array.from(Buffer.from(source, "utf-8"))
    .map((b) => b ^ key)
    .map((b) => String.fromCharCode(b))
    .join("");

  const payload = toBase64(xored);

  // Random-ish identifiers to reduce readability.
  const rid = () => "_" + Math.random().toString(36).slice(2, 8);
  const vPayload = rid();
  const vKey = rid();
  const vDec = rid();
  const vI = rid();
  const vOut = rid();
  const vRun = rid();

  return `/* Obfuscated by Tampervault. Do not edit the block below. */
(function(){
  var ${vPayload} = "${payload}";
  var ${vKey} = ${key};
  var ${vDec} = (typeof atob === "function")
    ? atob(${vPayload})
    : (typeof Buffer !== "undefined" ? Buffer.from(${vPayload}, "base64").toString("binary") : "");
  var ${vOut} = "";
  for (var ${vI} = 0; ${vI} < ${vDec}.length; ${vI}++) {
    ${vOut} += String.fromCharCode(${vDec}.charCodeAt(${vI}) ^ ${vKey});
  }
  try {
    var ${vRun} = (0, eval);
    ${vRun}(decodeURIComponent(escape(${vOut})));
  } catch (e) {
    console.error("[Tampervault] execution error:", e);
  }
})();`;
}
