"use client";

import { useState } from "react";

type CopyOutputProps = {
  value: string;
};

export function CopyOutput({ value }: CopyOutputProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-violet-400/50 hover:bg-violet-400/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-violet-400"
    >
      {copied ? (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
          <path d="m4 10.2 3.5 3.5L16 5.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
          <rect x="6.2" y="5.7" width="8.5" height="9.5" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M4.8 12.8H4A1.2 1.2 0 0 1 2.8 11.6V4A1.2 1.2 0 0 1 4 2.8h6.8A1.2 1.2 0 0 1 12 4v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
      {copied ? "Copiado" : "Copiar resultado"}
    </button>
  );
}
