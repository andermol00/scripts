import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { desc } from "drizzle-orm";
import { scriptInputSchema } from "@/lib/validation";
import { requireApiAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireApiAuth();
  if (authError) return authError;

  const rows = await db
    .select({
      id: scripts.id,
      name: scripts.name,
      description: scripts.description,
      version: scripts.version,
      matches: scripts.matches,
      obfuscateByDefault: scripts.obfuscateByDefault,
      updatedAt: scripts.updatedAt,
      createdAt: scripts.createdAt,
    })
    .from(scripts)
    .orderBy(desc(scripts.updatedAt));

  return NextResponse.json({ scripts: rows });
}

export async function POST(request: NextRequest) {
  const authError = await requireApiAuth();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = scriptInputSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Datos inválidos.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const [row] = await db.insert(scripts).values(parsed.data).returning();

  return NextResponse.json({ script: row }, { status: 201 });
}
