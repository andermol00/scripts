import Link from "next/link";

export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-950 px-6 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">404</p>
      <h1 className="text-3xl font-bold text-white">Esta pagina no existe</h1>
      <p className="max-w-md text-sm text-slate-400">
        La ruta que buscas no esta en la boveda. Si acabas de desplegar, revisa que el
        build haya terminado y que <code className="text-emerald-300">DATABASE_URL</code>{" "}
        este configurada en las variables de entorno del proyecto.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          Ir al login
        </Link>
        <Link
          href="/descargar"
          className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Descargar archivos del repo
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Panel
        </Link>
      </div>
    </main>
  );
}
