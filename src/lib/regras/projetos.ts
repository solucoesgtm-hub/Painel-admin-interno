// Regras dos projetos: um projeto por entrega, ligado a um cliente.
import { z } from "zod";

export const SITUACOES_PROJETO = ["planejado", "em_andamento", "em_teste", "entregue", "pausado"] as const;
export type SituacaoProjeto = (typeof SITUACOES_PROJETO)[number];

export const NOME_SITUACAO_PROJETO: Record<SituacaoProjeto, string> = {
  planejado: "Planejado",
  em_andamento: "Em andamento",
  em_teste: "Em teste",
  entregue: "Entregue",
  pausado: "Pausado",
};

export type ProjetoSalvo = {
  id: string;
  nome: string;
  cliente: string;
  leadId: string | null;
  situacao: SituacaoProjeto;
  donoId: string | null;
  prazo: string; // AAAA-MM-DD
  repositorio: string;
  descricao: string;
};

const vazioParaNulo = (v: unknown) => (v === "" || v === undefined ? null : v);

export const esquemaProjeto = z.object({
  nome: z.string().trim().min(3, "Dê um nome ao projeto.").max(120),
  cliente: z.string().trim().min(2, "Informe o cliente.").max(160),
  leadId: z.preprocess(vazioParaNulo, z.string().min(1).max(64).nullable()),
  situacao: z.enum(SITUACOES_PROJETO),
  donoId: z.preprocess(vazioParaNulo, z.string().min(1).max(64).nullable()),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o prazo."),
  repositorio: z
    .string()
    .trim()
    .max(300)
    .refine((v) => v === "" || /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v), "Endereço inválido (ex.: github.com/gtm/projeto).")
    .default(""),
  descricao: z.string().trim().max(2000).default(""),
});
export type DadosProjeto = z.infer<typeof esquemaProjeto>;

/** Repositório como link clicável: completa o https:// quando faltar. */
export const linkRepositorio = (r: string) => (!r ? "" : /^https?:\/\//i.test(r) ? r : `https://${r}`);

/** Ordem da tela: em aberto primeiro (por prazo), entregues por último. */
export function ordenarProjetos<T extends Pick<ProjetoSalvo, "situacao" | "prazo">>(lista: T[]): T[] {
  const peso = (s: SituacaoProjeto) => (s === "entregue" ? 2 : s === "pausado" ? 1 : 0);
  return [...lista].sort((a, b) => peso(a.situacao) - peso(b.situacao) || a.prazo.localeCompare(b.prazo));
}
