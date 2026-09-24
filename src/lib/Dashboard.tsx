"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScriptRecord, ScriptForm } from "@/lib/types";
import ScriptEditor from "./ScriptEditor";

const EMPTY: ScriptForm = {
  name: "",
  namespace: "http://tampermonkey.net/",
  version: "1.0.0",
  description: "",
  author: "",
  matches: ["*://*/*"],
  grants: ["none"],
  runAt: "document-idle",
  updateUrl: "",
  downloadUrl: "",
  code: "console.log('Hola desde Tampervault');",
  obfuscateByDefault: false,
};

function toForm(s: ScriptRecord): ScriptForm {
  return {
    name: s.name,
    namespace: s.namespace,
    version: s.version,
    description: s.description,
    author: s.author,
    matches: Array.isArray(s.matches) ? s.matches : [],
    grants: Array.isArray(s.grants) ? s.grants : [],
    runAt: s.runAt,
    updateUrl: s.updateUrl ?? "",
    downloadUrl: s.downloadUrl ?? "",
    code: s.code,
    obfuscateByDefault: s.obfuscateByDefault,
  };
}

type View =
  | { mode: "list" }
  | { mode: "new"; importOpen: boolean }
  | { mode: "edit"; id: number };

export default function Dashboard({
  username,
  onLogout,
}: {
  username: string;
  onLogout: () => void;
}) {
  const [scripts, setScripts] = useState<ScriptRecord[]>([]);
  const [view, setView] = useState<View>({ mode: "list" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<{ id: number; code: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/scripts");
    if (res.ok) {
      const data = await res.json();
      setScripts(data.scripts);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function save(form: ScriptForm) {
    setSaving(true);
    const isEdit = view.mode === "edit";
    const url = isEdit ? `/api/scripts/${(view as { id: number }).id}` : "/api/scripts";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setView({ mode: "list" });
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Error al guardar");
    }
  }

  async function remove(id: number) {
    if (!confirm("¿Eliminar este script definitivamente?")) return;
    await fetch(`/api/scripts/${id}`, { method: "DELETE" });
    if (preview?.id === id) setPreview(null);
    await load();
  }

  async function showPreview(id: number) {
    const res = await fetch(`/api/scripts/${id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      alert("No se pudo generar el script.");
      return;
    }
    const data = await res.json();
    setPreview({ id, code: data.code });
    setCopied(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  async function copyPreview() {
    if (!preview) return;
    await navigator.clipboard.writeText(preview.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const editing =
    view.mode === "edit" ? scripts.find((s) => s.id === view.id) : null;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20">
              <svg className="h-6 w-6 text-indigo-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4Z" fill="currentColor"/>
                <path d="M13 12.5C13 13.33 12.33 14 11.5 14C10.67 14 10 13.33 10 12.5C10 11.67 10.67 11 11.5 11C12.33 11 13 11.67 13 12.5Z" fill="currentColor"/>
                <path d="M15 6H9C7.9 6 7 6.9 7 8V16C7 17.1 7.9 18 9 18H15C16.1 18 17 17.1 17 16V8C17 6.9 16.1 6 15 6ZM15 16H9V8H15V16Z" fill="currentColor"/>
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Tampervault</h1>
              <p className="text-xs text-slate-500">
                {username}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {view.mode === "list" && (
              <>
                <button
                  onClick={() => setView({ mode: "new", importOpen: true })}
                  className="rounded-lg border border-indigo-500/50 bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                >
                  📋 Pegar existente
                </button>
                <button
                  onClick={() => setView({ mode: "new", importOpen: false })}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  + Nuevo script
                </button>
              </>
            )}
            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {view.mode !== "list" ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <h2 className="mb-6 text-lg font-semibold">
              {view.mode === "new" ? "Nuevo script" : "Editar script"}
            </h2>
            <ScriptEditor
              initial={editing ? toForm(editing) : EMPTY}
              saving={saving}
              onSave={save}
              onCancel={() => setView({ mode: "list" })}
              startOpenImport={
                view.mode === "new" ? view.importOpen : false
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Tus scripts ({scripts.length})
              </h2>
              {loading ? (
                <p className="text-sm text-slate-500">Cargando…</p>
              ) : scripts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                  Aún no tienes scripts. Crea el primero con
                  <span className="text-indigo-400"> “+ Nuevo script”</span>.
                </div>
              ) : (
                <ul className="space-y-3">
                  {scripts.map((s) => (
                    <li
                      key={s.id}
                      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-slate-700"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate font-medium">{s.name}</h3>
                            <span className="mono rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                              v{s.version}
                            </span>
                            {s.obfuscateByDefault && (
                              <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                                ofuscado
                              </span>
                            )}
                          </div>
                          {s.description && (
                            <p className="mt-1 truncate text-xs text-slate-500">
                              {s.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          onClick={() => showPreview(s.id)}
                          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700"
                        >
                          Generar
                        </button>
                        <a
                          href={`/api/scripts/${s.id}/raw?download=1`}
                          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700"
                        >
                          Descargar .user.js
                        </a>
                        <button
                          onClick={() => setView({ mode: "edit", id: s.id })}
                          className="rounded-md bg-slate-800 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-700"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => remove(s.id)}
                          className="rounded-md bg-red-500/10 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20"
                        >
                          Eliminar
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="lg:sticky lg:top-20 lg:self-start">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  Userscript generado (Ofuscado)
                </h2>
                <div className="flex items-center gap-2">
                  {preview && (
                    <button
                      onClick={copyPreview}
                      className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
                    >
                      {copied ? "¡Copiado!" : "Copiar"}
                    </button>
                  )}
                </div>
              </div>
              {preview ? (
                <pre className="mono max-h-[70vh] overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-emerald-200">
                  {preview.code}
                </pre>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">
                  Pulsa <span className="text-indigo-400">“Generar”</span> en un
                  script para ver aquí el userscript listo para pegar en
                  Tampermonkey.
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-600">
        Tampervault · desplegable en Render.com desde GitHub · sesiones seguras
      </footer>
    </div>
  );
}
