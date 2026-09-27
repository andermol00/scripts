import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ScriptManager } from "@/components/script-manager";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const rows = await db
    .select()
    .from(scripts)
    .where(eq(scripts.userId, user.id))
    .orderBy(desc(scripts.updatedAt));

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <ScriptManager
        username={user.username}
        initialScripts={rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          lastCheckAt: row.lastCheckAt ? row.lastCheckAt.toISOString() : null,
        }))}
      />
    </main>
  );
}
