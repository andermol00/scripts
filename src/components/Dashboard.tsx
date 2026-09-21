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
  matches: "*://*/*",
  grants: "none",
  runAt: "document-idle",
  code: "console.log('Hola desde Tampervault');",
  obfuscate: false,
};

function toForm(s: ScriptRecord): ScriptForm {
  const parse = (j: string) => {
    try {
      const a = JSON.parse(j);
      return Array.isArray(a) ? a.join("\n") : "";
    } catch {
      return "";
    }
  };
  return {
    name: s.name,
    namespace: s.namespace,
    version: s.version,
    description: s.description,
    author: s.author,
    matches: parse(s.matches),
    grants: parse(s.grants),
    runAt: s.runAt,
    code: s.code,
    obfuscate: s.obfuscate,
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
    const res = await fetch(`/api/scripts/${id}/raw`);
    const code = await res.text();
    setPreview({ id, code });
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
            <span className="text-2xl">🗄️</span>
            <div>
              <h1 className="text-sm font-bold leading-tight">Tampervault</h1>
              <p className="text-xs text-slate-500">
                Bóveda de userscripts · {username}
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
                            {s.obfuscate && (
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
                  Userscript generado
                </h2>
                {preview && (
                  <button
                    onClick={copyPreview}
                    className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
                  >
                    {copied ? "¡Copiado!" : "Copiar"}
                  </button>
                )}
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
