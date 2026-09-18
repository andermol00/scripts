"use client";

import { useMemo, useState } from "react";
import { saveScriptAction } from "@/app/actions";

const starterScript = `// ==UserScript==
// @name         Mi automatización
// @namespace    https://tampermonkey.net/
// @version      1.0.0
// @description  Describe aquí tu script
// @match        https://example.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // Tu código aquí
})();`;

export function ScriptComposer() {
  const [sourceCode, setSourceCode] = useState(starterScript);
  const [isObfuscated, setIsObfuscated] = useState(true);
  const characterCount = useMemo(() => sourceCode.length.toLocaleString("es-MX"), [sourceCode]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-violet-100 text-violet-700">
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
                <path d="M10 2.8 3.8 6.2v7.6l6.2 3.4 6.2-3.4V6.2L10 2.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
                <path d="m7.3 10 1.8 1.8 3.7-3.7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <h2 className="text-base font-extrabold tracking-tight text-slate-950">Nuevo artefacto</h2>
          </div>
          <p className="mt-2 text-sm text-slate-500">Guarda la fuente y una versión lista para instalar.</p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:self-auto">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Cifrado en tránsito
        </div>
      </div>

      <form action={saveScriptAction} className="space-y-5 p-5 sm:p-7">
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.18fr)]">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Nombre del script</span>
            <input
              name="title"
              required
              minLength={2}
              maxLength={100}
              placeholder="Ej. Auto completado CRM"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Nota privada <span className="normal-case tracking-normal text-slate-400">(opcional)</span></span>
            <input
              name="description"
              maxLength={300}
              placeholder="Qué hace y dónde se usa"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
            />
          </label>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="sourceCode" className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">Código fuente</label>
            <span className="font-mono text-[11px] font-medium text-slate-400">{characterCount} / 250.000</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800 bg-[#111827] shadow-inner">
            <div className="flex h-9 items-center gap-1.5 border-b border-white/[0.07] bg-white/[0.025] px-4">
              <span className="size-2 rounded-full bg-rose-400/70" />
              <span className="size-2 rounded-full bg-amber-300/70" />
              <span className="size-2 rounded-full bg-emerald-400/70" />
              <span className="ml-3 font-mono text-[10px] text-slate-500">userscript.js</span>
            </div>
            <textarea
              id="sourceCode"
              name="sourceCode"
              value={sourceCode}
              onChange={(event) => setSourceCode(event.target.value)}
              spellCheck={false}
              required
              maxLength={250000}
              className="min-h-72 w-full resize-y bg-transparent p-4 font-mono text-[12px] leading-6 text-slate-200 outline-none placeholder:text-slate-600"
              aria-describedby="script-help"
            />
          </div>
          <p id="script-help" className="mt-2 text-xs leading-5 text-slate-500">Conserva el bloque <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px] text-slate-700">==UserScript==</code> para que Tampermonkey reconozca los permisos y dominios.</p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-violet-100 bg-violet-50/55 p-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              name="isObfuscated"
              type="checkbox"
              checked={isObfuscated}
              onChange={(event) => setIsObfuscated(event.target.checked)}
              className="mt-0.5 size-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
            />
            <span>
              <span className="block text-sm font-extrabold text-slate-900">Ofuscar antes de guardar</span>
              <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                {isObfuscated
                  ? "Empaqueta el cuerpo en una entrega codificada; el encabezado de Tampermonkey se conserva."
                  : "Se guardará exactamente tu código fuente, sin transformación."}
              </span>
            </span>
          </label>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#6557ff] px-5 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(101,87,255,0.23)] transition hover:bg-[#5648eb] focus:outline-none focus:ring-4 focus:ring-violet-200">
            <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
              <path d="M10 3v9m0 0 3.2-3.2M10 12 6.8 8.8M4 13.5v1.2A1.3 1.3 0 0 0 5.3 16h9.4a1.3 1.3 0 0 0 1.3-1.3v-1.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Generar y guardar
          </button>
        </div>
      </form>
    </section>
  );
}
