import { getDbStatus } from "@/lib/diagnostics";

export const dynamic = "force-dynamic";

/** GET /api/health — diagnóstico de la base de datos. */
export async function GET() {
  const status = await getDbStatus();

  if (!status.reachable) {
    return Response.json(
      { ok: false, service: "tampervault", ...status },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, service: "tampervault", ...status });
}
