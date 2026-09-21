import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tampervault — Bóveda de scripts para Tampermonkey",
  description:
    "Guarda tus scripts de Tampermonkey y genera userscripts (ofuscados o no) con un login ultra-seguro.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
