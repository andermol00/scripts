import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tampermonkey Vault — Bóveda privada de userscripts",
  description:
    "Guarda tus scripts de Tampermonkey y genera versiones ofuscadas o limpias listas para instalar, protegido con login ultra seguro.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
