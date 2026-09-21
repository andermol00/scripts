import { db } from "@/db";
import { users } from "@/db/schema";
import { countUsers, hashPassword, createSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const total = await countUsers();
  if (total > 0) {
    return Response.json(
      { error: "El sistema ya está configurado." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  if (username.length < 4) {
    return Response.json(
      { error: "El usuario debe tener al menos 4 caracteres." },
      { status: 400 },
    );
  }
  if (password.length < 12) {
    return Response.json(
      { error: "La contraseña debe tener al menos 12 caracteres." },
      { status: 400 },
    );
  }
  const strong =
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password);
  if (!strong) {
    return Response.json(
      {
        error:
          "La contraseña debe incluir mayúsculas, minúsculas, números y un símbolo.",
      },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(users)
    .values({ username, passwordHash: hashPassword(password) })
    .returning();

  await createSession(created.id);
  return Response.json({ ok: true, username: created.username });
}
