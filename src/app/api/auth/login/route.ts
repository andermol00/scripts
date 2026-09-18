import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getAdminConfig } from "@/lib/env";
import { verifyTotp } from "@/lib/totp";
import {
  buildIdentifier,
  getClientIp,
  getLockStatus,
  recordLoginEvent,
  registerFailure,
  resetAttempts,
} from "@/lib/rate-limit";
import { createSessionToken, setSessionCookie } from "@/lib/session";

export const dynamic = "force-dynamic";

const loginSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(500),
  totp: z.string().min(6).max(10),
});

function timingSafeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return nodeTimingSafeEqual(aBuf, bBuf);
}

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  // Constant baseline delay to reduce timing side-channels regardless of
  // which validation step fails.
  const started = Date.now();

  const adminConfig = getAdminConfig();
  const ip = getClientIp(request.headers);

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!adminConfig) {
    return NextResponse.json(
      {
        error:
          "El acceso todavía no está configurado. Ejecuta `npm run setup:admin` en el servidor para generar las credenciales.",
      },
      { status: 503 },
    );
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Datos de acceso inválidos." }, { status: 400 });
  }

  const { username, password, totp } = parsed.data;
  const identifier = buildIdentifier(ip, username);

  const lock = await getLockStatus(identifier);
  if (lock.locked) {
    await recordLoginEvent(identifier, false, "locked");
    return NextResponse.json(
      {
        error: `Demasiados intentos fallidos. Vuelve a intentarlo en ${Math.ceil(
          lock.retryAfterSeconds / 60,
        )} minuto(s).`,
      },
      { status: 429 },
    );
  }

  const usernameOk = timingSafeEqual(username, adminConfig.username);
  const passwordOk = await bcrypt.compare(password, adminConfig.passwordHash);
  const totpOk = verifyTotp(totp, adminConfig.totpSecret);

  const allOk = usernameOk && passwordOk && totpOk;

  // Normalize response time so failure reason cannot be inferred by timing.
  const elapsed = Date.now() - started;
  if (elapsed < 350) {
    await delay(350 - elapsed);
  }

  if (!allOk) {
    const { attempts, lockedUntil } = await registerFailure(identifier);
    await recordLoginEvent(identifier, false, "invalid_credentials");
    if (lockedUntil) {
      const minutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      return NextResponse.json(
        {
          error: `Demasiados intentos fallidos. Cuenta bloqueada temporalmente durante ${minutes} minuto(s).`,
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "Usuario, contraseña o código de verificación incorrectos.", attempts },
      { status: 401 },
    );
  }

  await resetAttempts(identifier);
  await recordLoginEvent(identifier, true, "ok");

  const token = await createSessionToken(adminConfig.username, adminConfig.authSecret);
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
