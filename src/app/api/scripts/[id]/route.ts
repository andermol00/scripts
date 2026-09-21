import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

function normList(v: unknown): string {
  if (Array.isArray(v)) {
    return JSON.stringify(v.filter((x) => typeof x === "string" && x.trim()));
  }
  if (typeof v === "string") {
    const arr = v
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return JSON.stringify(arr);
  }
  return "[]";
}

async function owned(userId: number, id: number) {
  const rows = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, id), eq(scripts.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const script = await owned(user.id, Number(id));
  if (!script) return Response.json({ error: "No encontrado" }, { status: 404 });
  return Response.json({ script });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const existing = await owned(user.id, Number(id));
  if (!existing)
    return Response.json({ error: "No encontrado" }, { status: 404 });

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? existing.name).trim();
  if (!name) {
    return Response.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const [updated] = await db
    .update(scripts)
    .set({
      name,
      namespace: String(b?.namespace ?? existing.namespace),
      version: String(b?.version ?? existing.version),
      description: String(b?.description ?? existing.description),
      author: String(b?.author ?? existing.author),
      matches: normList(b?.matches),
      grants: normList(b?.grants),
      runAt: String(b?.runAt ?? existing.runAt),
      code: String(b?.code ?? existing.code),
      obfuscate: Boolean(b?.obfuscate),
      updatedAt: new Date(),
    })
    .where(eq(scripts.id, existing.id))
    .returning();

  return Response.json({ script: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;
  const existing = await owned(user.id, Number(id));
  if (!existing)
    return Response.json({ error: "No encontrado" }, { status: 404 });
  await db.delete(scripts).where(eq(scripts.id, existing.id));
  return Response.json({ ok: true });
}
