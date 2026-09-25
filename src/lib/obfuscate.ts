/**
 * Dependency-free JS obfuscator with seeded PRNG.
 *
 * Uses a deterministic pseudo-random number generator (seeded) so that
 * the same source always produces the same obfuscated output.
 *
 * The output is still plain JavaScript that Tampermonkey can execute; this is
 * obfuscation (source hiding), not real encryption.
 */

export type ObfuscationLevel = "strong";

export const OBFUSCATION_LEVELS: ObfuscationLevel[] = ["strong"];

export function isObfuscationLevel(value: unknown): value is ObfuscationLevel {
  return value === "strong";
}

/**
 * Simple seeded PRNG using xorshift algorithm
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed === 0 ? 1 : seed;
  }

  next(): number {
    let x = this.state;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    this.state = x;
    return Math.abs(x) / 0x7fffffff;
  }
}

/**
 * Generate a deterministic seed from the source code
 */
function hashSource(source: string): number {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }
  return Math.abs(hash);
}

function rand(min: number, max: number, rng: SeededRandom): number {
  return Math.floor(rng.next() * (max - min + 1)) + min;
}

function rid(rng: SeededRandom): string {
  const random = Math.floor(rng.next() * 0xffffff).toString(16);
  return "_0x" + random.padStart(6, "0");
}

function strongObfuscate(source: string, rng: SeededRandom): string {
  const base = rand(1, 255, rng);
  const step = rand(1, 127, rng) * 2 + 1; // odd step spreads the key better

  const bytes = Buffer.from(source, "utf-8");
  const xored = Buffer.alloc(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    xored[i] = bytes[i] ^ ((base + i * step) & 0xff);
  }

  // Reverse the byte stream so the payload can't be decoded left-to-right.
  const reversed = Buffer.from(xored).reverse();
  const b64 = reversed.toString("base64");

  const chunkSize = rand(16, 48, rng);
  const chunks: string[] = [];
  for (let i = 0; i < b64.length; i += chunkSize) {
    chunks.push(b64.slice(i, i + chunkSize));
  }
  if (chunks.length === 0) chunks.push("");

  // Shuffle the chunks and store the inverse permutation to reassemble them.
  const order = chunks.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = rand(0, i, rng);
    [order[i], order[j]] = [order[j], order[i]];
  }
  const shuffled = order.map((i) => chunks[i]);
  const inv: number[] = new Array(order.length);
  order.forEach((origIdx, k) => {
    inv[origIdx] = k;
  });

  const vArr = rid(rng);
  const vPerm = rid(rng);
  const vB64 = rid(rng);
  const vJ = rid(rng);
  const vBin = rid(rng);
  const vOut = rid(rng);
  const vI = rid(rng);
  const vSrc = rid(rng);

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

export function obfuscateCode(source: string, level?: ObfuscationLevel): string {
  const seed = hashSource(source);
  const rng = new SeededRandom(seed);
  return strongObfuscate(source, rng);
}
