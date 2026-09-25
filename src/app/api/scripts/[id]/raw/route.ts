import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { buildUserscript, scriptFilename } from "@/lib/userscript";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scriptId = parseInt(params.id);

  const script = await db.query.scripts.findFirst({
    where: (t) =>
      and(eq(t.id, scriptId), eq(t.userId, session.userId)),
  });

  if (!script) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // ✨ AUTO-UPDATE: Pasar baseUrl desde variable de entorno
  const baseUrl = process.env.TAMPERVAULT_PUBLIC_URL;
  const code = buildUserscript(script, undefined, baseUrl);

  const download = req.nextUrl.searchParams.get("download");
  if (download) {
    return new Response(code, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${scriptFilename(
          script.name
        )}"`,
      },
    });
  }

  return new Response(code, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
