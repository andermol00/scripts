import QuickObfuscator from "@/components/quick-obfuscator";

export default function ToolsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Ofuscador rápido</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pega cualquier fragmento de JavaScript, elige si quieres ofuscarlo (y con qué nivel) y
          obtén el resultado al instante. No se guarda nada en la bóveda.
        </p>
      </div>
      <QuickObfuscator />
    </div>
  );
}
