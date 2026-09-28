import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

type ScryptOptions = { N: number; r: number; p: number };

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

const SCRYPT_N = 16384;
const KEY_LENGTH = 64;

/**
 * Hash a secret (password or PIN) with scrypt.
 * Format: scrypt$<N>$<salt-hex>$<hash-hex>
 */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scrypt(secret, salt, KEY_LENGTH, {
    N: SCRYPT_N,
    r: 8,
    p: 1,
  });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export async function verifySecret(
  secret: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length < 4) return false;

  const n = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(n) || n <= 0) return false;

  try {
    const salt = Buffer.from(parts[2], "hex");
    const expected = Buffer.from(parts[3], "hex");
    const derived = await scrypt(secret, salt, expected.length, {
      N: n,
      r: 8,
      p: 1,
    });
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{6}$/.test(pin);
}

export function normalizeIp(header: string | null): string {
  if (!header) return "unknown";
  const first = header.split(",")[0]?.trim();
  return first && first.length > 0 ? first : "unknown";
}
