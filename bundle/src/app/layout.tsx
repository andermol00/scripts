import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tampervault — boveda de userscripts",
  description:
    "Boveda privada con PIN para almacenar, versionar y distribuir userscripts de Tampermonkey.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100 antialiased">{children}</body>
    </html>
  );
}
