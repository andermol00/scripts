import { db } from "@/db";
import { scripts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

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

function normList(v: unknown): string {
  if (Array.isArray(v)) {
    return JSON.stringify(v.filter((x) => typeof x === "string" && x.trim()));
  }
  if (typeof v === "string") {
    const arr = v
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    return JSON.stringify(arr);
  }
  return "[]";
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
      matches: normList(b?.matches),
      grants: normList(b?.grants),
      runAt: String(b?.runAt ?? "document-idle"),
      code: String(b?.code ?? ""),
      obfuscate: Boolean(b?.obfuscate),
    })
    .returning();

  return Response.json({ script: created });
}
