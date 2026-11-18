// Regras dos lembretes e tarefas (checklist): dos projetos e da aba Lembretes.
import { z } from "zod";
import { hojeISO } from "../formato";

/** Quantos lembretes cabem num projeto: o cartão mostra todos, sem rolagem interna. */
export const MAX_LEMBRETES = 12;
/** Na aba Lembretes, por grupo (sem vínculo, assunto ou projeto). */
export const MAX_POR_GRUPO = 20;
export const MAX_TEXTO_LEMBRETE = 60;

export const TIPOS_LEMBRETE = ["lembrete", "tarefa"] as const;
export type TipoLembrete = (typeof TIPOS_LEMBRETE)[number];

export type Lembrete = {
  id: string;
  projetoId: string | null;
  tipo: TipoLembrete;
  assunto: string | null;
  prazo: string | null; // AAAA-MM-DD
  responsavelId: string | null;
  texto: string;
  feito: boolean;
  feitoEm: string | null;
  feitoPor: string | null;
  criadoEm: string;
};

const texto = z.string().trim().min(2, "Escreva o lembrete.").max(MAX_TEXTO_LEMBRETE, `Até ${MAX_TEXTO_LEMBRETE} caracteres.`);
const id = z.string().min(1).max(64);
const vazioParaNulo = (v: unknown) => (v === "" || v === undefined ? null : v);

/* ---------------- Projetos (cartão do projeto) ---------------- */
export const esquemaNovoLembrete = z.object({ projetoId: id, texto });
export const esquemaEditarLembrete = z.object({ id, projetoId: id, texto });
export const esquemaExcluirLembrete = z.object({ id, projetoId: id });
export const esquemaMarcarLembrete = z.object({ id, projetoId: id, feito: z.boolean() });

/* ---------------- Aba Lembretes ---------------- */
export const VINCULOS = ["nenhum", "projeto", "assunto"] as const;

/** Novo lembrete/tarefa: sem vínculo, num projeto ou num assunto livre. */
export const esquemaItem = z
  .object({
    texto,
    tipo: z.enum(TIPOS_LEMBRETE).default("lembrete"),
    vinculo: z.enum(VINCULOS).default("nenhum"),
    projetoId: z.preprocess(vazioParaNulo, id.nullable()).default(null),
    assunto: z.preprocess(vazioParaNulo, z.string().trim().min(2, "Escreva o assunto.").max(40, "Até 40 caracteres.").nullable()).default(null),
    responsavelId: z.preprocess(vazioParaNulo, id.nullable()).default(null),
    prazo: z.preprocess(vazioParaNulo, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable()).default(null),
  })
  .superRefine((v, ctx) => {
    if (v.vinculo === "projeto" && !v.projetoId) ctx.addIssue({ code: "custom", path: ["projetoId"], message: "Escolha o projeto." });
    if (v.vinculo === "assunto" && !v.assunto) ctx.addIssue({ code: "custom", path: ["assunto"], message: "Escreva o assunto." });
  })
  .transform((v) => ({
    texto: v.texto,
    tipo: v.tipo,
    projetoId: v.vinculo === "projeto" ? v.projetoId : null,
    assunto: v.vinculo === "assunto" ? normalizarAssunto(v.assunto!) : null,
    responsavelId: v.responsavelId,
    prazo: v.prazo,
  }));
export type DadosItem = z.output<typeof esquemaItem>;

export const esquemaIdItem = z.object({ id });
export const esquemaMarcarItem = z.object({ id, feito: z.boolean() });
export const esquemaEditarItem = z.object({ id, texto });

