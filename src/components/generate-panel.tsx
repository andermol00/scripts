"use client";

import { useState } from "react";

type Level = "none" | "basic" | "strong";

export default function GeneratePanel({ scriptId }: { scriptId: number }) {
  const [level, setLevel] = useState<Level>("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [output, setOutput] = useState<string | null>(null);
  const [filename, setFilename] = useState("script.user.js");
  const [copied, setCopied] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch(`/api/scripts/${scriptId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo generar el script.");
        setLoading(false);
        return;
      }
      setOutput(data.code);
      setFilename(data.filename);
      setLoading(false);
    } catch {
      setError("Error de red al generar.");
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="text-lg font-semibold text-white">Generar script para Tampermonkey</h2>
      <p className="mt-1 text-sm text-slate-400">
        Elige si quieres el código tal cual o una versión ofuscada antes de instalarlo o
        compartirlo.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <LevelOption
          selected={level === "none"}
          onClick={() => setLevel("none")}
          title="Sin ofuscar"
          description="Código legible, tal cual lo escribiste (con la cabecera de metadatos)."
        />
        <LevelOption
          selected={level === "basic"}
          onClick={() => setLevel("basic")}
          title="Ofuscación básica"
          description="Renombra variables y codifica cadenas. Rápido y liviano."
        />
        <LevelOption
          selected={level === "strong"}
          onClick={() => setLevel("strong")}
          title="Ofuscación fuerte"
          description="Control de flujo, código señuelo y auto-defensa. Más pesado."
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Generando…" : "Generar .user.js"}
        </button>
        {output && (
          <>
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              {copied ? "¡Copiado!" : "Copiar al portapapeles"}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Descargar {filename}
            </button>
          </>
        )}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {output && (
        <pre className="mt-5 max-h-[420px] overflow-auto rounded-xl bg-slate-950/80 p-4 text-xs leading-relaxed text-emerald-200">
          <code>{output}</code>
        </pre>
      )}
    </div>
  );
}

function LevelOption({
  selected,
  onClick,
  title,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border p-4 text-left transition ${
        selected
          ? "border-emerald-400/50 bg-emerald-400/10"
          : "border-white/10 bg-slate-950/40 hover:bg-white/5"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full border ${
            selected ? "border-emerald-400 bg-emerald-400" : "border-slate-500"
          }`}
        />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      <p className="mt-2 text-xs text-slate-400">{description}</p>
    </button>
  );
}
