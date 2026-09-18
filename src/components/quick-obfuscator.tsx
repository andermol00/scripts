"use client";

import { useState } from "react";

type Level = "none" | "basic" | "strong";

export default function QuickObfuscator() {
  const [code, setCode] = useState("");
  const [level, setLevel] = useState<Level>("basic");
  const [enabled, setEnabled] = useState(true);
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch("/api/tools/obfuscate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, level: enabled ? level : "none" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo procesar el código.");
        setLoading(false);
        return;
      }
      setOutput(data.code);
      setLoading(false);
    } catch {
      setError("Error de red.");
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Código de entrada
        </label>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          spellCheck={false}
          placeholder="function hola() { console.log('hola mundo'); }"
          className="min-h-[320px] w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-xs leading-relaxed text-white outline-none ring-emerald-500/40 transition focus:ring-2"
        />

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-slate-900 accent-emerald-400"
            />
            Ofuscar código (desmárcalo para dejarlo tal cual)
          </label>
        </div>

        {enabled && (
          <div className="mt-3 flex gap-2">
            {(["basic", "strong"] as Level[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => setLevel(lvl)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  level === lvl
                    ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                }`}
              >
                {lvl === "basic" ? "Básica" : "Fuerte"}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleRun}
          disabled={loading || !code.trim()}
          className="mt-5 w-full rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Procesando…" : "Procesar código"}
        </button>

        {error && (
          <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-1 flex items-center justify-between">
          <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
            Resultado
          </span>
          {output && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/20"
            >
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          )}
        </div>
        <pre className="min-h-[320px] overflow-auto rounded-lg bg-slate-950/80 p-3 text-xs leading-relaxed text-emerald-200">
          <code>{output ?? "// Aquí aparecerá el resultado"}</code>
        </pre>
      </div>
    </div>
  );
}
