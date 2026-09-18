"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  id: number;
  name: string;
  description: string;
  version: string;
  matches: string[];
  updatedAt: string;
};

export default function ScriptListItem({ id, name, description, version, matches, updatedAt }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/scripts/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        setDeleting(false);
        alert("No se pudo eliminar el script.");
      }
    } catch {
      setDeleting(false);
      alert("Error de red al eliminar.");
    }
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-emerald-400/30 hover:bg-white/[0.05]">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-white">{name}</h2>
          <span className="shrink-0 rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-300">
            v{version}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-400">
          {description || "Sin descripción."}
        </p>
        {matches.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {matches.slice(0, 3).map((m) => (
              <span
                key={m}
                className="truncate rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400"
              >
                {m}
              </span>
            ))}
            {matches.length > 3 && (
              <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                +{matches.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
        <span className="text-[11px] text-slate-500">
          Actualizado {new Date(updatedAt).toLocaleDateString("es-ES")}
        </span>
        <div className="flex items-center gap-2">
          <Link
            href={`/scripts/${id}`}
            className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition hover:bg-white/20"
          >
            Abrir
          </Link>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
          >
            {deleting ? "…" : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}
