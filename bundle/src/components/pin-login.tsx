"use client";

import { useEffect, useState, type FormEvent } from "react";

type Mode = "pin" | "locked" | "password" | "success";

export function PinLogin() {
  const [pin, setPin] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<Mode>("pin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);

  useEffect(() => {
    if (lockTimeLeft <= 0) return;
    const timer = setInterval(() => setLockTimeLeft((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [lockTimeLeft]);

  async function submit(payload: Record<string, unknown>) {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        requiresPassword?: boolean;
        unlockTime?: number;
      };

      if (res.ok) {
        setMode("success");
        setTimeout(() => window.location.assign("/dashboard"), 700);
        return;
      }

      if (data.requiresPassword) {
        setMode("password");
        if (data.unlockTime && data.unlockTime > 0) setLockTimeLeft(data.unlockTime);
      }
      setError(data.error ?? "No se pudo validar el acceso");
    } catch {
      setError("Error de conexion con el servidor");
    } finally {
      setLoading(false);
    }
  }

  function onPinSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit({ pin, requirePassword: false });
  }

  function onPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit({ pin, requirePassword: true, password });
  }

  if (mode === "success") {
    return (
      <div className="w-full rounded-2xl border border-emerald-800 bg-emerald-950/70 p-8 text-center">
        <h1 className="text-2xl font-bold text-emerald-100">Acceso valido</h1>
        <p className="mt-2 text-emerald-300">Redirigiendo al boveda...</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
      <h1 className="text-3xl font-bold text-white">Tampervault</h1>
      <p className="mt-1 text-sm text-slate-400">
        {mode === "password"
          ? "Bloqueo activo: ingresa tu contrasena para continuar"
          : "Boveda privada de userscripts"}
      </p>

      {mode === "pin" ? (
        <form onSubmit={onPinSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-slate-300" htmlFor="pin">
            PIN de acceso (6 digitos)
          </label>
          <input
            id="pin"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000000"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            required
            disabled={loading}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />

          {error && (
            <p className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      ) : (
        <form onSubmit={onPasswordSubmit} className="mt-8 space-y-4">
          {lockTimeLeft > 0 && (
            <p className="rounded-lg border border-amber-800 bg-amber-950/50 p-3 text-sm text-amber-200">
              Bloqueado. Espera {lockTimeLeft}s o usa tu contrasena.
            </p>
          )}

          <input
            type="password"
            autoComplete="current-password"
            placeholder="Contrasena de recuperacion"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            maxLength={80}
            required
            disabled={loading}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none disabled:opacity-50"
          />

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? "Verificando..." : "Desbloquear"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("pin");
              setError("");
              setPassword("");
            }}
            className="w-full text-xs text-slate-400 underline hover:text-slate-200"
          >
            Volver al PIN
          </button>
        </form>
      )}

      <p className="mt-8 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">
        <strong className="text-slate-400">Politica de seguridad:</strong> 3 intentos de
        PIN, bloqueo de 5 minutos y despues contrasena obligatoria durante 10 minutos.
      </p>
    </div>
  );
}
