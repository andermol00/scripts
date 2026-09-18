import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { registerAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

type RegisterPageProps = {
  searchParams: Promise<{ error?: string | string[] }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="min-h-screen bg-[#f7f7fb] px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(30,27,75,0.12)] md:grid md:grid-cols-[0.72fr_1.28fr]">
        <aside className="relative overflow-hidden bg-[#16152d] p-8 text-white sm:p-10 md:min-h-[720px]">
          <div className="absolute -right-20 -top-20 size-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative">
            <BrandMark light />
            <div className="mt-20 md:mt-28">
              <div className="grid size-12 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-200">
                <svg viewBox="0 0 24 24" className="size-6" fill="none" aria-hidden="true"><path d="M12 3.5 5.3 6.2v5.1c0 4.1 2.8 7.9 6.7 9.2 3.9-1.3 6.7-5.1 6.7-9.2V6.2L12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="m9 12 2 2 4.2-4.4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h1 className="mt-6 text-3xl font-black leading-tight tracking-[-0.05em]">Un espacio que comienza cerrado.</h1>
              <p className="mt-4 text-sm leading-6 text-slate-300">La primera cuenta puede inicializar la bóveda. Después, las altas exigen la clave privada configurada por la persona administradora.</p>
            </div>
            <div className="relative mt-14 space-y-4 border-t border-white/10 pt-6 text-xs leading-5 text-slate-400">
              <p className="flex gap-3"><span className="font-mono text-violet-300">01</span> Contraseñas derivadas con scrypt y sal única.</p>
              <p className="flex gap-3"><span className="font-mono text-violet-300">02</span> Sesiones revocables almacenadas como hashes.</p>
              <p className="flex gap-3"><span className="font-mono text-violet-300">03</span> Formularios protegidos contra solicitudes cruzadas.</p>
            </div>
          </div>
        </aside>

        <section className="p-7 sm:p-10 md:px-14 md:py-12">
          <a href="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-violet-700">
            <svg viewBox="0 0 20 20" className="size-3.5" fill="none" aria-hidden="true"><path d="m11.5 4-6 6 6 6M6 10h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Volver a iniciar sesión
          </a>
          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Alta controlada</p>
            <h2 className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-950">Crea tu acceso</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Usa una contraseña única. Si la bóveda ya fue inicializada, necesitarás la clave de alta.</p>
          </div>

          {error && <div role="alert" className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-5 text-rose-800">{error}</div>}

          <form action={registerAction} className="mt-7 grid gap-5 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Nombre</span>
              <input name="displayName" required minLength={2} maxLength={80} autoComplete="name" placeholder="Cómo te identificamos" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Correo electrónico</span>
              <input name="email" type="email" required autoComplete="email" placeholder="tu@correo.com" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Contraseña</span>
              <input name="password" type="password" required minLength={12} maxLength={200} autoComplete="new-password" placeholder="Mínimo 12 caracteres" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-slate-700">Confirmar contraseña</span>
              <input name="confirmPassword" type="password" required minLength={12} maxLength={200} autoComplete="new-password" placeholder="Repite la contraseña" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-sm font-bold text-slate-700">Clave de alta <span className="font-normal text-slate-400">(requerida si ya existe una cuenta)</span></span>
              <input name="enrollmentCode" type="password" autoComplete="off" placeholder="Clave privada de administrador" className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" />
            </label>
            <button className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-[#6557ff] text-sm font-extrabold text-white shadow-[0_12px_22px_rgba(101,87,255,0.22)] transition hover:bg-[#5648eb] focus:outline-none focus:ring-4 focus:ring-violet-200 sm:col-span-2">
              Crear bóveda protegida
              <svg viewBox="0 0 20 20" className="size-4" fill="none" aria-hidden="true"><path d="M10 4v12m-6-6h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </form>
          <p className="mt-5 text-center text-xs leading-5 text-slate-400">Al continuar se crea una sesión privada de 7 días. Puedes cerrarla en cualquier momento.</p>
        </section>
      </div>
    </main>
  );
}
