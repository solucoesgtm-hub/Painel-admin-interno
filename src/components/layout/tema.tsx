"use client";
// Alterna claro/escuro: grava no cookie (lido no layout raiz) e aplica na hora, sem recarregar.
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/components/ui/base";
import { COOKIE_TEMA, type Tema } from "@/lib/tema";

function temaAtual(): Tema {
  const d = document.documentElement.dataset.tema;
  if (d === "claro" || d === "escuro") return d;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "escuro" : "claro";
}

export function useTema() {
  const [tema, setTema] = useState<Tema | null>(null);
  useEffect(() => setTema(temaAtual()), []);
  const alternar = () => {
    const novo: Tema = temaAtual() === "escuro" ? "claro" : "escuro";
    document.documentElement.dataset.tema = novo;
    document.cookie = `${COOKIE_TEMA}=${novo}; path=/; max-age=31536000; samesite=lax`;
    setTema(novo);
  };
  return { tema, alternar };
}

/** Botão redondo (dock). */
export function BotaoTema({ className, comDica = false }: { className?: string; comDica?: boolean }) {
  const { tema, alternar } = useTema();
  const rotulo = tema === "escuro" ? "Usar tema claro" : "Usar tema escuro";
  const Icone = tema === "escuro" ? Sun : Moon;
  return (
    <button type="button" onClick={alternar} aria-label={rotulo} title={comDica ? undefined : rotulo} className={cn("group relative", className)}>
      <Icone aria-hidden className="size-[18px]" />
      {comDica && <Dica>{rotulo}</Dica>}
    </button>
  );
}

/** Linha de menu (conta, menu "Mais"). */
export function LinhaTema({ className }: { className?: string }) {
  const { tema, alternar } = useTema();
  const Icone = tema === "escuro" ? Sun : Moon;
  return (
    <button type="button" onClick={alternar} className={className}>
      <Icone aria-hidden className="size-[18px] shrink-0 text-tinta-3" />
      <span className="flex-1 text-left">{tema === "escuro" ? "Tema claro" : "Tema escuro"}</span>
    </button>
  );
}

/** Dica à direita de um item do dock (aparece no hover e no foco do teclado). */
export function Dica({ children }: { children: React.ReactNode }) {
  return (
    <span
      role="tooltip"
      className="pointer-events-none absolute left-full top-1/2 ml-3 -translate-x-1 -translate-y-1/2 whitespace-nowrap rounded-full bg-tinta px-3 py-1.5 text-[13px] font-medium text-offwhite opacity-0 shadow-flutuante transition-[opacity,transform] duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
    >
      {children}
    </span>
  );
}
