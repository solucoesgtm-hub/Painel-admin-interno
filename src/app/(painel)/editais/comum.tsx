import { Etiqueta, type Tom } from "@/components/ui/base";
import type { SituacaoEdital } from "@/lib/demo/dados";
import type { vereditoEdital } from "@/lib/regras/editais";

export const SITUACAO_EDITAL: Record<SituacaoEdital, { nome: string; tom: Tom }> = {
  em_analise: { nome: "Em análise", tom: "info" },
  aplicando: { nome: "Aplicando", tom: "alerta" },
  enviado: { nome: "Enviado", tom: "ok" },
  descartado: { nome: "Descartado", tom: "neutro" },
  resultado: { nome: "Resultado", tom: "ok" },
};

export function EtiquetaVereditoEdital({ v }: { v: ReturnType<typeof vereditoEdital> }) {
  if (v.tipo === "apto") return <Etiqueta tom="ok">Apto</Etiqueta>;
  if (v.tipo === "apto_com_ajustes") return <Etiqueta tom="alerta">Apto com ajustes</Etiqueta>;
  return <Etiqueta tom="risco">Não apto</Etiqueta>;
}

