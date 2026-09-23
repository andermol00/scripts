import { getCurrentUser } from "@/lib/auth";
import { obfuscateToolSchema } from "@/lib/validation";
import { obfuscateCode } from "@/lib/obfuscate";

export const dynamic = "force-dynamic";

/** Ofuscador rápido: no guarda nada, solo devuelve el código transformado. */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "No autorizado." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = obfuscateToolSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Código o nivel inválido." },
      { status: 400 },
    );
  }

  try {
    const code = obfuscateCode(parsed.data.code, parsed.data.level);
    return Response.json({ code, level: parsed.data.level });
  } catch (error) {
    return Response.json(
      {
        error: `No se pudo ofuscar: ${
          error instanceof Error ? error.message : "error desconocido"
        }`,
      },
      { status: 500 },
    );
  }
}
