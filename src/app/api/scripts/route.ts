import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { toStringArray } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const rows = await db
    .select()
    .from(scripts)
    .where(eq(scripts.userId, user.id))
    .orderBy(desc(scripts.updatedAt));
  return Response.json({ scripts: rows });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "No autorizado" }, { status: 401 });

  const b = await req.json().catch(() => null);
  const name = String(b?.name ?? "").trim();
  if (!name) {
    return Response.json({ error: "El nombre es obligatorio." }, { status: 400 });
  }

  const [created] = await db
    .insert(scripts)
    .values({
      userId: user.id,
      name,
      namespace: String(b?.namespace ?? "http://tampermonkey.net/"),
      version: String(b?.version ?? "1.0.0"),
      description: String(b?.description ?? ""),
      author: String(b?.author ?? ""),
      matches: toStringArray(b?.matches),
      grants: toStringArray(b?.grants),
      runAt: String(b?.runAt ?? "document-idle"),
      updateUrl: String(b?.updateUrl ?? ""),
      downloadUrl: String(b?.downloadUrl ?? ""),
      code: String(b?.code ?? ""),
      // Acepta ambos nombres para compatibilidad con clientes anteriores.
      obfuscateByDefault: Boolean(b?.obfuscateByDefault ?? b?.obfuscate),
    })
    .returning();

  return Response.json({ script: created });
}
