import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { loginEvents, pinAttempts, users } from "@/db/schema";
import { isValidPin, normalizeIp, verifySecret } from "@/lib/auth";
import { createSession, setSessionCookie } from "@/lib/session";
import { ensureSeed } from "@/db/seed";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 5;
const PASSWORD_WINDOW_MINUTES = 10;

export async function POST(req: NextRequest) {
  try {
    await ensureSeed();

    const body = (await req.json().catch(() => ({}))) as {
      pin?: unknown;
      requirePassword?: unknown;
      password?: unknown;
    };

    const pin = body.pin;
    const requirePassword = body.requirePassword === true;
    const password = typeof body.password === "string" ? body.password : "";
    const ip = normalizeIp(req.headers.get("x-forwarded-for"));
    const userAgent = req.headers.get("user-agent") ?? "unknown";

    if (!isValidPin(pin)) {
      return NextResponse.json(
        { error: "El PIN debe tener exactamente 6 digitos" },
        { status: 400 },
      );
    }

    const user = (await db.select().from(users).limit(1))[0];
    if (!user || !user.pinHash) {
      return NextResponse.json({ error: "No hay PIN configurado" }, { status: 400 });
    }

    const blockRecord = (
      await db
        .select()
        .from(pinAttempts)
        .where(and(eq(pinAttempts.userId, user.id), eq(pinAttempts.ip, ip)))
        .limit(1)
    )[0];

    const now = new Date();

    if (blockRecord?.lockedUntil && blockRecord.lockedUntil > now) {
      const unlockTime = Math.ceil(
        (blockRecord.lockedUntil.getTime() - now.getTime()) / 1000,
      );
      await logEvent(user.username, false, "locked");
      return NextResponse.json(
        {
          error: `Demasiados intentos. Bloqueado ${unlockTime}s`,
          requiresPassword: true,
          unlockTime,
        },
        { status: 429 },
      );
    }

    if (blockRecord?.passwordRequiredAt && blockRecord.passwordRequiredAt > now) {
      if (!requirePassword) {
        return NextResponse.json(
          { error: "Se requiere contrasena despues del bloqueo", requiresPassword: true },
          { status: 429 },
        );
      }
      if (!password) {
        return NextResponse.json({ error: "Contrasena requerida" }, { status: 400 });
      }

      const passwordOk = await verifySecret(password, user.passwordHash);
      if (!passwordOk) {
        await db
          .update(pinAttempts)
          .set({ attempts: (blockRecord.attempts ?? 0) + 1 })
          .where(eq(pinAttempts.id, blockRecord.id));
        await logEvent(user.username, false, "bad-password-recovery");
        return NextResponse.json({ error: "Contrasena incorrecta" }, { status: 401 });
      }

      await resetBlock(blockRecord.id);
      await logEvent(user.username, true, "password-recovery");
      return startSession(user.id, ip, userAgent, "Acceso concedido con contrasena");
    }

    const pinOk = await verifySecret(pin, user.pinHash);

    if (!pinOk) {
      const attempts = (blockRecord?.attempts ?? 0) + 1;
      const shouldLock = attempts >= MAX_ATTEMPTS;

      if (blockRecord) {
        await db
          .update(pinAttempts)
          .set({
            attempts,
            lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null,
            passwordRequiredAt: shouldLock
              ? new Date(now.getTime() + PASSWORD_WINDOW_MINUTES * 60_000)
              : null,
          })
          .where(eq(pinAttempts.id, blockRecord.id));
      } else {
        await db.insert(pinAttempts).values({
          userId: user.id,
          ip,
          attempts,
          lockedUntil: shouldLock ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null,
          passwordRequiredAt: shouldLock
            ? new Date(now.getTime() + PASSWORD_WINDOW_MINUTES * 60_000)
            : null,
        });
      }

      await logEvent(user.username, false, shouldLock ? "locked-out" : "bad-pin");

      if (shouldLock) {
        return NextResponse.json(
          {
            error: `PIN incorrecto. Bloqueado por ${LOCK_MINUTES} minutos.`,
            requiresPassword: true,
            unlockTime: LOCK_MINUTES * 60,
          },
          { status: 429 },
        );
      }

      const remaining = Math.max(0, MAX_ATTEMPTS - attempts);
      return NextResponse.json(
        {
          error: `PIN incorrecto. Intentos restantes: ${remaining}`,
          attemptsRemaining: remaining,
        },
        { status: 401 },
      );
    }

    if (blockRecord) await resetBlock(blockRecord.id);
    await logEvent(user.username, true, "pin");
    return startSession(user.id, ip, userAgent, "PIN valido");
  } catch (error) {
    console.error("[auth/pin]", error);
    return NextResponse.json({ error: "Error en autenticacion" }, { status: 500 });
  }
}

async function startSession(
  userId: number,
  ip: string,
  userAgent: string,
  message: string,
): Promise<NextResponse> {
  const token = await createSession(userId, { ip, userAgent });
  const response = NextResponse.json({ success: true, message });
  setSessionCookie(response, token);
  return response;
}

async function resetBlock(id: number): Promise<void> {
  await db
    .update(pinAttempts)
    .set({ attempts: 0, lockedUntil: null, passwordRequiredAt: null })
    .where(eq(pinAttempts.id, id));
}

async function logEvent(
  identifier: string,
  success: boolean,
  reason: string,
): Promise<void> {
  try {
    await db.insert(loginEvents).values({ identifier, success, reason });
  } catch (error) {
    console.error("[auth/pin] logEvent", error);
  }
}
