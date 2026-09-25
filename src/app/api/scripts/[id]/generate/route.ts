import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { generateSchema } from "@/lib/validation";
import { buildUserscript } from "@/lib/userscript";
import { eq, and } from "drizzle-orm";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scriptId = parseInt(params.id);
  const body = await req.json();
  const { level } = generateSchema.parse(body);

  const script = await db.query.scripts.findFirst({
    where: (t) =>
      and(eq(t.id, scriptId), eq(t.userId, session.userId)),
  });

  if (!script) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // ✨ AUTO-UPDATE: Pasar baseUrl desde variable de entorno
  const baseUrl = process.env.TAMPERVAULT_PUBLIC_URL;
  const code = buildUserscript(script, level, baseUrl);

  return Response.json({ code });
}
