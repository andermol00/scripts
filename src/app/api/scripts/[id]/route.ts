import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { scriptInputSchema } from "@/lib/validation";
import { eq, and } from "drizzle-orm";
import { incrementVersion } from "@/lib/userscript";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scriptId = parseInt(params.id);
  const body = await req.json();
  const parsed = scriptInputSchema.parse(body);

  const existing = await db.query.scripts.findFirst({
    where: (t, { eq, and }) =>
      and(eq(t.id, scriptId), eq(t.userId, session.userId)),
  });

  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // ✨ AUTO-UPDATE: Incrementar versión si el código cambió
  let newVersion = existing.version;
  if (parsed.code !== existing.code) {
    newVersion = incrementVersion(existing.version);
  }

  const [updated] = await db
    .update(scripts)
    .set({
      ...parsed,
      version: newVersion,
      updatedAt: new Date(),
    })
    .where(eq(scripts.id, scriptId))
    .returning();

  return Response.json({ script: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const scriptId = parseInt(params.id);

  await db
    .delete(scripts)
    .where(
      and(eq(scripts.id, scriptId), eq(scripts.userId, session.userId))
    );

  return Response.json({ success: true });
}
