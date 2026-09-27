import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "dev-secret-key-min-32-characters-long"
);

export async function createSessionToken(userId: number): Promise<string> {
  const jwt = await new SignJWT({ userId, iat: Date.now() })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(SECRET);

  return jwt;
}

export async function verifySessionToken(
  token: string
): Promise<{ userId: number } | null> {
  try {
    const verified = await jwtVerify(token, SECRET);
    return verified.payload as { userId: number };
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