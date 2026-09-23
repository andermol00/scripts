import { db } from "@/db";
import { scripts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { generateSchema } from "@/lib/validation";
import { buildUserscript, scriptFilename } from "@/lib/userscript";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return Response.json({ error: "No autorizado." }, { status: 401 });

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return Response.json({ error: "Id inválido." }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Nivel de ofuscación inválido." },
      { status: 400 },
    );
  }

  const [row] = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, id), eq(scripts.userId, user.id)))
    .limit(1);
  if (!row) return Response.json({ error: "No encontrado." }, { status: 404 });

  try {
    const output = buildUserscript(row, parsed.data.level);
    return Response.json({
      code: output,
      filename: scriptFilename(row.name),
      level: parsed.data.level,
    });
  } catch (error) {
    return Response.json(
      {
        error: `No se pudo generar el script: ${
          error instanceof Error ? error.message : "error desconocido"
        }`,
      },
      { status: 500 },
    );
  }
}
