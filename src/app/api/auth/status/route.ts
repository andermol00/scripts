import { getCurrentUser, countUsers } from "@/lib/auth";
import { ensureDatabaseSchema } from "@/db/bootstrap";
import { describeDatabaseError } from "@/db/errors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    // Makes a fresh Render deployment self-initializing even when the service's
    // build command does not run scripts/init-db.mjs.
    await ensureDatabaseSchema();
    const [user, total] = await Promise.all([getCurrentUser(), countUsers()]);
    return Response.json(
      {
        ok: true,
        needsSetup: total === 0,
        authenticated: !!user,
        username: user?.username ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const problem = describeDatabaseError(error);
    console.error("[auth/status] Database initialization failed:", error);
    return Response.json(
      {
        ok: false,
        needsSetup: false,
        authenticated: false,
        username: null,
        error: problem,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
