import { db } from "@/db";
import { loginAttempts, loginEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "node:crypto";

const MAX_FREE_ATTEMPTS = 5;
const MAX_LOCK_MINUTES = 60;

function hashIdentifier(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export function buildIdentifier(ip: string, username: string) {
  return hashIdentifier(`${ip.toLowerCase()}::${username.toLowerCase()}`);
}

export async function getLockStatus(identifier: string) {
  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.identifier, identifier))
    .limit(1);

  if (!row) return { locked: false, retryAfterSeconds: 0, attempts: 0 };

  if (row.lockedUntil && row.lockedUntil.getTime() > Date.now()) {
    const retryAfterSeconds = Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000);
    return { locked: true, retryAfterSeconds, attempts: row.attempts };
  }

  return { locked: false, retryAfterSeconds: 0, attempts: row.attempts };
}

export async function registerFailure(identifier: string) {
  const [row] = await db
    .select()
    .from(loginAttempts)
    .where(eq(loginAttempts.identifier, identifier))
    .limit(1);

  const attempts = (row?.attempts ?? 0) + 1;
  let lockedUntil: Date | null = null;

  if (attempts >= MAX_FREE_ATTEMPTS) {
    const lockMinutes = Math.min(2 ** (attempts - MAX_FREE_ATTEMPTS), MAX_LOCK_MINUTES);
    lockedUntil = new Date(Date.now() + lockMinutes * 60_000);
  }

  if (row) {
    await db
      .update(loginAttempts)
      .set({ attempts, lastAttemptAt: new Date(), lockedUntil })
      .where(eq(loginAttempts.identifier, identifier));
  } else {
    await db.insert(loginAttempts).values({ identifier, attempts, lockedUntil });
  }

  return { attempts, lockedUntil };
}

export async function resetAttempts(identifier: string) {
  await db.delete(loginAttempts).where(eq(loginAttempts.identifier, identifier));
}

export async function recordLoginEvent(identifier: string, success: boolean, reason: string) {
  await db.insert(loginEvents).values({ identifier, success, reason });
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
