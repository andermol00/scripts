import { NextResponse, type NextRequest } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { getCurrentUser } from "@/lib/session";
import { fetchRemoteCode, scriptHash } from "@/lib/scripts";

export const dynamic = "force-dynamic";

type Result = {
  id: number;
  name: string;
  status: "updated" | "unchanged" | "error" | "skipped";
  detail?: string;
};

/** POST { scriptIds?: number[] } — revisa todos (o los indicados) y actualiza el codigo. */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const body = (await req.json().catch(() => ({}))) as { scriptIds?: unknown };
    const requested = Array.isArray(body.scriptIds)
      ? body.scriptIds.map(Number).filter(Number.isFinite)
      : [];

    const rows = requested.length
      ? await db
          .select()
          .from(scripts)
          .where(and(eq(scripts.userId, user.id), inArray(scripts.id, requested)))
      : await db.select().from(scripts).where(eq(scripts.userId, user.id));

    const results: Result[] = [];

    for (const script of rows) {
      if (!script.sourceUrl) {
        results.push({ id: script.id, name: script.name, status: "skipped", detail: "Sin URL de origen" });
        continue;
      }

      const remote = await fetchRemoteCode(script.sourceUrl);
      if (!remote.ok) {
        results.push({ id: script.id, name: script.name, status: "error", detail: remote.error });
        continue;
      }

      const newHash = scriptHash(remote.code);
      if (newHash === script.codeHash) {
        await db.update(scripts).set({ lastCheckAt: new Date() }).where(eq(scripts.id, script.id));
        results.push({ id: script.id, name: script.name, status: "unchanged" });
        continue;
      }

      await db
        .update(scripts)
        .set({ code: remote.code, codeHash: newHash, lastCheckAt: new Date(), updatedAt: new Date() })
        .where(eq(scripts.id, script.id));

      results.push({ id: script.id, name: script.name, status: "updated" });
    }

    return NextResponse.json({
      checked: rows.length,
      updates: results.filter((r) => r.status === "updated").length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[check-updates POST]", error);
    return NextResponse.json({ error: "Error verificando actualizaciones" }, { status: 500 });
  }
}

/** GET /api/scripts/check-updates?id=1 — revisa un script concreto. */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const scriptId = Number.parseInt(req.nextUrl.searchParams.get("id") ?? "", 10);
    if (!Number.isFinite(scriptId)) {
      return NextResponse.json({ error: "ID de script requerido" }, { status: 400 });
    }

    const script = (
      await db
        .select()
        .from(scripts)
        .where(and(eq(scripts.id, scriptId), eq(scripts.userId, user.id)))
        .limit(1)
    )[0];

    if (!script) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    if (!script.sourceUrl) {
      return NextResponse.json({ error: "El script no tiene URL de origen" }, { status: 400 });
    }

    const remote = await fetchRemoteCode(script.sourceUrl);
    if (!remote.ok) return NextResponse.json({ error: remote.error }, { status: 502 });

    const newHash = scriptHash(remote.code);
    const hasUpdate = newHash !== script.codeHash;

    await db
      .update(scripts)
      .set(
        hasUpdate
          ? { code: remote.code, codeHash: newHash, lastCheckAt: new Date(), updatedAt: new Date() }
          : { lastCheckAt: new Date() },
      )
      .where(eq(scripts.id, script.id));

    return NextResponse.json({
      id: script.id,
      name: script.name,
      hasUpdate,
      oldHash: script.codeHash,
      newHash,
      newCodeSize: remote.code.length,
      lastCheck: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[check-updates GET]", error);
    return NextResponse.json({ error: "Error en la solicitud" }, { status: 500 });
  }
}
