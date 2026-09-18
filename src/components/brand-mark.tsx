type BrandMarkProps = {
  compact?: boolean;
  light?: boolean;
};

export function BrandMark({ compact = false, light = false }: BrandMarkProps) {
  const textColor = light ? "text-white" : "text-slate-950";
  return (
    <div className="flex items-center gap-3" aria-label="Script Vault">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#6557ff] shadow-[0_10px_25px_rgba(101,87,255,0.28)]">
        <svg viewBox="0 0 32 32" fill="none" className="size-6" aria-hidden="true">
          <path d="M9.5 4.5h13l3 4.2v18.8H6.5V8.7l3-4.2Z" stroke="white" strokeWidth="2.1" strokeLinejoin="round" />
          <path d="M12 15.2 9.7 17.5 12 19.8M20 15.2l2.3 2.3-2.3 2.3M17.7 13.6l-3.3 7.8" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {!compact && (
        <div className="leading-none">
          <p className={`text-[15px] font-black tracking-[-0.04em] ${textColor}`}>Script Vault</p>
          <p className={`mt-1 text-[10px] font-bold uppercase tracking-[0.18em] ${light ? "text-slate-400" : "text-slate-500"}`}>Tampermonkey Studio</p>
        </div>
      )}
    </div>
  );
}