/** "  financeiro " → "Financeiro": o mesmo assunto não vira dois grupos por causa de maiúsculas. */
export function normalizarAssunto(a: string) {
  const t = a.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Progresso de um grupo: feitos sobre o total. Sem itens, 0 de 0. */
export function progressoLembretes(lista: Pick<Lembrete, "feito">[]) {
  const feitos = lista.filter((l) => l.feito).length;
  return { feitos, total: lista.length, fracao: lista.length ? feitos / lista.length : 0, concluido: lista.length > 0 && feitos === lista.length };
}

export type SituacaoPrazo = "atrasado" | "hoje" | "em_breve" | "depois" | null;

/** Situação do prazo de um item aberto. "em_breve" = até 3 dias. Feito ou sem prazo: null. */
export function situacaoPrazo(l: Pick<Lembrete, "feito" | "prazo">, hoje: string): SituacaoPrazo {
  if (l.feito || !l.prazo) return null;
  if (l.prazo < hoje) return "atrasado";
  if (l.prazo === hoje) return "hoje";
  const dias = Math.round((Date.parse(`${l.prazo}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86_400_000);
  return dias <= 3 ? "em_breve" : "depois";
}

export type Grupo = {
  chave: string;
  tipo: "nenhum" | "assunto" | "projeto";
  nome: string;
  projetoId: string | null;
  assunto: string | null;
  itens: Lembrete[];
};

/**
 * Agrupa para a tela: "Sem vínculo" primeiro, depois assuntos (A→Z), depois projetos (A→Z).
 * Dentro do grupo: abertos com prazo mais próximo primeiro, depois sem prazo, depois feitos.
 */
export function agruparLembretes(itens: Lembrete[], projetos: { id: string; nome: string }[], hoje: string): Grupo[] {
  const mapa = new Map<string, Grupo>();
  const nomeProjeto = new Map(projetos.map((p) => [p.id, p.nome]));
  for (const l of itens) {
    const g: Omit<Grupo, "itens"> = l.projetoId
      ? { chave: `p:${l.projetoId}`, tipo: "projeto", nome: nomeProjeto.get(l.projetoId) ?? "Projeto", projetoId: l.projetoId, assunto: null }
      : l.assunto
        ? { chave: `a:${l.assunto.toLowerCase()}`, tipo: "assunto", nome: l.assunto, projetoId: null, assunto: l.assunto }
        : { chave: "nenhum", tipo: "nenhum", nome: "Sem vínculo", projetoId: null, assunto: null };
    if (!mapa.has(g.chave)) mapa.set(g.chave, { ...g, itens: [] });
    mapa.get(g.chave)!.itens.push(l);
  }
  const ordem = { nenhum: 0, assunto: 1, projeto: 2 } as const;
  const peso = (l: Lembrete) => (l.feito ? 2 : l.prazo ? 0 : 1);
  return [...mapa.values()]
    .map((g) => ({
      ...g,
      itens: [...g.itens].sort((a, b) => peso(a) - peso(b) || (a.prazo ?? "").localeCompare(b.prazo ?? "") || a.criadoEm.localeCompare(b.criadoEm)),
    }))
    .sort((a, b) => ordem[a.tipo] - ordem[b.tipo] || a.nome.localeCompare(b.nome, "pt-BR"));
}

export type FiltroLembretes = { tipo: "todos" | TipoLembrete; responsavel: "todos" | "meus"; vinculo: "todos" | Grupo["tipo"] };

export function filtrarLembretes(itens: Lembrete[], f: FiltroLembretes, socioId: string) {
  return itens.filter(
    (l) =>
      (f.tipo === "todos" || l.tipo === f.tipo) &&
      (f.responsavel === "todos" || l.responsavelId === socioId) &&
      (f.vinculo === "todos" || (f.vinculo === "projeto" ? !!l.projetoId : f.vinculo === "assunto" ? !l.projetoId && !!l.assunto : !l.projetoId && !l.assunto)),
  );
}

/** Números do topo da aba. */
export function resumoLembretes(itens: Lembrete[], hoje: string) {
  const abertos = itens.filter((l) => !l.feito);
  return {
    abertos: abertos.length,
    tarefas: abertos.filter((l) => l.tipo === "tarefa").length,
    atrasados: abertos.filter((l) => situacaoPrazo(l, hoje) === "atrasado").length,
    paraHoje: abertos.filter((l) => situacaoPrazo(l, hoje) === "hoje").length,
    feitosHoje: itens.filter((l) => l.feito && !!l.feitoEm && hojeISO(new Date(l.feitoEm)) === hoje).length,
  };
}
