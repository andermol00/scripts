import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { scriptInputSchema } from "@/lib/validation";
import { requireApiAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

function parseId(idParam: string) {
  const id = Number(idParam);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireApiAuth();
  if (authError) return authError;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const [row] = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  return NextResponse.json({ script: row });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireApiAuth();
  if (authError) return authError;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const body = await request.json().catch(() => null);
  const parsed = scriptInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [row] = await db
    .update(scripts)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(scripts.id, id))
    .returning();

  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  return NextResponse.json({ script: row });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireApiAuth();
  if (authError) return authError;

  const { id: idParam } = await params;
  const id = parseId(idParam);
  if (!id) return NextResponse.json({ error: "Id inválido." }, { status: 400 });

  const [row] = await db.delete(scripts).where(eq(scripts.id, id)).returning();
  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
