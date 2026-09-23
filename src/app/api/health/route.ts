import { db } from "@/db";
import { ensureDatabaseSchema, getSchemaVersion } from "@/db/bootstrap";
import { describeDatabaseError } from "@/db/errors";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureDatabaseSchema();
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      database: "connected",
      schemaVersion: getSchemaVersion(),
    });
  } catch (error) {
    const problem = describeDatabaseError(error);
    console.error("[health] Database health check failed:", error);
    return Response.json(
      { ok: false, database: "unavailable", error: problem },
      { status: 503 },
    );
  }
}
