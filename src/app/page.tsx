import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { loginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="min-h-screen bg-[#f7f7fb] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(30,27,75,0.12)] lg:grid-cols-[1.06fr_0.94fr] lg:min-h-[calc(100vh-4rem)]">
        <section className="relative hidden overflow-hidden bg-[#16152d] px-10 py-10 text-white lg:flex lg:flex-col xl:px-14 xl:py-12">
          <div className="absolute -left-16 -top-24 size-72 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 size-96 rounded-full bg-indigo-400/10 blur-3xl" />
          <div className="relative flex items-center justify-between">
            <BrandMark light />
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">Private workspace</span>
          </div>

          <div className="relative my-auto max-w-xl py-16">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-3 py-1.5 text-xs font-bold text-violet-200">
              <span className="size-1.5 rounded-full bg-violet-300 shadow-[0_0_0_4px_rgba(196,181,253,0.1)]" />
              Tu bóveda privada de automatizaciones
            </div>
            <h1 className="max-w-lg text-4xl font-black leading-[1.02] tracking-[-0.06em] text-white xl:text-5xl">
              Tus scripts. <span className="text-violet-300">Tu control.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Conserva tus userscripts de Tampermonkey, genera una versión de entrega y tenlos listos cuando los necesites.
            </p>

            <div className="mt-12 grid max-w-lg gap-3 sm:grid-cols-3">
              {[
                ["01", "Sesiones opacas", "Tokens de alta entropía"],
                ["02", "Acceso limitado", "Protección ante fuerza bruta"],
                ["03", "Datos privados", "Aislados por cuenta"],
              ].map(([number, title, detail]) => (
                <div key={number} className="rounded-2xl border border-white/[0.09] bg-white/[0.045] p-4 backdrop-blur-sm">
                  <span className="font-mono text-[11px] font-bold text-violet-300">{number}</span>
                  <p className="mt-4 text-sm font-extrabold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{detail}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs text-slate-500">Script Vault · workspace protegido</p>
        </section>

        <section className="flex min-h-[calc(100vh-2rem)] flex-col px-6 py-7 sm:px-10 sm:py-10 lg:min-h-0 lg:px-14 lg:py-12 xl:px-20">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <div className="my-auto w-full max-w-md lg:mx-auto">
            <div className="mb-8 mt-12 lg:mt-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Acceso seguro</p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">Bienvenido de vuelta</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">Ingresa a tu espacio privado para gestionar tus automatizaciones.</p>
            </div>

            {error && (
              <div role="alert" className="mb-5 flex gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">
                <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="none" aria-hidden="true">
                  <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M10 6.3v4.2M10 13.3v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <form action={loginAction} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Correo electrónico</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="tu@correo.com"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-700">Contraseña</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={12}
                  placeholder="••••••••••••"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100"
                />
              </label>
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#6557ff] text-sm font-extrabold text-white shadow-[0_12px_22px_rgba(101,87,255,0.22)] transition hover:bg-[#5648eb] focus:outline-none focus:ring-4 focus:ring-violet-200">
                Entrar a mi bóveda
                <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true">
                  <path d="M4 10h11m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>

            <div className="my-7 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />o<span className="h-px flex-1 bg-slate-200" /></div>
            <p className="text-center text-sm text-slate-500">
              ¿Primera vez?{" "}
              <a href="/register" className="font-bold text-violet-700 underline decoration-violet-300 underline-offset-4 transition hover:text-violet-900">Crear acceso protegido</a>
            </p>
          </div>
          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-slate-400 lg:justify-start">
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true"><rect x="4" y="8.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5" /><path d="M6.8 8.5V6.3a3.2 3.2 0 0 1 6.4 0v2.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            Cookies de sesión seguras · No almacenamos tu contraseña legible
          </div>
        </section>
      </div>
    </main>
  );
}
