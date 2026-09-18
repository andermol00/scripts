import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";
import { getAuthenticatedUser } from "@/lib/auth-guard";

export default async function AppLayout({ children }: { children: ReactNode }) {
  // Independent server-side guard: every page under this layout re-checks
  // the session on the Node.js runtime, regardless of the edge proxy.
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-lg font-bold text-slate-950">
              TM
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight text-white">Tampermonkey Vault</p>
              <p className="text-xs leading-tight text-slate-400">Bóveda privada de userscripts</p>
            </div>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Mis scripts
            </Link>
            <Link
              href="/scripts/new"
              className="rounded-lg px-3 py-2 font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Nuevo script
            </Link>
            <Link
              href="/tools"
              className="rounded-lg px-3 py-2 font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
            >
              Ofuscador rápido
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
