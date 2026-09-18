import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Script Vault · Tampermonkey Studio",
  description: "Bóveda privada para guardar y preparar scripts de Tampermonkey.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-[#f6f7fb] text-slate-900 antialiased">{children}</body>
    </html>
  );
}
