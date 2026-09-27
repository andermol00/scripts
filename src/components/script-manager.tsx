"use client";

import { useMemo, useState } from "react";

export type ScriptRow = {
  id: number;
  name: string;
  namespace: string;
  version: string;
  description: string;
  author: string;
  matches: string[];
  grants: string[];
  runAt: string;
  updateUrl: string;
  downloadUrl: string;
  code: string;
  codeHash: string;
  sourceUrl: string | null;
  obfuscateByDefault: boolean;
  lastCheckAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  name: "",
  version: "1.0.0",
  description: "",
  author: "",
  matches: "",
  grants: "GM_addStyle",
  runAt: "document-idle",
  sourceUrl: "",
  code: `// ==UserScript==\n// ==/UserScript==\n\n(function () {\n  "use strict";\n})();\n`,
  obfuscateByDefault: false,
};

export function ScriptManager({
  username,
  initialScripts,
}: {
  username: string;
  initialScripts: ScriptRow[];
}) {
  const [items, setItems] = useState<ScriptRow[]>(initialScripts);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPassword: "", newPin: "", newPassword: "" });

  const stats = useMemo(
    () => ({
      total: items.length,
      withSource: items.filter((s) => s.sourceUrl).length,
      obfuscated: items.filter((s) => s.obfuscateByDefault).length,
      bytes: items.reduce((acc, s) => acc + s.code.length, 0),
    }),
    [items],
  );

  async function call(url: string, init?: RequestInit) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(url, {
        ...init,
        headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Error");
      return data as Record<string, unknown>;
    } finally {
      setBusy(false);
    }
  }

  async function reload() {
    const data = await call("/api/scripts");
    setItems((data.scripts as ScriptRow[]) ?? []);
  }

  async function save() {
    try {
      if (editingId) {
        await call(`/api/scripts/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
        setMessage("Script actualizado");
      } else {
        await call("/api/scripts", { method: "POST", body: JSON.stringify(form) });
        setMessage("Script creado");
      }
      setForm({ ...emptyForm });
      setEditingId(null);
      await reload();
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Eliminar este script de la boveda?")) return;
    await call(`/api/scripts/${id}`, { method: "DELETE" });
    await reload();
    setMessage("Script eliminado");
  }

  async function edit(id: number) {
    const data = await call(`/api/scripts/${id}`);
    const script = data.script as ScriptRow;
    setEditingId(id);
    setForm({
      name: script.name,
      version: script.version,
      description: script.description,
      author: script.author,
      matches: script.matches.join("\n"),
      grants: script.grants.join("\n"),
      runAt: script.runAt,
      sourceUrl: script.sourceUrl ?? "",
      code: script.code,
      obfuscateByDefault: script.obfuscateByDefault,
    });
  }

  async function checkAll() {
    const data = await call("/api/scripts/check-updates", { method: "POST", body: "{}" });
    const updates = Number(data.updates ?? 0);
    setMessage(
      `${data.checked} revisados · ${updates} actualizados · ${
        (data.results as { status: string }[]).filter((r) => r.status === "error").length
      } errores`,
    );
    await reload();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/");
  }

  async function saveCredentials() {
    try {
      await call("/api/auth/credentials", { method: "POST", body: JSON.stringify(pinForm) });
      setMessage("Credenciales actualizadas");
      setPinForm({ currentPassword: "", newPin: "", newPassword: "" });
    } catch (error) {
      setMessage((error as Error).message);
    }
  }

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Boveda de {username}</h1>
          <p className="text-sm text-slate-400">
            {stats.total} scripts · {stats.withSource} con origen remoto · {stats.obfuscated}{" "}
            ofuscados · {(stats.bytes / 1024).toFixed(1)} KB
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={checkAll}
            disabled={busy}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-50"
          >
            Buscar actualizaciones
          </button>
          <button
            onClick={logout}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Salir
          </button>
        </div>
      </header>

      {message && (
        <p className="rounded-lg border border-emerald-800 bg-emerald-950/50 p-3 text-sm text-emerald-200">
          {message}
        </p>
      )}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-4 font-semibold">
            {editingId ? `Editando script #${editingId}` : "Nuevo script"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={input}
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={input}
              placeholder="Version"
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
            />
            <input
              className={input}
              placeholder="Autor"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
            <select
              className={input}
              value={form.runAt}
              onChange={(e) => setForm({ ...form, runAt: e.target.value })}
            >
              {["document-start", "document-body", "document-end", "document-idle"].map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
            <textarea
              className={`${input} sm:col-span-2`}
              rows={2}
              placeholder="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <textarea
              className={`${input} sm:col-span-2`}
              rows={2}
              placeholder="@match, uno por linea"
              value={form.matches}
              onChange={(e) => setForm({ ...form, matches: e.target.value })}
            />
            <textarea
              className={`${input} sm:col-span-2`}
              rows={2}
              placeholder="@grant, uno por linea"
              value={form.grants}
              onChange={(e) => setForm({ ...form, grants: e.target.value })}
            />
            <input
              className={`${input} sm:col-span-2`}
              placeholder="URL de origen (opcional, se sincroniza)"
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
            />
            <textarea
              className={`${input} sm:col-span-2`}
              rows={10}
              placeholder="Codigo del userscript"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.obfuscateByDefault}
                onChange={(e) => setForm({ ...form, obfuscateByDefault: e.target.checked })}
              />
              Servir ofuscado
            </label>
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50"
            >
              {editingId ? "Guardar cambios" : "Crear script"}
            </button>
            {editingId && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...emptyForm });
                }}
                className="text-sm text-slate-400 underline"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-4 font-semibold">Credenciales</h2>
            <div className="space-y-3">
              <input
                className={input}
                type="password"
                placeholder="Contrasena actual"
                value={pinForm.currentPassword}
                onChange={(e) => setPinForm({ ...pinForm, currentPassword: e.target.value })}
              />
              <input
                className={input}
                inputMode="numeric"
                maxLength={6}
                placeholder="Nuevo PIN (6 digitos)"
                value={pinForm.newPin}
                onChange={(e) =>
                  setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, "").slice(0, 6) })
                }
              />
              <input
                className={input}
                type="password"
                placeholder="Nueva contrasena (opcional)"
                value={pinForm.newPassword}
                onChange={(e) => setPinForm({ ...pinForm, newPassword: e.target.value })}
              />
              <button
                onClick={saveCredentials}
                disabled={busy}
                className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-600 disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="mb-4 font-semibold">Instalacion en Tampermonkey</h2>
            <p className="text-sm text-slate-400">
              Abre Tampermonkey → Utilidades → Importar desde URL y usa:
            </p>
            <code className="mt-2 block break-all rounded bg-slate-950 p-2 text-xs text-emerald-300">
              {"{tu-dominio}"}/api/scripts/{"{id}"}/download
            </code>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase text-slate-400">
            <tr>
              <th className="p-3">Script</th>
              <th className="p-3">Version</th>
              <th className="p-3">Origen</th>
              <th className="p-3">Actualizado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((script) => (
              <tr key={script.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                <td className="p-3">
                  <p className="font-medium">{script.name}</p>
                  <p className="text-xs text-slate-500">
                    {script.matches[0] ?? "sin @match"} · {(script.code.length / 1024).toFixed(1)} KB
                  </p>
                </td>
                <td className="p-3 text-slate-300">{script.version}</td>
                <td className="p-3 text-xs text-slate-400">
                  {script.sourceUrl ? (
                    <a
                      className="text-sky-400 underline"
                      href={script.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      sincronizado
                    </a>
                  ) : (
                    "local"
                  )}
                </td>
                <td className="p-3 text-xs text-slate-400">
                  {new Date(script.updatedAt).toLocaleString("es")}
                </td>
                <td className="p-3 text-right text-xs">
                  <a
                    className="mr-3 text-emerald-400 underline"
                    href={`/api/scripts/${script.id}/download`}
                  >
                    .user.js
                  </a>
                  <a
                    className="mr-3 text-sky-400 underline"
                    href={`/api/scripts/${script.id}/download?obfuscate=1`}
                  >
                    ofuscado
                  </a>
                  <button className="mr-3 text-slate-300 underline" onClick={() => edit(script.id)}>
                    editar
                  </button>
                  <button className="text-red-400 underline" onClick={() => remove(script.id)}>
                    borrar
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={5}>
                  Todavia no hay scripts guardados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
