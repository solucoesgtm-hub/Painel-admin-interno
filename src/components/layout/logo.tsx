// Marca provisória do GTM Hub (substituir pelos arquivos de docs/marca quando chegarem).
export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg aria-hidden viewBox="0 0 36 36" className="size-9 shrink-0">
        <defs>
          <linearGradient id="logo-fundo" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5a86ec" />
            <stop offset="1" stopColor="#2f58b5" />
          </linearGradient>
        </defs>
        <rect width="36" height="36" rx="11" fill="url(#logo-fundo)" />
        <rect x="0.5" y="0.5" width="35" height="35" rx="10.5" fill="none" stroke="#ffffff" strokeOpacity="0.25" />
        <path d="M10 24.5V11.5h7" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <path d="M10 18h5" stroke="#cfe0ff" strokeWidth="2.8" strokeLinecap="round" />
        <path d="M20 24.5l3-12.5 2.6 7.2 2.4-4.6" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      {!compacto && (
        <span className="text-white">
          <span className="block text-[15px] font-semibold leading-none tracking-tight">GTM Hub</span>
          <span className="mt-1 block text-[10px] uppercase leading-none tracking-[0.16em] text-tinta-3">Soluções</span>
        </span>
      )}
    </span>
  );
}
