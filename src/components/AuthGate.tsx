"use client";

import { useState } from "react";

type Props = {
  needsSetup: boolean;
  onAuthed: (username: string) => void;
};

function scorePassword(pw: string): { score: number; label: string } {
  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte", "Excelente"];
  return { score, label: labels[score] };
}

export default function AuthGate({ needsSetup, onAuthed }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pwInfo = scorePassword(password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (needsSetup && password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(needsSetup ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error de autenticación.");
      } else {
        onAuthed(data.username);
      }
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600/20 text-3xl ring-1 ring-indigo-500/40">
            🔐
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Tampervault</h1>
          <p className="mt-1 text-sm text-slate-400">
            {needsSetup
              ? "Crea la cuenta de administrador para proteger tu bóveda."
              : "Acceso restringido. Inicia sesión para continuar."}
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur"
        >
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Usuario
            </label>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Contraseña
            </label>
            <input
              type="password"
              autoComplete={needsSetup ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            {needsSetup && password.length > 0 && (
              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                  <div
                    className={`h-full transition-all ${
                      pwInfo.score <= 2
                        ? "bg-red-500"
                        : pwInfo.score <= 3
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                    style={{ width: `${(pwInfo.score / 5) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Seguridad: {pwInfo.label} · mín. 12 caracteres con mayúsculas,
                  números y símbolos.
                </p>
              </div>
            )}
          </div>

          {needsSetup && (
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-400">
                Confirmar contraseña
              </label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading
              ? "Procesando…"
              : needsSetup
                ? "Crear cuenta segura"
                : "Iniciar sesión"}
          </button>

          <p className="pt-1 text-center text-xs text-slate-600">
            Protegido con scrypt · sesiones firmadas HMAC · límite de intentos
          </p>
        </form>
      </div>
    </div>
  );
}
