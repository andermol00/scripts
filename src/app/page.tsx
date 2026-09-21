"use client";

import { useEffect, useState } from "react";
import AuthGate from "@/components/AuthGate";
import Dashboard from "@/components/Dashboard";

type Status = {
  needsSetup: boolean;
  authenticated: boolean;
  username: string | null;
};

export default function Home() {
  const [status, setStatus] = useState<Status | null>(null);

  async function refresh() {
    const res = await fetch("/api/auth/status", { cache: "no-store" });
    const data = await res.json();
    setStatus(data);
  }

  useEffect(() => {
    refresh();
  }, []);

  if (!status) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }

  if (!status.authenticated) {
    return (
      <AuthGate
        needsSetup={status.needsSetup}
        onAuthed={(username) =>
          setStatus({ needsSetup: false, authenticated: true, username })
        }
      />
    );
  }

  return (
    <Dashboard
      username={status.username ?? "admin"}
      onLogout={() =>
        setStatus({ needsSetup: false, authenticated: false, username: null })
      }
    />
  );
}
