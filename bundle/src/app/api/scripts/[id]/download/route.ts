import { NextResponse, type NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { renderUserScript } from "@/lib/scripts";

export const dynamic = "force-dynamic";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "script"
  );
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await ctx.params;
  const scriptId = Number.parseInt(id, 10);
  if (!Number.isFinite(scriptId)) {
    return NextResponse.json({ error: "ID invalido" }, { status: 400 });
  }

  const script = (
    await db
      .select()
      .from(scripts)
      .where(and(eq(scripts.id, scriptId), eq(scripts.userId, user.id)))
      .limit(1)
  )[0];

  if (!script) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const obfuscated =
    req.nextUrl.searchParams.get("obfuscate") === "1" || script.obfuscateByDefault;
  const installUrl = `${req.nextUrl.origin}/api/scripts/${script.id}/download`;

  const output = renderUserScript(
    {
      ...script,
      updateUrl: script.updateUrl || installUrl,
      downloadUrl: script.downloadUrl || installUrl,
    },
    obfuscated,
  );

  return new NextResponse(output, {
    status: 200,
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "content-disposition": `attachment; filename="${slugify(script.name)}-${script.version}.user.js"`,
      "cache-control": "no-store",
    },
  });
}
