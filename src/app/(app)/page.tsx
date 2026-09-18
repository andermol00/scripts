import Link from "next/link";
import { db } from "@/db";
import { scripts } from "@/db/schema";
import { desc } from "drizzle-orm";
import ScriptListItem from "@/components/script-list-item";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const rows = await db
    .select()
    .from(scripts)
    .orderBy(desc(scripts.updatedAt));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Mis userscripts</h1>
          <p className="mt-1 text-sm text-slate-400">
            {rows.length === 0
              ? "Todavía no has guardado ningún script."
              : `${rows.length} script${rows.length === 1 ? "" : "s"} guardado${
                  rows.length === 1 ? "" : "s"
                }.`}
          </p>
        </div>
        <Link
          href="/scripts/new"
          className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
        >
          + Nuevo script
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-16 text-center">
          <p className="text-4xl">🧩</p>
          <p className="mt-4 text-slate-300">
            Crea tu primer userscript de Tampermonkey para empezar a generar versiones
            ofuscadas o limpias.
          </p>
          <Link
            href="/scripts/new"
            className="mt-6 inline-block rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
          >
            Crear script
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((script) => (
            <ScriptListItem
              key={script.id}
              id={script.id}
              name={script.name}
              description={script.description}
              version={script.version}
              matches={script.matches}
              updatedAt={script.updatedAt.toISOString()}
            />
          ))}
        </div>
      )}
    </div>
  );
}
