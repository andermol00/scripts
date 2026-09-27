import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import {
  fetchRemoteCode,
  normalizeScriptInput,
  publicScript,
  scriptHash,
} from "@/lib/scripts";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(scripts)
    .where(eq(scripts.userId, user.id))
    .orderBy(desc(scripts.updatedAt));

  return NextResponse.json({ scripts: rows.map(publicScript) });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const input = normalizeScriptInput(body);

    if (!input.name.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }

    let code = input.code;
    if (!code.trim() && input.sourceUrl) {
      const remote = await fetchRemoteCode(input.sourceUrl);
      if (!remote.ok) {
        return NextResponse.json(
          { error: `No se pudo importar: ${remote.error}` },
          { status: 400 },
        );
      }
      code = remote.code;
    }

    const inserted = await db
      .insert(scripts)
      .values({
        ...input,
        userId: user.id,
        code,
        codeHash: scriptHash(code),
      })
      .returning();

    return NextResponse.json(
      { script: publicScript(inserted[0]) },
      { status: 201 },
    );
  } catch (error) {
    console.error("[scripts POST]", error);
    return NextResponse.json({ error: "No se pudo crear el script" }, { status: 500 });
  }
}
