"use client";

import { useState } from "react";

export function CopyButton({ path, label = "Copiar" }: { path: string; label?: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function copy() {
    setState("loading");
    try {
      const res = await fetch(`/api/download?path=${encodeURIComponent(path)}&raw=1`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("error");
    } finally {
      setTimeout(() => setState("idle"), 1800);
    }
  }

  const text =
    state === "loading"
      ? "Copiando..."
      : state === "done"
        ? "Copiado"
        : state === "error"
          ? "Error"
          : label;

  return (
    <button
      onClick={copy}
      className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-300"
    >
      {text}
    </button>
  );
}
