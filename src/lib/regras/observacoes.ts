// Observações livres do diagnóstico: o sistema filtra por palavras-chave e leva para o relatório
// os temas encontrados e os trechos que os citam. Funciona sem IA (regra fixa, sempre igual).
import { z } from "zod";

/** Temas que importam para a proposta, com as palavras (e variações) que indicam cada um. */
export const TEMAS_OBSERVACAO: { tema: string; termos: string[] }[] = [
  { tema: "WhatsApp", termos: ["whatsapp", "whats", "zap", "wpp"] },
  { tema: "Agendamento", termos: ["agenda", "agendamento", "agendar", "horario", "marcar", "consulta", "remarcar"] },
  { tema: "Estoque", termos: ["estoque", "inventario", "reposicao", "falta de produto", "validade"] },
  { tema: "Vendas e pedidos", termos: ["pedido", "venda", "vender", "cardapio", "catalogo", "orcamento"] },
  { tema: "Entregas", termos: ["entrega", "delivery", "ifood", "motoboy", "frete"] },
  { tema: "Pagamentos", termos: ["pix", "boleto", "cartao", "cobranca", "pagamento", "fiado", "inadimplencia"] },
  { tema: "Fiscal", termos: ["nota fiscal", "nfe", "nfc-e", "nfce", "contador", "imposto"] },
  { tema: "Planilhas e papel", termos: ["planilha", "excel", "caderno", "papel", "anotacao"] },
  { tema: "Redes sociais", termos: ["instagram", "facebook", "redes sociais", "tiktok", "google meu negocio"] },
  { tema: "Equipe", termos: ["funcionario", "atendente", "equipe", "treinamento", "rotatividade"] },
  { tema: "Preço", termos: ["caro", "preco", "barato", "desconto", "sem dinheiro", "investimento"] },
  { tema: "Urgência", termos: ["urgente", "rapido", "prazo", "ja quer", "o quanto antes", "essa semana"] },
  { tema: "Decisor", termos: ["socio", "esposa", "marido", "dono", "decide", "aprovar", "conversar com"] },
  { tema: "Concorrência", termos: ["concorrente", "outro sistema", "outra empresa", "ja usa", "ja tem"] },
  { tema: "Objeção", termos: ["nao acredita", "desconfia", "medo", "receio", "nao gosta", "ja tentou"] },
];

const semAcento = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Termo inteiro (não pega "caro" dentro de "carona"); aceita plural simples. */
const acha = (texto: string, termo: string) => new RegExp(`(^|[^a-z0-9])${termo.replace(/[.*+?^${}()|[\]\\-]/g, "\\$&")}s?(?=$|[^a-z0-9])`).test(texto);

export const esquemaObservacoesVisita = z.object({
  texto: z.string(),
  palavrasChave: z.array(z.string()),
  destaques: z.array(z.string()),
});
export type ObservacoesVisita = z.infer<typeof esquemaObservacoesVisita>;

/**
 * Filtra as observações: temas encontrados (na ordem da lista) e as frases que citam algum tema
 * (no máximo 8). Texto vazio devolve `null`.
 */
export function filtrarObservacoes(texto: string | null | undefined): ObservacoesVisita | null {
  const limpo = (texto ?? "").trim();
  if (!limpo) return null;
  const normal = semAcento(limpo);
  const palavrasChave = TEMAS_OBSERVACAO.filter((t) => t.termos.some((termo) => acha(normal, termo))).map((t) => t.tema);
  const frases = limpo
    .split(/(?<=[.!?])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean);
  const destaques = frases
    .filter((f) => {
      const n = semAcento(f);
      return TEMAS_OBSERVACAO.some((t) => t.termos.some((termo) => acha(n, termo)));
    })
    .slice(0, 8);
  return { texto: limpo, palavrasChave, destaques };
}
