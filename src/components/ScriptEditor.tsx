"use client";

import { useState } from "react";
import type { ScriptForm } from "@/lib/types";
import { parseUserscript } from "@/lib/import";

const GRANT_OPTIONS = [
  "none",
  "GM_setValue",
  "GM_getValue",
  "GM_deleteValue",
  "GM_listValues",
  "GM_addStyle",
  "GM_xmlhttpRequest",
  "GM_registerMenuCommand",
  "GM_openInTab",
  "GM_notification",
  "GM_setClipboard",
  "unsafeWindow",
];

const RUN_AT = [
  "document-start",
  "document-body",
  "document-end",
  "document-idle",
  "context-menu",
];

type Props = {
  initial: ScriptForm;
  saving: boolean;
  onSave: (form: ScriptForm) => void;
  onCancel: () => void;
  startOpenImport?: boolean;
};

const inputCls =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function linesToArr(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ScriptEditor({
  initial,
  saving,
  onSave,
  onCancel,
  startOpenImport = false,
}: Props) {
  const [form, setForm] = useState<ScriptForm>(initial);
  const [matchesText, setMatchesText] = useState(initial.matches.join("\n"));
  const [importOpen, setImportOpen] = useState(startOpenImport);
  const [pasted, setPasted] = useState("");
  const [importMsg, setImportMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  function set<K extends keyof ScriptForm>(key: K, value: ScriptForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleGrant(g: string) {
    const has = form.grants.includes(g);
    let next = has ? form.grants.filter((x) => x !== g) : [...form.grants, g];
    if (g === "none" && !has) next = ["none"];
    if (g !== "none" && !has) next = next.filter((x) => x !== "none");
    set("grants", next);
  }

  function applyPaste() {
    const result = parseUserscript(pasted);
    if (!result.ok) {
      setImportMsg({ type: "err", text: result.error });
      return;
    }
    setForm(result.form);
    setMatchesText(result.form.matches.join("\n"));
    setImportMsg({
      type: "ok",
      text: result.hadHeader
        ? "Cabecera leída y campos rellenados. Revísalos y guarda."
        : "No se detectó cabecera ==UserScript==. El código se importó y la cabecera se generará al exportar.",
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ ...form, matches: linesToArr(matchesText) });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5">
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            📋 Pegar un script ya hecho
            <span className="text-xs font-normal text-slate-500">
              lee la cabecera y rellena todo solo
            </span>
          </span>
          <span className="text-slate-400">{importOpen ? "▲" : "▼"}</span>
        </button>

        {importOpen && (
          <div className="space-y-3 border-t border-indigo-500/20 px-4 pb-4 pt-3">
            <textarea
              className={`${inputCls} mono h-48 resize-y`}
              placeholder={
                "// ==UserScript==\n// @name         Mi script\n// @match        *://*.ejemplo.com/*\n// @grant        GM_setValue\n// ==/UserScript==\n\nalert('hola');"
              }
              value={pasted}
              onChange={(e) => {
                setPasted(e.target.value);
                setImportMsg(null);
              }}
              spellCheck={false}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={applyPaste}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                Importar y rellenar
              </button>
              <button
                type="button"
                onClick={() => {
                  setPasted("");
                  setImportMsg(null);
                }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                Limpiar
              </button>
            </div>
            {importMsg && (
              <p
                className={`rounded-lg border px-3 py-2 text-xs ${
                  importMsg.type === "ok"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/40 bg-red-500/10 text-red-300"
                }`}
              >
                {importMsg.text}
              </p>
            )}
            <p className="text-xs text-slate-500">
              Pega un <code className="mono">.user.js</code> completo o solo el
              código JS. Se leen <code className="mono">@name @match @grant</code>
              , <code className="mono">@run-at</code>,{" "}
              <code className="mono">@updateURL</code>,{" "}
              <code className="mono">@downloadURL</code>, etc. El envoltorio{" "}
              <code className="mono">IIFE</code> se detecta para no duplicarlo al
              exportar.
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nombre *">
          <input
            className={inputCls}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            required
          />
        </Field>
        <Field label="Versión">
          <input
            className={inputCls}
            value={form.version}
            onChange={(e) => set("version", e.target.value)}
          />
        </Field>
        <Field label="Autor">
          <input
            className={inputCls}
            value={form.author}
            onChange={(e) => set("author", e.target.value)}
          />
        </Field>
        <Field label="Namespace">
          <input
            className={inputCls}
            value={form.namespace}
            onChange={(e) => set("namespace", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Descripción">
        <input
          className={inputCls}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="@match (una URL por línea)">
          <textarea
            className={`${inputCls} mono h-24 resize-y`}
            placeholder="*://*.example.com/*"
            value={matchesText}
            onChange={(e) => setMatchesText(e.target.value)}
          />
        </Field>
        <Field label="@run-at">
          <select
            className={inputCls}
            value={form.runAt}
            onChange={(e) => set("runAt", e.target.value)}
          >
            {RUN_AT.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="@updateURL (opcional)">
          <input
            className={inputCls}
            value={form.updateUrl}
            onChange={(e) => set("updateUrl", e.target.value)}
            placeholder="https://.../script.user.js"
          />
        </Field>
        <Field label="@downloadURL (opcional)">
          <input
            className={inputCls}
            value={form.downloadUrl}
            onChange={(e) => set("downloadUrl", e.target.value)}
            placeholder="https://.../script.user.js"
          />
        </Field>
      </div>

      <Field label="@grant">
        <div className="flex flex-wrap gap-2">
          {GRANT_OPTIONS.map((g) => {
            const active = form.grants.includes(g);
            return (
              <button
                type="button"
                key={g}
                onClick={() => toggleGrant(g)}
                className={`mono rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500"
                }`}
              >
                {g}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Código JavaScript">
        <textarea
          className={`${inputCls} mono h-64 resize-y`}
          placeholder="// Tu código aquí..."
          value={form.code}
          onChange={(e) => set("code", e.target.value)}
          spellCheck={false}
        />
      </Field>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
        <input
          type="checkbox"
          checked={form.obfuscateByDefault}
          onChange={(e) => set("obfuscateByDefault", e.target.checked)}
          className="h-4 w-4 accent-indigo-500"
        />
        <span className="text-sm">
          <span className="font-medium">Ofuscar el código al generar</span>
          <span className="block text-xs text-slate-500">
            Si lo dejas desmarcado, el userscript se genera legible (recomendado
            para revisarlo).
          </span>
        </span>
      </label>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Guardar script"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-700 px-5 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
