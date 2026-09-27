"use client";

import { useState, FormEvent } from "react";

export function PinLogin() {
  const [pin, setPin] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lockTimeLeft, setLockTimeLeft] = useState(0);

  if (lockTimeLeft > 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-red-900 border border-red-700 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-red-100 mb-4">Bloqueado</h1>
          <p className="text-red-200 mb-6">
            Demasiados intentos fallidos. Por favor espera:
          </p>
          <div className="text-4xl font-bold text-red-400 text-center mb-6">
            {lockTimeLeft}s
          </div>
          <p className="text-red-300 text-sm">
            Se requiere contraseña después del bloqueo
          </p>
        </div>
      </div>
    );
  }

  const handlePinSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, requirePassword: false }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        if (data.requiresPassword) {
          setRequiresPassword(true);
          if (data.unlockTime) {
            setLockTimeLeft(data.unlockTime);
            const interval = setInterval(() => {
              setLockTimeLeft((prev) => {
                if (prev <= 1) {
                  clearInterval(interval);
                  return 0;
                }
                return prev - 1;
              });
            }, 1000);
          }
        } else {
          setError(data.error || "PIN incorrecto");
          setPin("");
        }
      }
    } catch (err) {
      setError("Error en la conexión");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin, requirePassword: true, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
      } else {
        setError(data.error || "Contraseña incorrecta");
        setPassword("");
      }
    } catch (err) {
      setError("Error en la conexión");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-green-900 border border-green-700 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-green-100">✓ Acceso válido</h1>
          <p className="text-green-200 mt-2">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  if (requiresPassword && lockTimeLeft <= 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6">Contraseña requerida</h1>
          <p className="text-gray-400 mb-6">
            Ingresa tu contraseña para continuar después del bloqueo
          </p>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="hidden"
              value={pin}
              readOnly
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={50}
              required
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />

            {error && (
              <div className="text-red-400 text-sm font-medium">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verificando..." : "Desbloquear"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-2">🔐 Tampervault</h1>
        <p className="text-gray-400 mb-8">Ingresa tu PIN de acceso</p>

        <form onSubmit={handlePinSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">
              PIN (6 dígitos)
            </label>
            <input
              type="password"
              inputMode="numeric"
              placeholder="000000"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              required
              disabled={loading}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 rounded p-3 text-red-100 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-700">
          <p className="text-gray-400 text-xs">
            <strong>Sistema de seguridad:</strong> 3 intentos máximos.
            Bloqueo de 5 minutos si fallas. Después se requerirá contraseña.
          </p>
        </div>
      </div>
    </div>
  );
}
