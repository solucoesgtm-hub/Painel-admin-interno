// Marca provisória do GTM Hub (substituir pelos arquivos de docs/marca quando chegarem).
export function Logo({ claro = true }: { claro?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="GTM Hub">
      <svg aria-hidden viewBox="0 0 32 32" className="size-8">
        <rect width="32" height="32" rx="8" fill="#3f6fd8" />
        <path d="M9 21.5V10.5h6.2" stroke="#f2f1ec" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M9 16h4.5" stroke="#7fa2ff" strokeWidth="2.6" strokeLinecap="round" />
        <path d="M18 21.5l2.6-11 2.4 6.5 2-4" stroke="#f2f1ec" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
      <span className={claro ? "text-offwhite" : "text-tinta"}>
        <span className="block text-[15px] font-semibold leading-none tracking-tight">GTM Hub</span>
        <span className={`mt-1 block text-[10.5px] leading-none tracking-[0.12em] uppercase ${claro ? "text-[#8b90a6]" : "text-tinta-3"}`}>
          Soluções · Interno
        </span>
      </span>
    </span>
  );
}
