import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { userSessions, users } from "@/db/schema";

const SESSION_COOKIE = "scriptvault_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT_OPTIONS = {
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
};

function derivePasswordKey(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, SCRYPT_OPTIONS, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
};

function appSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must contain at least 32 characters.");
  }
  return secret;
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function validatePassword(password: string) {
  if (password.length < 12 || password.length > 200) {
    return "La contraseña debe tener entre 12 y 200 caracteres.";
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "Usa mayúsculas, minúsculas y al menos un número.";
  }
  return null;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString("base64url");
  const derived = await derivePasswordKey(password, salt);
  return { salt, hash: derived.toString("hex") };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const derived = await derivePasswordKey(password, salt);
  const expected = Buffer.from(expectedHash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export function secureHash(value: string) {
  return createHmac("sha256", appSecret()).update(value).digest("hex");
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSession(userId: string) {
  const sessionId = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const rawValue = `${sessionId}.${token}`;
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent")?.slice(0, 500) ?? null;

  await db.insert(userSessions).values({
    id: sessionId,
    userId,
    tokenHash: secureHash(rawValue),
    userAgent,
    expiresAt: new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawValue, cookieOptions());
}

export async function destroySession() {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(SESSION_COOKIE)?.value;

  if (rawValue) {
    await db.delete(userSessions).where(eq(userSessions.tokenHash, secureHash(rawValue)));
  }

  cookieStore.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawValue) return null;

  const [sessionId, token, extra] = rawValue.split(".");
  if (!sessionId || !token || extra || sessionId.length !== 36 || token.length < 40) {
    return null;
  }

  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(userSessions)
    .innerJoin(users, eq(userSessions.userId, users.id))
    .where(
      and(
        eq(userSessions.id, sessionId),
        eq(userSessions.tokenHash, secureHash(rawValue)),
        gt(userSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return record ?? null;
}

export async function assertSameOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

  if (!origin || !host) return;

  try {
    if (new URL(origin).host !== host.split(",")[0].trim()) {
      throw new Error("Invalid request origin");
    }
  } catch {
    throw new Error("Solicitud rechazada por protección CSRF.");
  }
}

export async function getRequestIp() {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0].trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown"
  );
}
