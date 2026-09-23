/**
 * Dependency-free JS obfuscator with three levels.
 *
 *  - none   → the source is returned untouched (readable output)
 *  - basic  → single XOR key + Base64 + self-decoding loader
 *  - strong → rotating XOR key + byte reversal + Base64 + chunk permutation
 *             + hex-style identifiers
 *
 * The output is still plain JavaScript that Tampermonkey can execute; this is
 * obfuscation (source hiding), not real encryption.
 */

export type ObfuscationLevel = "none" | "basic" | "strong";

export const OBFUSCATION_LEVELS: ObfuscationLevel[] = [
  "none",
  "basic",
  "strong",
];

export function isObfuscationLevel(value: unknown): value is ObfuscationLevel {
  return (
    value === "none" || value === "basic" || value === "strong"
  );
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rid(): string {
  return "_0x" + Math.random().toString(16).slice(2, 8);
}

function basicObfuscate(source: string): string {
  const key = rand(20, 219);

  const xored = Array.from(Buffer.from(source, "utf-8"))
    .map((b) => String.fromCharCode(b ^ key))
    .join("");

  const payload = Buffer.from(xored, "latin1").toString("base64");

  const vPayload = rid();
  const vKey = rid();
  const vDec = rid();
  const vI = rid();
  const vOut = rid();

  return `/* Obfuscated by Tampervault (basic). Do not edit the block below. */
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
    (0, eval)(decodeURIComponent(escape(${vOut})));
  } catch (e) {
    console.error("[Tampervault] execution error:", e);
  }
})();`;
}

function strongObfuscate(source: string): string {
  const base = rand(1, 255);
  const step = rand(1, 127) * 2 + 1; // odd step spreads the key better

  const bytes = Buffer.from(source, "utf-8");
  const xored = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    xored[i] = bytes[i] ^ ((base + i * step) & 0xff);
  }

  // Reverse the byte stream so the payload can't be decoded left-to-right.
  const reversed = Buffer.from(xored).reverse();
  const b64 = reversed.toString("base64");

  const chunkSize = rand(16, 48);
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += chunkSize) {
    chunks.push(b64.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push("");

  // Shuffle the chunks and store the inverse permutation to reassemble them.
  const order = chunks.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const shuffled = order.map((i) => chunks[i]);
  const inv: number[] = new Array(order.length);
  order.forEach((origIdx, k) => {
    inv[origIdx] = k;
  });

  const vArr = rid();
  const vPerm = rid();
  const vB64 = rid();
  const vJ = rid();
  const vBin = rid();
  const vOut = rid();
  const vI = rid();
  const vSrc = rid();

  return `/* Obfuscated by Tampervault (strong). Do not edit the block below. */
(function(){
  var ${vArr} = ${JSON.stringify(shuffled)};
  var ${vPerm} = ${JSON.stringify(inv)};
  var ${vB64} = "";
  for (var ${vJ} = 0; ${vJ} < ${vPerm}.length; ${vJ}++) {
    ${vB64} += ${vArr}[${vPerm}[${vJ}]];
  }
  var ${vBin};
  try {
    ${vBin} = atob(${vB64});
  } catch (e) {
    ${vBin} = (typeof Buffer !== "undefined")
      ? Buffer.from(${vB64}, "base64").toString("binary")
      : "";
  }
  var ${vOut} = new Array(${vBin}.length);
  for (var ${vI} = 0; ${vI} < ${vBin}.length; ${vI}++) {
    var ${vJ} = ${vBin}.length - 1 - ${vI};
    ${vOut}[${vJ}] = String.fromCharCode(
      ${vBin}.charCodeAt(${vI}) ^ ((${base} + ${vJ} * ${step}) & 255)
    );
  }
  var ${vSrc} = ${vOut}.join("");
  try {
    ${vSrc} = decodeURIComponent(escape(${vSrc}));
  } catch (e) { /* keep raw */ }
  try {
    (0, eval)(${vSrc});
  } catch (e) {
    console.error("[Tampervault] execution error:", e);
  }
})();`;
}

export function obfuscateCode(
  source: string,
  level: ObfuscationLevel = "basic",
): string {
  if (level === "none") return source;
  return level === "strong" ? strongObfuscate(source) : basicObfuscate(source);
}
