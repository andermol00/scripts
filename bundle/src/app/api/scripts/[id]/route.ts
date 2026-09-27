import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { fetchRemoteCode, normalizeScriptInput, scriptHash } from "@/lib/scripts";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function load(userId: number, rawId: string) {
  const id = Number.parseInt(rawId, 10);
  if (!Number.isFinite(id)) return null;
  const row = (
    await db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, id), eq(scripts.userId, userId)))
      .limit(1)
  )[0];
  return row ?? null;
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const script = await load(user.id, id);
  if (!script) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ script });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const { id } = await ctx.params;
    const script = await load(user.id, id);
    if (!script) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = normalizeScriptInput({ ...script, ...body });

    let code = input.code;
    if (body.refetchFromSource === true && input.sourceUrl) {
      const remote = await fetchRemoteCode(input.sourceUrl);
      if (!remote.ok) {
        return NextResponse.json({ error: remote.error }, { status: 400 });
      }
      code = remote.code;
    }

    const updated = await db
      .update(scripts)
      .set({ ...input, code, codeHash: scriptHash(code), updatedAt: new Date() })
      .where(eq(scripts.id, script.id))
      .returning();

    return NextResponse.json({ script: updated[0] });
  } catch (error) {
    console.error("[scripts PATCH]", error);
    return NextResponse.json({ error: "No se pudo actualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const script = await load(user.id, id);
  if (!script) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await db.delete(scripts).where(eq(scripts.id, script.id));
  return NextResponse.json({ success: true });
}
