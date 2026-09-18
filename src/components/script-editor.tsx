"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export type ScriptFormData = {
  name: string;
  description: string;
  code: string;
  namespace: string;
  version: string;
  author: string;
  matches: string[];
  grants: string[];
  runAt: string;
  updateUrl: string;
  downloadUrl: string;
  obfuscateByDefault: boolean;
};

const RUN_AT_OPTIONS = [
  { value: "document-start", label: "document-start" },
  { value: "document-end", label: "document-end" },
  { value: "document-idle", label: "document-idle (recomendado)" },
  { value: "context-menu", label: "context-menu" },
];

const COMMON_GRANTS = [
  "none",
  "GM_setValue",
  "GM_getValue",
  "GM_deleteValue",
  "GM_addStyle",
  "GM_xmlhttpRequest",
  "GM_registerMenuCommand",
  "GM_notification",
  "unsafeWindow",
];

function toTextarea(list: string[]) {
  return list.join("\n");
}

function fromTextarea(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function ScriptEditor({
  mode,
  scriptId,
  initial,
}: {
  mode: "create" | "edit";
  scriptId?: number;
  initial?: ScriptFormData;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ScriptFormData>(
    initial ?? {
      name: "",
      description: "",
      code: "// ==UserScript==\n// (los metadatos se generan automáticamente)\n// ==/UserScript==\n\n(function () {\n  'use strict';\n\n  // Tu código aquí\n})();\n",
      namespace: "https://tampermonkey.local/",
      version: "1.0.0",
      author: "",
      matches: ["*://*/*"],
      grants: ["none"],
      runAt: "document-idle",
      updateUrl: "",
      downloadUrl: "",
      obfuscateByDefault: false,
    },
  );
  const [matchesText, setMatchesText] = useState(toTextarea(form.matches));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function toggleGrant(grant: string) {
    setForm((prev) => {
      const has = prev.grants.includes(grant);
      let next = has ? prev.grants.filter((g) => g !== grant) : [...prev.grants, grant];
      if (grant === "none" && !has) next = ["none"];
      if (grant !== "none" && !has) next = next.filter((g) => g !== "none");
      return { ...prev, grants: next };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const payload = { ...form, matches: fromTextarea(matchesText) };

    try {
      const url = mode === "create" ? "/api/scripts" : `/api/scripts/${scriptId}`;
      const method = mode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo guardar el script.");
        setSaving(false);
        return;
      }

      if (mode === "create") {
        router.push(`/scripts/${data.script.id}`);
      } else {
        setSuccess("Cambios guardados.");
        router.refresh();
      }
      setSaving(false);
    } catch {
      setError("Error de red al guardar.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Nombre">
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="Mi userscript"
          />
        </Field>
        <Field label="Versión">
          <input
            value={form.version}
            onChange={(e) => setForm({ ...form, version: e.target.value })}
            className={inputClass}
            placeholder="1.0.0"
          />
        </Field>
      </div>

      <Field label="Descripción">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className={`${inputClass} min-h-[70px]`}
          placeholder="¿Qué hace este script?"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Autor">
          <input
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Namespace">
          <input
            value={form.namespace}
            onChange={(e) => setForm({ ...form, namespace: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="URLs @match (una por línea)">
          <textarea
            value={matchesText}
            onChange={(e) => setMatchesText(e.target.value)}
            className={`${inputClass} min-h-[90px] font-mono text-xs`}
            placeholder="*://*.example.com/*"
          />
        </Field>
        <Field label="Ejecutar en (@run-at)">
          <select
            value={form.runAt}
            onChange={(e) => setForm({ ...form, runAt: e.target.value })}
            className={inputClass}
          >
            {RUN_AT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.obfuscateByDefault}
              onChange={(e) => setForm({ ...form, obfuscateByDefault: e.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-slate-900 accent-emerald-400"
            />
            Ofuscar por defecto al generar
          </label>
        </Field>
      </div>

      <Field label="Permisos (@grant)">
        <div className="flex flex-wrap gap-2">
          {COMMON_GRANTS.map((grant) => (
            <button
              type="button"
              key={grant}
              onClick={() => toggleGrant(grant)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                form.grants.includes(grant)
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                  : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {grant}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Update URL (opcional)">
          <input
            value={form.updateUrl}
            onChange={(e) => setForm({ ...form, updateUrl: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Download URL (opcional)">
          <input
            value={form.downloadUrl}
            onChange={(e) => setForm({ ...form, downloadUrl: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Código JavaScript">
        <textarea
          required
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value })}
          spellCheck={false}
          className={`${inputClass} min-h-[320px] font-mono text-xs leading-relaxed`}
        />
      </Field>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
          {success}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-gradient-to-r from-emerald-400 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Guardando…" : mode === "create" ? "Crear script" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none ring-emerald-500/40 transition focus:ring-2";
