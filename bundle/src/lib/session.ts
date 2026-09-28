import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { and, eq, gt, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { generateToken, sha256 } from "@/lib/auth";

export const SESSION_COOKIE = "tv_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

export async function createSession(
  userId: number,
  meta: { ip?: string; userAgent?: string } = {},
): Promise<string> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    tokenHash: sha256(token),
    userId,
    ip: meta.ip ?? "unknown",
    userAgent: meta.userAgent ?? "unknown",
    expiresAt,
  });

  // Limpieza oportunista de sesiones caducadas.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  return token;
}

export function setSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())),
    )
    .limit(1);

  return rows[0]?.user ?? null;
}

export async function destroyCurrentSession(): Promise<void> {
  const token = await getSessionToken();
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}

export async function countActiveSessions(userId: number): Promise<number> {
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), or(gt(sessions.expiresAt, new Date()))),
    );
  return rows.length;
}
