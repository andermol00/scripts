import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { deleteScriptAction, logoutAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import { CopyOutput } from "@/components/copy-output";
import { ScriptComposer } from "@/components/script-composer";
import { db } from "@/db";
import { savedScripts } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type DashboardProps = {
  searchParams: Promise<{ error?: string | string[]; notice?: string | string[] }>;
};

function firstName(name: string) {
  return name.split(/\s+/)[0] || name;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-MX", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/");

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const notice = typeof params.notice === "string" ? params.notice : null;
  const scripts = await db
    .select()
    .from(savedScripts)
    .where(eq(savedScripts.ownerId, user.id))
    .orderBy(desc(savedScripts.updatedAt));
  const obfuscatedCount = scripts.filter((script) => script.isObfuscated).length;

  return (
    <main className="min-h-screen bg-[#f6f7fb] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1440px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
          <BrandMark />
          <div className="flex items-center gap-3 sm:gap-5">
            <a href="#composer" className="hidden text-sm font-bold text-slate-500 transition hover:text-violet-700 sm:block">Nuevo script</a>
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-full bg-[#e8e5ff] text-xs font-black text-[#5648eb]">{initials(user.displayName)}</div>
              <div className="hidden leading-tight md:block">
                <p className="text-sm font-extrabold text-slate-900">{firstName(user.displayName)}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Sesión privada</p>
              </div>
            </div>
            <form action={logoutAction}>
              <button title="Cerrar sesión" aria-label="Cerrar sesión" className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-4 focus:ring-violet-100">
                <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true"><path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8m3-3 3-3-3-3m3 3H8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-9 sm:px-8 lg:px-12 lg:pt-12">
        <section className="relative overflow-hidden rounded-[26px] bg-[#191735] px-6 py-8 text-white shadow-[0_20px_45px_rgba(30,27,75,0.16)] sm:px-9 sm:py-10 lg:px-12">
          <div className="absolute -right-20 -top-32 size-80 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 size-52 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-300">Panel de control</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.055em] sm:text-4xl">Hola, {firstName(user.displayName)}.</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Tu bóveda está lista. Genera, organiza y copia tus scripts de Tampermonkey desde un único lugar privado.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="min-w-[94px] rounded-xl border border-white/10 bg-white/[0.055] p-3.5 sm:min-w-28 sm:p-4">
                <p className="text-2xl font-black tracking-tight text-white">{scripts.length}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Guardados</p>
              </div>
              <div className="min-w-[94px] rounded-xl border border-white/10 bg-white/[0.055] p-3.5 sm:min-w-28 sm:p-4">
                <p className="text-2xl font-black tracking-tight text-white">{obfuscatedCount}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Empaquetados</p>
              </div>
              <div className="min-w-[94px] rounded-xl border border-emerald-300/15 bg-emerald-400/[0.07] p-3.5 sm:min-w-28 sm:p-4">
                <p className="text-2xl font-black tracking-tight text-emerald-300">ON</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100/60">Bóveda</p>
              </div>
            </div>
          </div>
        </section>

        {notice && <div role="status" className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"><span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white"><svg viewBox="0 0 20 20" className="size-3" fill="none" aria-hidden="true"><path d="m4.5 10 3.2 3.2 7.8-7.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>{notice}</div>}
        {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div>}

        <section id="composer" className="scroll-mt-24 mt-8">
          <ScriptComposer />
        </section>

        <section className="mt-10">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Biblioteca privada</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.045em] text-slate-950">Scripts guardados</h2>
            </div>
            <p className="text-sm text-slate-500">Solo visibles desde tu sesión.</p>
          </div>

          {scripts.length === 0 ? (
            <div className="mt-6 grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div>
                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-violet-100 text-violet-700"><svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true"><path d="M8 5.5H5.5A1.5 1.5 0 0 0 4 7v11.5A1.5 1.5 0 0 0 5.5 20h11a1.5 1.5 0 0 0 1.5-1.5V16M14.5 4H20m0 0v5.5M20 4l-8.3 8.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
                <h3 className="mt-4 text-base font-extrabold text-slate-900">Aún no hay scripts guardados</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">Crea tu primer artefacto arriba. Podrás copiar su resultado directamente en Tampermonkey.</p>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-5">
              {scripts.map((script) => (
                <article key={script.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.045)]">
                  <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="truncate text-base font-extrabold tracking-tight text-slate-950">{script.title}</h3>
                        <span className={script.isObfuscated ? "rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-violet-700" : "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-slate-600"}>{script.isObfuscated ? "Empaquetado" : "Código original"}</span>
                      </div>
                      {script.description && <p className="mt-2 text-sm leading-6 text-slate-500">{script.description}</p>}
                      <p className="mt-2 font-mono text-[11px] text-slate-400">Actualizado {formatDate(script.updatedAt)} · {script.sourceCode.length.toLocaleString("es-MX")} caracteres fuente</p>
                    </div>
                    <form action={deleteScriptAction} className="shrink-0">
                      <input type="hidden" name="scriptId" value={script.id} />
                      <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100">
                        <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true"><path d="M4.5 6.2h11m-7.7 3v4.4m3.4-4.4v4.4M7.2 6.2l.5-2h4.6l.5 2m-7.1 0 .5 9.1c.1.8.7 1.4 1.5 1.4h5.6c.8 0 1.4-.6 1.5-1.4l.5-9.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        Eliminar
                      </button>
                    </form>
                  </div>
                  <details className="group" open={scripts[0]?.id === script.id}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 sm:px-6">
                      <span className="flex items-center gap-2"><svg viewBox="0 0 20 20" className="size-4 text-violet-600" fill="none" aria-hidden="true"><path d="M7.5 5 3 10l4.5 5M12.5 5 17 10l-4.5 5M11.3 3.8 8.7 16.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>Resultado para Tampermonkey</span>
                      <span className="flex items-center gap-2 text-xs font-bold text-slate-400">Ver código <svg viewBox="0 0 20 20" className="size-3.5 transition group-open:rotate-180" fill="none" aria-hidden="true"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
                    </summary>
                    <div className="border-t border-slate-100 bg-slate-950 p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3 px-1"><span className="font-mono text-[11px] text-slate-500">{script.isObfuscated ? "release.user.js" : "source.user.js"}</span><CopyOutput value={script.outputCode} /></div>
                      <pre className="max-h-96 overflow-auto rounded-xl border border-white/[0.06] bg-black/20 p-4 font-mono text-[11px] leading-5 text-slate-300"><code>{script.outputCode}</code></pre>
                    </div>
                  </details>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
