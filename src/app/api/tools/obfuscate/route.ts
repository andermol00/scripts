import { NextRequest, NextResponse } from "next/server";
import { obfuscateToolSchema } from "@/lib/validation";
import { obfuscateCode } from "@/lib/obfuscate";
import { requireApiAuth } from "@/lib/auth-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authError = await requireApiAuth();
  if (authError) return authError;

  const body = await request.json().catch(() => null);
  const parsed = obfuscateToolSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  try {
    const output = obfuscateCode(parsed.data.code, parsed.data.level);
    return NextResponse.json({ code: output });
  } catch (error) {
    return NextResponse.json(
      { error: `No se pudo procesar el código: ${error instanceof Error ? error.message : "error desconocido"}` },
      { status: 500 },
    );
  }
}
