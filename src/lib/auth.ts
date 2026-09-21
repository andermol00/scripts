import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
  createHmac,
} from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { users, sessions, loginAttempts } from "@/db/schema";
import { eq, and, gt, desc, sql } from "drizzle-orm";
import type { User } from "@/db/schema";

const SCRYPT_N = 16384;
const SESSION_COOKIE = "tm_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

function getSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.DATABASE_URL ||
    "insecure-dev-secret-change-me"
  );
}

/** Hash a password using scrypt with a random salt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, { N: SCRYPT_N });
  return `scrypt$${SCRYPT_N}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

/** Verify a password against a stored scrypt hash (timing-safe). */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, nStr, saltHex, hashHex] = stored.split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const derived = scryptSync(password, salt, expected.length, {
      N: parseInt(nStr, 10),
    });
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Create a raw session token and a stored (hashed + signed) form. */
function makeToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

/** Sign the cookie value so it can't be forged without the secret. */
function signCookie(raw: string): string {
  const sig = createHmac("sha256", getSecret()).update(raw).digest("hex");
  return `${raw}.${sig}`;
}

function verifyCookie(value: string): string | null {
  const idx = value.lastIndexOf(".");
  if (idx < 0) return null;
  const raw = value.slice(0, idx);
  const sig = value.slice(idx + 1);
  const expected = createHmac("sha256", getSecret()).update(raw).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return raw;
}

export async function createSession(userId: number): Promise<void> {
  const { raw, hash } = makeToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  const hdrs = await headers();
  await db.insert(sessions).values({
    tokenHash: hash,
    userId,
    userAgent: hdrs.get("user-agent") ?? null,
    ip: getClientIp(hdrs),
    expiresAt,
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, signCookie(raw), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (value) {
    const raw = verifyCookie(value);
    if (raw) {
      const hash = createHash("sha256").update(raw).digest("hex");
      await db.delete(sessions).where(eq(sessions.tokenHash, hash));
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  const raw = verifyCookie(value);
  if (!raw) return null;
  const hash = createHash("sha256").update(raw).digest("hex");
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hash), gt(sessions.expiresAt, new Date())))
    .limit(1);
  const session = rows[0];
  if (!session) return null;
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  return userRows[0] ?? null;
}

export function getClientIp(hdrs: Headers): string {
  const fwd = hdrs.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return hdrs.get("x-real-ip") ?? "unknown";
}

export async function countUsers(): Promise<number> {
  const rows = await db.select({ c: sql<number>`count(*)` }).from(users);
  return Number(rows[0]?.c ?? 0);
}

/** Rate limiting: max 5 failed attempts per IP in 15 minutes. */
export async function isRateLimited(ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 1000 * 60 * 15);
  const rows = await db
    .select({ c: sql<number>`count(*)` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since),
      ),
    );
  return Number(rows[0]?.c ?? 0) >= 5;
}

export async function recordAttempt(
  ip: string,
  username: string | null,
  success: boolean,
): Promise<void> {
  await db.insert(loginAttempts).values({ ip, username, success });
}

export async function getSessions(userId: number) {
  return db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt));
}
