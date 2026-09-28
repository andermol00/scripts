import Link from "next/link";
import { groupFiles, listBundleFiles } from "@/lib/bundle";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default async function DownloadPage() {
  const files = await listBundleFiles();
  const groups = groupFiles(files);
  const totalBytes = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-slate-900 to-slate-950 p-8">
        <p className="text-xs uppercase tracking-[0.25em] text-emerald-400">Descarga</p>
        <h1 className="mt-2 text-3xl font-bold text-white">Archivos de Tampervault</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
          Los {files.length} archivos del repo limpio, listos para copiar y pegar en GitHub
          (Add file → Create new file). Todos incluyen las correcciones necesarias para
          compilar: sesión y hash scrypt, Drizzle con arrays por defecto, fetch con
          <code className="mx-1 text-emerald-300">AbortSignal.timeout</code>, flat config de
          ESLint y scripts de inicialización de la base.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a
            href="/api/download/zip"
            className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Descargar todo (.zip · {formatBytes(totalBytes)})
          </a>
          <Link
            href="/"
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Ir al login con PIN
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Panel
          </Link>
        </div>

        <ol className="mt-6 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
          <li>1. Crea un repo vacío (por ejemplo <code>tampervault</code>).</li>
          <li>2. Copia cada archivo con el botón «Copiar» o descarga el .zip.</li>
          <li>3. <code>cp .env.example .env</code> y pon tu <code>DATABASE_URL</code>.</li>
          <li>4. <code>npm install && npm run db:init && npm run db:seed</code>.</li>
          <li>5. <code>npm run dev</code> → PIN 123456 / contraseña tampervault.</li>
          <li>6. En Vercel añade <code>DATABASE_URL</code> y <code>SESSION_SECRET</code>.</li>
        </ol>
      </header>

      {groups.map((group) => (
        <section key={group.group} className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
            {group.group}
          </h2>
          <ul className="mt-3 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
            {group.files.map((file) => (
              <li
                key={file.path}
                className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-4 transition hover:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm text-slate-100">{file.path}</p>
                  <p className="text-xs text-slate-500">
                    {file.description || "Archivo del proyecto"} · {formatBytes(file.size)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <CopyButton path={file.path} />
                  <a
                    href={`/api/download?path=${encodeURIComponent(file.path)}&raw=1`}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-sky-500 hover:text-sky-300"
                  >
                    Ver
                  </a>
                  <a
                    href={`/api/download?path=${encodeURIComponent(file.path)}`}
                    className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-emerald-300 transition hover:bg-slate-700"
                  >
                    Descargar
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
        Tampervault · Next.js 16 + Drizzle ORM + PostgreSQL · PIN con scrypt y sesiones en
        base de datos.
      </footer>
    </main>
  );
}
