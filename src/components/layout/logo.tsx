import { cn } from "@/components/ui/base";
import { BARRIGA, FAIXA_DIR, FAIXA_ESQ, MARCA_CLARO, MARCA_ESCURO, RAIO_RECORTE, SILHUETA, VIEWBOX_CIRCULO } from "@/lib/marca";

/**
 * Símbolo da GTM: círculo claro com o pinguim. `fundo` envolve o símbolo num quadrado
 * escuro arredondado (como o ícone do app), que lê bem nos temas claro e escuro.
 */
export function SimboloGTM({ className, fundo = true, titulo }: { className?: string; fundo?: boolean; titulo?: string }) {
  const id = "gtm-recorte";
  const simbolo = (
    <svg viewBox={VIEWBOX_CIRCULO} className={fundo ? "size-[78%]" : className} role={titulo ? "img" : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true}>
      <circle cx="640" cy="640" r="366" fill={MARCA_CLARO} />
      <clipPath id={id}>
        <circle cx="640" cy="640" r={RAIO_RECORTE} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={SILHUETA} fill={MARCA_ESCURO} />
        <path d={BARRIGA} fill={MARCA_CLARO} />
        <path d={FAIXA_ESQ} fill={MARCA_CLARO} />
        <path d={FAIXA_DIR} fill={MARCA_CLARO} />
      </g>
    </svg>
  );
  if (!fundo) return simbolo;
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-[28%] bg-[#141414] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_8px_18px_-10px_rgb(0_0_0/0.6)] ring-1 ring-white/10",
        className,
      )}
    >
      {simbolo}
    </span>
  );
}

/** Marca completa: símbolo + "GTM Hub / Soluções". `escuro` = texto escuro (sobre o conteúdo claro). */
export function Logo({ escuro = false, compacto = false }: { escuro?: boolean; compacto?: boolean }) {
  return (
    <span className="group/logo inline-flex items-center gap-2.5">
      <SimboloGTM className="size-10 transition-transform duration-300 ease-suave group-hover/logo:-rotate-6 group-hover/logo:scale-105" />
      <span className={cn(compacto && "sr-only", escuro ? "text-tinta" : "text-white")}>
        <span className="block text-[15px] font-semibold leading-none tracking-tight">GTM Hub</span>
        <span className={cn("mt-1 block text-[11px] leading-none", escuro ? "text-tinta-3" : "text-nevoa")}>Soluções</span>
      </span>
    </span>
  );
}
