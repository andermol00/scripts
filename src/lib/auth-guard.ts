import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";

/**
 * Independent, server-side session check used by every protected page
 * layout and API route. This does not rely on the edge proxy — it re-reads
 * and re-verifies the signed session cookie on the Node.js runtime, so
 * access control still holds even if the proxy layer were ever bypassed.
 */
export async function getAuthenticatedUser(): Promise<string | null> {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) return null;
  return getCurrentUser(authSecret);
}

export async function requireApiAuth(): Promise<NextResponse | null> {
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret) {
    return NextResponse.json(
      { error: "El acceso no está configurado en el servidor." },
      { status: 503 },
    );
  }

  const user = await getCurrentUser(authSecret);
  if (!user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  return null;
}
