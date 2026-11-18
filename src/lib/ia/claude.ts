// Módulo único de chamada à API do Claude. Só roda no servidor.
// Streaming (respostas longas sem estourar o tempo), saída estruturada validada por Zod,
// cache de prompt no texto de sistema e uma nova tentativa se a validação falhar.
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { z } from "zod";
import { COTACAO_PADRAO, CREDITOS_PADRAO_USD, custoEstimadoBRL, finalidadePermitida, numeroDoAmbiente, TETO_PADRAO_BRL, type FinalidadeIa, type Uso } from "../regras/ia";

export const iaConfigurada = () => !!process.env.ANTHROPIC_API_KEY?.trim();
/** Modelo do relatório do diagnóstico: Sonnet equilibra qualidade e custo (Opus custa ~1,7× mais). */
export const modeloIa = () => process.env.CLAUDE_MODEL?.trim() || "claude-sonnet-5-5";
/** Modelo barato e rápido para textos curtos (escopo do contrato). */
export const modeloRapido = () => process.env.CLAUDE_MODELO_RAPIDO?.trim() || "claude-haiku-5-5";
export const tetoMensalBRL = () => numeroDoAmbiente(process.env.IA_TETO_MENSAL_BRL, TETO_PADRAO_BRL);
export const cotacaoDolar = () => numeroDoAmbiente(process.env.IA_COTACAO_DOLAR, COTACAO_PADRAO);
/** Créditos de API comprados (US$). Ao recarregar, aumente IA_CREDITOS_USD pelo total já comprado. */
export const creditosUSD = () => numeroDoAmbiente(process.env.IA_CREDITOS_USD, CREDITOS_PADRAO_USD);

export type ResultadoChamada<T> = {
  dados: T | null;
  erro?: string;
  modelo: string;
  tokens: { entrada: number; saida: number; cacheLeitura: number; cacheEscrita: number };
  custoBRL: number;
};

/** Tempo máximo de uma chamada: a rota da Vercel tem 300 s. */
const LIMITE_MS = 280_000;

