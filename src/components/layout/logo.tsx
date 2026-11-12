// Marca provisória do GTM Hub (substituir pelos arquivos de docs/marca quando chegarem).
// Por padrão para fundo grafite; `escuro` usa texto escuro sobre o conteúdo claro.
export function Logo({ escuro = false }: { escuro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg aria-hidden viewBox="0 0 36 36" className="size-9 shrink-0">
        <rect width="36" height="36" rx="10" fill="#3f6fd8" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="9.5" fill="none" stroke="#ffffff" strokeOpacity="0.22" />
        <path d="M10 24.5V11.5h7" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <path d="M10 18h5" stroke="#cfe0ff" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M20 24.5l3-12.5 2.6 7.2 2.4-4.6" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className={escuro ? "text-tinta" : "text-white"}>
        <span className="block text-[15px] font-semibold leading-none tracking-tight">GTM Hub</span>
        <span className={`mt-1 block text-[11px] leading-none ${escuro ? "text-tinta-3" : "text-nevoa"}`}>Soluções</span>
      </span>
    </span>
  );
}
