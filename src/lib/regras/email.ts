// Regras da caixa de e-mail: formato das mensagens, esquema da triagem feita pela IA
// e uma triagem por regras simples, usada quando a IA não está ligada ou passou do teto.
import { z } from "zod";

export type EmailResumo = {
  id: string;
  conversaId: string;
  de: string;
  nomeDe: string;
  assunto: string;
  trecho: string;
  /** ISO 8601 */
  recebidoEm: string;
  lido: boolean;
  /** Cabeçalho Message-ID, para responder na mesma conversa. */
  mensagemId?: string;
};

/** Quantos e-mails recentes a tela mostra e a IA tria de uma vez. */
export const LIMITE_EMAILS = 25;

export const CATEGORIAS_EMAIL = ["lead", "cliente", "financeiro", "edital", "fornecedor", "promocao", "outro"] as const;
export type CategoriaEmail = (typeof CATEGORIAS_EMAIL)[number];

export const NOME_CATEGORIA: Record<CategoriaEmail, string> = {
  lead: "Possível cliente",
  cliente: "Cliente",
  financeiro: "Financeiro",
  edital: "Edital",
  fornecedor: "Fornecedor",
  promocao: "Promoção",
  outro: "Outro",
};

export const URGENCIAS = ["alta", "media", "baixa"] as const;

export const esquemaTriagem = z.object({
  itens: z.array(
    z.object({
      id: z.string(),
      categoria: z.enum(CATEGORIAS_EMAIL),
      urgencia: z.enum(URGENCIAS),
      resumo: z.string().max(300),
      acaoSugerida: z.string().max(200),
      /** Rascunho de resposta em pt-BR; nulo quando não cabe responder. Nunca é enviado sem um sócio. */
      respostaSugerida: z.string().max(2000).nullable(),
    }),
  ),
});
export type Triagem = z.infer<typeof esquemaTriagem>;
export type ItemTriagem = Triagem["itens"][number];

/** Rascunho a criar na caixa: sempre rascunho, nunca envio direto. */
export const esquemaRascunho = z.object({
  emailId: z.string().min(1),
  conversaId: z.string().min(1),
  para: z.string().email("E-mail do destinatário inválido."),
  assunto: z.string().trim().min(1).max(250),
  corpo: z.string().trim().min(1, "Escreva a resposta.").max(10_000),
  mensagemId: z.string().optional(),
});
export type DadosRascunho = z.infer<typeof esquemaRascunho>;

const sem = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

const TEM = (texto: string, palavras: string[]) => palavras.some((p) => texto.includes(p));

/** Triagem sem IA: palavras-chave no remetente, assunto e trecho. Barata e previsível. */
export function triagemPorRegras(e: EmailResumo): ItemTriagem {
  const t = sem(`${e.de} ${e.assunto} ${e.trecho}`);
  let categoria: CategoriaEmail = "outro";
  if (TEM(t, ["edital", "chamada publica", "licitacao", "pregao", "fapes", "finep", "sebrae"])) categoria = "edital";
  else if (TEM(t, ["boleto", "fatura", "pix", "pagamento", "nota fiscal", "nf-e", "cobranca", "vencimento"])) categoria = "financeiro";
  // Problema de quem já é cliente vem antes: "o atendente não está funcionando" não é um lead novo.
  else if (TEM(t, ["suporte", "ajuste", "nao esta funcionando", "parou de funcionar", "fora do ar", "erro", "problema", "contrato"])) categoria = "cliente";
  else if (TEM(t, ["orcamento", "proposta", "interesse", "gostaria de saber", "quanto custa", "atendente", "whatsapp"])) categoria = "lead";
  else if (TEM(t, ["newsletter", "promocao", "desconto", "oferta", "unsubscribe", "descadastrar", "no-reply", "noreply"])) categoria = "promocao";

  // Só sinais claros de pressa; "vence dia 25" ou "prazo em 20 dias" não são urgência.
  const urgente = TEM(t, ["urgente", "urgencia", "vence hoje", "ate hoje", "vencido", "vencida", "em atraso", "atrasad", "nao esta funcionando", "parou de funcionar", "fora do ar"]);
  const urgencia: ItemTriagem["urgencia"] =
    categoria === "promocao" ? "baixa" : urgente || categoria === "lead" ? "alta" : categoria === "outro" ? "baixa" : "media";

  const acao: Record<CategoriaEmail, string> = {
    lead: "Responder e cadastrar como lead",
    cliente: "Responder o cliente",
    financeiro: "Conferir no financeiro",
    edital: "Avaliar o edital",
    fornecedor: "Ler quando der",
    promocao: "Pode arquivar",
    outro: "Ler quando der",
  };

  return {
    id: e.id,
    categoria,
    urgencia,
    resumo: (e.trecho || e.assunto).slice(0, 200),
    acaoSugerida: acao[categoria],
    respostaSugerida:
      categoria === "lead"
        ? `Olá${e.nomeDe ? `, ${e.nomeDe.split(" ")[0]}` : ""}! Obrigado pelo contato. Podemos marcar uma conversa rápida para entender o seu negócio? Me diga um dia e horário que funcionem para você.\n\nEquipe GTM Soluções`
        : null,
  };
}

const ORDEM_URGENCIA = { alta: 0, media: 1, baixa: 2 } as const;

/** Mais urgentes primeiro; empate pelo mais recente. */
export function ordenarTriagem<T extends { urgencia: ItemTriagem["urgencia"]; recebidoEm: string }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => ORDEM_URGENCIA[a.urgencia] - ORDEM_URGENCIA[b.urgencia] || b.recebidoEm.localeCompare(a.recebidoEm));
}

/** "Fulano <fulano@x.com>" → { nome, email } */
export function separarRemetente(de: string): { nome: string; email: string } {
  const m = de.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { nome: m[1]!.trim(), email: m[2]!.trim() };
  return { nome: "", email: de.trim() };
}

/** Assunto de resposta: acrescenta "Re:" uma vez só. */
export const assuntoResposta = (assunto: string) => (/^\s*re:/i.test(assunto) ? assunto : `Re: ${assunto}`);
