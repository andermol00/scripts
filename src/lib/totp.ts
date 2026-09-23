/**
 * TOTP (RFC 6238) / HOTP (RFC 4226) implemented with node:crypto.
 *
 * Drop-in replacement for the previous `otplib`-based module: same exported
 * names and same argument order, so no extra dependency has to be installed
 * (and nothing can go missing from the lockfile on Render).
 *
 * Compatible with Google Authenticator / Authy / 1Password: SHA-1, 30s step,
 * 6 digits, base32 secret.
 */
import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const STEP_SECONDS = 30;
const WINDOW = 1; // ±1 periodo de tolerancia por deriva de reloj
const DIGITS = 6;
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input
    .replace(/=+$/g, "")
    .replace(/\s+/g, "")
    .toUpperCase();

  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx < 0) throw new Error(`Carácter base32 inválido: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** HOTP core: dynamic truncation of an HMAC-SHA1 over an 8-byte counter. */
function hotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(buf).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** DIGITS).padStart(DIGITS, "0");
}

function counterAt(timestampMs: number): number {
  return Math.floor(timestampMs / 1000 / STEP_SECONDS);
}

/** Código de 6 dígitos vigente para `secret`. */
export function currentTotp(secret: string, atMs: number = Date.now()): string {
  return hotp(base32Decode(secret), counterAt(atMs));
}

/**
 * Verifica un token con ±1 periodo de tolerancia, en tiempo constante.
 * Nota: el orden de argumentos es (token, secret), igual que antes.
 */
export function verifyTotp(token: string, secret: string): boolean {
  const clean = String(token ?? "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(clean)) return false;

  let key: Buffer;
  try {
    key = base32Decode(String(secret ?? ""));
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const counter = counterAt(Date.now());
  const provided = Buffer.from(clean);
  for (let delta = -WINDOW; delta <= WINDOW; delta++) {
    const candidate = Buffer.from(hotp(key, counter + delta));
    if (
      candidate.length === provided.length &&
      timingSafeEqual(candidate, provided)
    ) {
      return true;
    }
  }
  return false;
}

/** Secreto base32 de 20 bytes (32 caracteres), como generaba otplib. */
export function generateTotpSecret(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

/** URI otpauth:// para mostrar como QR en el autenticador. */
export function buildOtpAuthUrl(
  username: string,
  secret: string,
  issuer = "TM Vault",
): string {
  const label = `${issuer}:${username}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
