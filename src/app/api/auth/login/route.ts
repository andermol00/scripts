import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import {
  verifyPassword,
  createSession,
  getClientIp,
  isRateLimited,
  recordAttempt,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const hdrs = await headers();
  const ip = getClientIp(hdrs);

  if (await isRateLimited(ip)) {
    return Response.json(
      {
        error:
          "Demasiados intentos fallidos. Espera 15 minutos antes de volver a intentarlo.",
      },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  const rows = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  const user = rows[0];

  // Always run a hash comparison to avoid user-enumeration timing leaks.
  const ok = user
    ? verifyPassword(password, user.passwordHash)
    : verifyPassword(password, "scrypt$16384$00$00");

  await recordAttempt(ip, username || null, ok);

  if (!user || !ok) {
    return Response.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 },
    );
  }

  await createSession(user.id);
  return Response.json({ ok: true, username: user.username });
}