export async function gerarEstruturado<T>(opcoes: {
  /** Para que serve a chamada. Só "diagnostico" e "contrato" são aceitos. */
  finalidade: FinalidadeIa;
  sistema: string;
  mensagens: string[];
  esquema: z.ZodType<T>;
  /** Outro modelo só para esta chamada (padrão: CLAUDE_MODEL). */
  modelo?: string;
  /** Limite de tokens de saída (padrão 16000). Limita também o custo máximo de cada chamada. */
  maxTokens?: number;
  aoProgresso?: (fase: "pensando" | "escrevendo", caracteres: number) => void;
}): Promise<ResultadoChamada<T>> {
  // Trava no servidor: nenhum outro recurso do sistema consegue gastar os créditos da API.
  if (!finalidadePermitida(opcoes.finalidade)) throw new Error("Uso da IA não permitido.");
  const modelo = opcoes.modelo ?? modeloIa();
  const cliente = new Anthropic({ timeout: LIMITE_MS, maxRetries: 1 });
  const total: Uso = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 };
  const inicio = Date.now();
  // Formato JSON sem o "parse" automático: a validação é nossa, para poder tentar de novo.
  const { type, schema } = zodOutputFormat(opcoes.esquema);
  const haiku = modelo.includes("haiku");
  let ultimoErro = "";

  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const uso: Uso = { input_tokens: 0, output_tokens: 0 };
    try {
      const stream = cliente.messages.stream({
        model: modelo,
        max_tokens: opcoes.maxTokens ?? 16000,
        ...(haiku ? {} : { thinking: { type: "adaptive" as const } }),
        output_config: { format: { type, schema }, ...(haiku ? {} : { effort: "medium" as const }) },
        system: [{ type: "text", text: opcoes.sistema, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: opcoes.mensagens.map((t) => ({ type: "text" as const, text: t })) }],
      });
      let caracteres = 0;
      for await (const ev of stream) {
        if (ev.type === "message_start") Object.assign(uso, ev.message.usage);
        else if (ev.type === "message_delta") uso.output_tokens = ev.usage.output_tokens;
        else if (ev.type === "content_block_delta") {
          if (ev.delta.type === "text_delta") {
            caracteres += ev.delta.text.length;
            opcoes.aoProgresso?.("escrevendo", caracteres);
          } else if (ev.delta.type === "thinking_delta") opcoes.aoProgresso?.("pensando", caracteres);
        }
      }
      const final = await stream.finalMessage();
      Object.assign(uso, final.usage);
      somar(total, uso);
      if (final.stop_reason === "max_tokens") throw new Error("A resposta passou do tamanho máximo.");
      if (final.stop_reason === "refusal") throw new Error("A IA recusou o pedido.");
      const texto = final.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
      const r = opcoes.esquema.safeParse(JSON.parse(texto));
      if (r.success) return fechar(r.data, undefined, modelo, total);
      ultimoErro = "A resposta da IA veio em formato inesperado.";
    } catch (e) {
      somar(total, uso);
      ultimoErro =
        e instanceof Anthropic.AuthenticationError ? "Chave da API do Claude inválida."
        : e instanceof Anthropic.RateLimitError ? "Limite de uso da API atingido. Tente em alguns minutos."
        : e instanceof Anthropic.APIError ? `Erro da API do Claude (${e.status ?? "sem código"}).`
        : e instanceof Error ? e.message : "Falha desconhecida.";
      if (e instanceof Anthropic.AuthenticationError) break;
    }
    // Só tenta de novo se ainda houver tempo dentro do limite da rota.
    if (Date.now() - inicio > 120_000) break;
  }
  return fechar(null, ultimoErro, modelo, total);

  function fechar(dados: T | null, erro: string | undefined, m: string, u: Uso): ResultadoChamada<T> {
    return {
      dados,
      erro,
      modelo: m,
      tokens: {
        entrada: u.input_tokens,
        saida: u.output_tokens,
        cacheLeitura: u.cache_read_input_tokens ?? 0,
        cacheEscrita: u.cache_creation_input_tokens ?? 0,
      },
      custoBRL: custoEstimadoBRL(u, m, cotacaoDolar()),
    };
  }
}

function somar(total: Uso, u: Uso) {
  total.input_tokens += u.input_tokens;
  total.output_tokens += u.output_tokens;
  total.cache_creation_input_tokens = (total.cache_creation_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  total.cache_read_input_tokens = (total.cache_read_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
  u.input_tokens = 0;
  u.output_tokens = 0;
  u.cache_creation_input_tokens = 0;
  u.cache_read_input_tokens = 0;
}

/** Confere a chave e o modelo sem gerar texto (sem custo). */
export async function verificarIa(): Promise<{ ok: true; detalhe: string } | { ok: false; detalhe: string }> {
  if (!iaConfigurada()) return { ok: false, detalhe: "ANTHROPIC_API_KEY não definida." };
  const cliente = new Anthropic({ timeout: 15_000, maxRetries: 0 });
  try {
    const [principal, rapido] = await Promise.all([cliente.models.retrieve(modeloIa()), cliente.models.retrieve(modeloRapido())]);
    return { ok: true, detalhe: `Modelos disponíveis: ${principal.id} e ${rapido.id}.` };
  } catch (e) {
    return {
      ok: false,
      detalhe:
        e instanceof Anthropic.AuthenticationError ? "Chave da API do Claude inválida."
        : e instanceof Anthropic.NotFoundError ? "Modelo não encontrado. Confira CLAUDE_MODEL e CLAUDE_MODELO_RAPIDO."
        : e instanceof Anthropic.APIError ? `Erro da API do Claude (${e.status ?? "sem código"}).`
        : "Não foi possível falar com a API do Claude.",
    };
  }
}
