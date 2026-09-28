import { redirect } from "next/navigation";
import { PinLogin } from "@/components/pin-login";
import { getCurrentUser } from "@/lib/session";
import { DEFAULT_PIN, DEFAULT_PASSWORD, ensureSeed } from "@/db/seed";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  await ensureSeed();
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-md space-y-4">
        <PinLogin />
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
          <p className="font-semibold text-slate-300">Primer acceso</p>
          <p className="mt-1">
            PIN <code className="text-emerald-400">{DEFAULT_PIN}</code> · contrasena de
            recuperacion <code className="text-emerald-400">{DEFAULT_PASSWORD}</code>
          </p>
          <p className="mt-1">Cambialos desde el panel, en Credenciales.</p>
          <a
            href="/descargar"
            className="mt-3 inline-block font-semibold text-emerald-400 underline hover:text-emerald-300"
          >
            Descargar los archivos del repo →
          </a>
        </div>
      </div>
    </main>
  );
}
