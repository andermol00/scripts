import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { buildUserscript } from "@/lib/userscript";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return new Response("No autorizado", { status: 401 });
  const { id } = await params;
  const rows = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, Number(id)), eq(scripts.userId, user.id)))
    .limit(1);
  const script = rows[0];
  if (!script) return new Response("No encontrado", { status: 404 });

  const code = buildUserscript(script);
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const safeName =
    script.name.replace(/[^a-z0-9-_]+/gi, "_").toLowerCase() || "script";

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
  };
  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${safeName}.user.js"`;
  }
  return new Response(code, { headers });
}
