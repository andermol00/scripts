import { getCurrentUser, countUsers } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const [user, total] = await Promise.all([getCurrentUser(), countUsers()]);
  return Response.json({
    needsSetup: total === 0,
    authenticated: !!user,
    username: user?.username ?? null,
  });
}
