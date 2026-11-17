"use client";
// "Visto por último" dos sócios: bolinha verde quando online e texto relativo ("Visto há 5 min").
// Confere a cada minuto com a aba visível e para junto com o resto do painel após 15 min sem uso.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { acaoPresenca } from "@/app/(painel)/chat/acoes";
import { cn } from "@/components/ui/base";
import { estaOnline, semUsoHaMuito, textoVisto } from "@/lib/regras/chat";
import { marcarPausado, ultimoUsoEm, useUsoDoPainel } from "@/lib/uso";

type Mapa = Record<string, string | null>;
const Ctx = createContext<{ vistos: Mapa; agora: Date }>({ vistos: {}, agora: new Date(0) });

export function ProvedorPresenca({
  inicial,
  agoraServidor,
  children,
}: {
  inicial: { id: string; vistoEm?: string | null }[];
  /** Hora do servidor na renderização: o primeiro desenho fica igual no servidor e no navegador. */
  agoraServidor: string;
  children: ReactNode;
}) {
  const [vistos, setVistos] = useState<Mapa>(() => Object.fromEntries(inicial.map((s) => [s.id, s.vistoEm ?? null])));
  const [agora, setAgora] = useState(() => new Date(agoraServidor));
  useEffect(() => setAgora(new Date()), []);

  const atualizar = useCallback(() => {
    setAgora(new Date());
    if (document.visibilityState !== "visible") return;
    if (semUsoHaMuito(ultimoUsoEm())) {
      marcarPausado();
      return;
    }
    acaoPresenca()
      .then((l) => setVistos(Object.fromEntries(l.map((s) => [s.id, s.vistoEm]))))
      .catch(() => {});
  }, []);
  useUsoDoPainel(atualizar);

  useEffect(() => {
    const id = setInterval(atualizar, 60_000);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, [atualizar]);

  return <Ctx.Provider value={{ vistos, agora }}>{children}</Ctx.Provider>;
}

/** Bolinha de status sobre o avatar (verde = online, cinza = ausente). */
export function PontoPresenca({ socioId, className }: { socioId: string; className?: string }) {
  const { vistos, agora } = useContext(Ctx);
  const on = estaOnline(vistos[socioId], agora);
  return (
    <span
      aria-hidden
      className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-papel-forte", on ? "bg-[#22c55e]" : "bg-tinta-3/60", className)}
    />
  );
}

/** Texto "Online agora" / "Visto há 12 min" / "Visto ontem às 18:40". */
export function TextoPresenca({ socioId, className }: { socioId: string; className?: string }) {
  const { vistos, agora } = useContext(Ctx);
  const visto = vistos[socioId];
  const on = estaOnline(visto, agora);
  return (
    <span className={cn("inline-flex items-center gap-1.5", on ? "text-ok" : "text-tinta-3", className)}>
      <span aria-hidden className={cn("size-1.5 rounded-full", on ? "bg-ok" : "bg-tinta-3/60")} />
      {agora.getTime() === 0 ? "" : textoVisto(visto, agora)}
    </span>
  );
}
