import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, pinAttempts } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createSessionToken, setSessionCookie } from "@/lib/session";

const scryptAsync = promisify(scrypt);

export async function POST(req: NextRequest) {
  try {
    const { pin, requirePassword = false, password } = await req.json();
    const ip = req.headers.get("x-forwarded-for") || "unknown";

    if (!pin || pin.length !== 6 || !/^\d+$/.test(pin)) {
      return NextResponse.json(
        { error: "PIN debe ser 6 dígitos" },
        { status: 400 }
      );
    }

    // Obtener el usuario (single-tenant)
    const user = await db.query.users.findFirst();
    if (!user || !user.pinHash) {
      return NextResponse.json(
        { error: "PIN no configurado" },
        { status: 400 }
      );
    }

    // Verificar bloqueo anterior
    const blockRecord = await db.query.pinAttempts.findFirst({
      where: and(eq(pinAttempts.userId, user.id), eq(pinAttempts.ip, ip)),
    });

    if (blockRecord) {
      const now = new Date();

      // Si está bloqueado, verificar si necesita contraseña
      if (blockRecord.lockedUntil && blockRecord.lockedUntil > now) {
        const timeLeft = Math.ceil(
          (blockRecord.lockedUntil.getTime() - now.getTime()) / 1000
        );
        return NextResponse.json(
          {
            error: "Bloqueado por intentos fallidos",
            requiresPassword: true,
            unlockTime: timeLeft,
          },
          { status: 429 }
        );
      }

      // Si pasaron 5 min desde el bloqueo, pedir contraseña
      if (
        blockRecord.passwordRequiredAt &&
        blockRecord.passwordRequiredAt > now
      ) {
        if (!requirePassword) {
          return NextResponse.json(
            {
              error: "Se requiere contraseña después de bloqueo",
              requiresPassword: true,
            },
            { status: 429 }
          );
        }

        // Verificar contraseña
        if (!password) {
          return NextResponse.json(
            { error: "Contraseña requerida" },
            { status: 400 }
          );
        }

        // Validar contraseña
        const isValidPassword = await verifyPassword(password, user.passwordHash);
        if (!isValidPassword) {
          await db
            .update(pinAttempts)
            .set({ attempts: blockRecord.attempts + 1 })
            .where(eq(pinAttempts.id, blockRecord.id));

          return NextResponse.json(
            { error: "Contraseña incorrecta" },
            { status: 401 }
          );
        }

        // Contraseña correcta: resetear intentos
        await db
          .update(pinAttempts)
          .set({
            attempts: 0,
            lockedUntil: null,
            passwordRequiredAt: null,
          })
          .where(eq(pinAttempts.id, blockRecord.id));
      }
    }

    // Verificar PIN
    const pinParts = user.pinHash.split("$");
    if (pinParts.length < 3) {
      return NextResponse.json(
        { error: "Error en validación de PIN" },
        { status: 500 }
      );
    }

    const n = parseInt(pinParts[1], 10);
    const salt = Buffer.from(pinParts[2], "hex");
    const expectedHash = pinParts[3];

    const derivedKey = (await scryptAsync(pin, salt, 64, {
      N: n,
    })) as Buffer;
    const derivedHex = derivedKey.toString("hex");

    let pinMatch = false;
    try {
      pinMatch = timingSafeEqual(
        Buffer.from(derivedHex),
        Buffer.from(expectedHash)
      );
    } catch {
      pinMatch = false;
    }

    if (!pinMatch) {
      // Incrementar intentos
      let newAttempts = 1;
      let newLockedUntil = null;
      let newPasswordRequired = null;

      if (blockRecord) {
        newAttempts = blockRecord.attempts + 1;

        if (newAttempts >= 3) {
          // Bloquear por 5 minutos
          const now = new Date();
          newLockedUntil = new Date(now.getTime() + 5 * 60 * 1000);
          // Después de 5 min, pedir contraseña por 5 min más
          newPasswordRequired = new Date(now.getTime() + 10 * 60 * 1000);

          // Resetear contador después de desbloquearse
          setTimeout(() => {
            db.update(pinAttempts)
              .set({ attempts: 0, lockedUntil: null })
              .where(eq(pinAttempts.id, blockRecord.id))
              .catch(() => {});
          }, 5 * 60 * 1000);
        }

        await db
          .update(pinAttempts)
          .set({
            attempts: newAttempts,
            lockedUntil: newLockedUntil,
            passwordRequiredAt: newPasswordRequired,
          })
          .where(eq(pinAttempts.id, blockRecord.id));
      } else {
        await db.insert(pinAttempts).values({
          userId: user.id,
          ip,
          attempts: 1,
        });
      }

      const intentosRestantes = 3 - newAttempts;
      return NextResponse.json(
        {
          error: `PIN incorrecto. Intentos restantes: ${Math.max(0, intentosRestantes)}`,
          attemptsRemaining: Math.max(0, intentosRestantes),
        },
        { status: 401 }
      );
    }

    // PIN correcto: crear sesión
    const token = await createSessionToken(user.id);
    const response = NextResponse.json({
      success: true,
      message: "PIN válido",
    });

    setSessionCookie(response, token);

    // Resetear intentos
    if (blockRecord) {
      await db
        .update(pinAttempts)
        .set({
          attempts: 0,
          lockedUntil: null,
          passwordRequiredAt: null,
        })
        .where(eq(pinAttempts.id, blockRecord.id));
    }

    return response;
  } catch (error) {
    console.error("PIN auth error:", error);
    return NextResponse.json(
      { error: "Error en autenticación" },
      { status: 500 }
    );
  }
}

// Helper para verificar contraseña (reutilizar de auth existente)
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const parts = hash.split("$");
  if (parts.length < 3) return false;

  const n = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], "hex");
  const expectedHash = parts[3];

  try {
    const derived = (await scryptAsync(password, salt, 64, {
      N: n,
    })) as Buffer;
    return timingSafeEqual(
      Buffer.from(derived.toString("hex")),
      Buffer.from(expectedHash)
    );
  } catch {
    return false;
  }
}
