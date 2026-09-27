import { createHmac, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SECRET = process.env.SESSION_SECRET || "dev-secret-key-min-32-characters-long";

export function createSessionToken(userId: number): string {
  const timestamp = Date.now();
  const random = randomBytes(16).toString("hex");
  const data = `${userId}.${timestamp}.${random}`;
  const signature = createHmac("sha256", SECRET)
    .update(data)
    .digest("hex");
  return `${data}.${signature}`;
}

export function verifySessionToken(token: string): { userId: number } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 4) return null;

    const [userIdStr, timestamp, random, signature] = parts;
    const data = `${userIdStr}.${timestamp}.${random}`;
    const expectedSignature = createHmac("sha256", SECRET)
      .update(data)
      .digest("hex");

    if (signature !== expectedSignature) return null;

    const ts = parseInt(timestamp, 10);
    if (Date.now() - ts > 12 * 60 * 60 * 1000) return null;

    return { userId: parseInt(userIdStr, 10) };
  } catch {
    return null;
  }
}

export function setSessionCookie(
  response: NextResponse,
  token: string
): void {
  response.cookies.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 43200,
    path: "/",
  });
}

export async function getSessionFromCookie(): Promise<{
  userId: number;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token);
}
