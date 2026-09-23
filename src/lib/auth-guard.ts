import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { User } from "@/db/schema";

/**
 * Server-side auth guard used by protected page layouts and API routes.
 *
 * Backed by the DB-session implementation in `@/lib/auth` (scrypt password
 * hashes + HMAC-signed httpOnly cookie + rows in the `sessions` table), so it
 * shares the exact same session that `/api/auth/login` creates. There is no
 * second token format to keep in sync and no extra env var required.
 *
 * Drop-in replacement for the previous jose/JWT version: it keeps the same
 * exported names and signatures (`getAuthenticatedUser`, `requireApiAuth`).
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

/**
 * Returns a 401 response when there is no valid session, or `null` when the
 * request is authenticated:
 *
 *   const authError = await requireApiAuth();
 *   if (authError) return authError;
 */
export async function requireApiAuth(): Promise<NextResponse | null> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  return null;
}

/** Same check, for server components that prefer the user object. */
export async function requireUser(): Promise<User | null> {
  return getAuthenticatedUser();
}
