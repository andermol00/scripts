export function SetupNotice({
  error,
  hint,
}: {
  error?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-amber-800 bg-amber-950/50 p-4 text-xs text-amber-200">
      <p className="font-semibold text-amber-100">Configuración pendiente</p>
      <p className="mt-1">
        {error ?? "La base de datos no responde."}
      </p>
      {hint && <p className="mt-1 text-amber-300/80">{hint}</p>}
      <p className="mt-2 text-amber-300/80">
        El login seguirá fallando hasta que la conexión funcione.
      </p>
    </div>
  );
}
