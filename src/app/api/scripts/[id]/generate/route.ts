import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateSchema } from "@/lib/validation";
import { buildUserscript } from "@/lib/userscript";
import { requireApiAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireApiAuth();
  if (authError) return authError;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Id inválido." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Nivel de ofuscación inválido." }, { status: 400 });
  }

  const [row] = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  if (!row) return NextResponse.json({ error: "No encontrado." }, { status: 404 });

  try {
    const output = buildUserscript(row, parsed.data.level);
    const filename = `${row.name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase() || "script"}.user.js`;
    return NextResponse.json({ code: output, filename });
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudo generar el script: ${error instanceof Error ? error.message : "error desconocido"}` },
      { status: 500 },
    );
  }
}
