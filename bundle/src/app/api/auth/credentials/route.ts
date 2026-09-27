import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashSecret, isValidPin, verifySecret } from "@/lib/auth";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  return NextResponse.json({
    username: user.username,
    hasPin: Boolean(user.pinHash),
    createdAt: user.createdAt,
  });
}

/** POST { currentPassword, newPassword?, newPin? } */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
    if (!currentPassword) {
      return NextResponse.json({ error: "Confirma tu contrasena actual" }, { status: 400 });
    }
    if (!(await verifySecret(currentPassword, user.passwordHash))) {
      return NextResponse.json({ error: "Contrasena actual incorrecta" }, { status: 401 });
    }

    const patch: { passwordHash?: string; pinHash?: string } = {};

    if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
      if (body.newPassword.length < 8) {
        return NextResponse.json(
          { error: "La nueva contrasena debe tener 8+ caracteres" },
          { status: 400 },
        );
      }
      patch.passwordHash = await hashSecret(body.newPassword);
    }

    if (typeof body.newPin === "string" && body.newPin.length > 0) {
      if (!isValidPin(body.newPin)) {
        return NextResponse.json({ error: "El PIN debe tener 6 digitos" }, { status: 400 });
      }
      patch.pinHash = await hashSecret(body.newPin);
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
    }

    await db.update(users).set(patch).where(eq(users.id, user.id));
    return NextResponse.json({ success: true, updated: Object.keys(patch) });
  } catch (error) {
    console.error("[auth/credentials]", error);
    return NextResponse.json({ error: "Error actualizando credenciales" }, { status: 500 });
  }
}
