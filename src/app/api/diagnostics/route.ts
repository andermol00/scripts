import { ensureDatabaseSchema, getSchemaVersion } from "@/db/bootstrap";
import { describeDatabaseError } from "@/db/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Public but safe: reports readiness without exposing DB URLs or credentials. */
export async function GET() {
  const startedAt = Date.now();
  try {
    await ensureDatabaseSchema();
    return Response.json(
      {
        ok: true,
        databaseConfigured: true,
        databaseReady: true,
        schemaVersion: getSchemaVersion(),
        latencyMs: Date.now() - startedAt,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const problem = describeDatabaseError(error);
    return Response.json(
      {
        ok: false,
        databaseConfigured: Boolean(process.env.DATABASE_URL),
        databaseReady: false,
        error: problem,
        latencyMs: Date.now() - startedAt,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
