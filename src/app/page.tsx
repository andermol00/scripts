"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Dashboard from "@/components/Dashboard";

type Status = {
  needsSetup: boolean;
  authenticated: boolean;
  username: string | null;
};

type LoadProblem = {
  code: string;
  message: string;
};

const FALLBACK_ERROR: LoadProblem = {
  code: "SERVICE_UNAVAILABLE",
  message:
    "El servicio no respondió correctamente. Revisa los logs de Runtime en Render.",
};

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState<LoadProblem | null>(null);

  async function refresh() {
    setLoading(true);
    setProblem(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch(`/api/auth/status?t=${Date.now()}`, {
        cache: "no-store",
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      const text = await res.text();
      let data: {
        needsSetup?: boolean;
        authenticated?: boolean;
        username?: string | null;
        error?: LoadProblem;
      } | null = null;
      try {
        data = JSON.parse(text);
      } catch {
        // Render/proxies can return an HTML 502 page; don't leave the UI stuck.
      }

      if (!res.ok || !data) {
        setProblem(data?.error ?? FALLBACK_ERROR);
        return;
      }

      setStatus({
        needsSetup: Boolean(data.needsSetup),
        authenticated: Boolean(data.authenticated),
        username: data.username ?? null,
      });
    } catch (error) {
      const timedOut =
        error instanceof DOMException && error.name === "AbortError";
      setProblem(
        timedOut
          ? {
              code: "REQUEST_TIMEOUT",
              message:
                "La base de datos tardó más de 15 segundos en responder. Puede estar iniciando o DATABASE_URL no conecta.",
            }
          : {
              code: "NETWORK_ERROR",
              message:
                "No se pudo contactar la API. Comprueba que el servicio de Render esté activo.",
            },
      );
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (problem) {
    return <ConfigurationError problem={problem} onRetry={refresh} />;
  }

  if (!status) {
    return (
      <ConfigurationError problem={FALLBACK_ERROR} onRetry={refresh} />
    );
  }

  if (!status.authenticated) {
    return (
      <AuthGate
        needsSetup={status.needsSetup}
        onAuthed={(username) =>
          setStatus({ needsSetup: false, authenticated: true, username })
        }
      />
    );
  }

  return (
    <Dashboard
      username={status.username ?? "admin"}
      onLogout={() =>
        setStatus({ needsSetup: false, authenticated: false, username: null })
      }
    />
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400" />
        <p className="mt-4 text-sm text-slate-400">
          Conectando con tu bóveda…
        </p>
        <p className="mt-1 text-xs text-slate-600">
          El primer arranque de Render puede tardar unos segundos.
        </p>
      </div>
    </div>
  );
}

function ConfigurationError({
  problem,
  onRetry,
}: {
  problem: LoadProblem;
  onRetry: () => void;
}) {
  const configured = problem.code !== "DATABASE_NOT_CONFIGURED";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-red-950/30 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-slate-900/90 p-6 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500/15 text-xl">
            ⚠️
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">
              No se pudo abrir Tampervault
            </h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {problem.message}
            </p>
            <code className="mt-3 inline-block rounded bg-slate-950 px-2 py-1 text-xs text-red-300">
              {problem.code}
            </code>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p className="font-medium text-white">Revisión rápida en Render</p>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-400">
            <li>
              En tu servicio: <b className="text-slate-200">Environment</b> →
              confirma que exista <code>DATABASE_URL</code>.
            </li>
            <li>
              Usa la <b className="text-slate-200">Internal Database URL</b> de
              un PostgreSQL ubicado en la misma región.
            </li>
            <li>
              Revisa <b className="text-slate-200">Logs → Runtime</b>. La app
              ahora crea las tablas automáticamente al arrancar.
            </li>
          </ol>
          {!configured && (
            <p className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              El deploy puede compilar sin DATABASE_URL, pero la aplicación la
              necesita en runtime para guardar usuarios y scripts.
            </p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
          >
            Reintentar conexión
          </button>
          <a
            href="/api/diagnostics"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Abrir diagnóstico JSON
          </a>
        </div>
      </div>
    </div>
  );
}
