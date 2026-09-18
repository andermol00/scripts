import ScriptEditor from "@/components/script-editor";

export default function NewScriptPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white">Nuevo userscript</h1>
        <p className="mt-1 text-sm text-slate-400">
          Completa los metadatos y pega tu código. Podrás generar la versión ofuscada después de
          guardarlo.
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <ScriptEditor mode="create" />
      </div>
    </div>
  );
}
