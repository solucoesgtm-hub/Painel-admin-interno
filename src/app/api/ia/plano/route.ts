// Gera o relatório do lead e o plano de implementação do protótipo (sem código: a implementação vem depois).
// Duas chamadas em paralelo (relatório e plano), com o mesmo texto de sistema, para caber no tempo da rota.
// Resposta em streaming: um JSON por linha (EventoGeracao), para a tela mostrar o andamento.
import { revalidatePath } from "next/cache";
import { gerarEstruturado, iaConfigurada, tetoMensalBRL } from "@/lib/ia/claude";
import { exemploRelatorioPlano } from "@/lib/ia/exemplo";
import { mensagemDoLead, PEDIDO_PLANO, PEDIDO_RELATORIO, SISTEMA } from "@/lib/ia/prompts/relatorio-plano";
import { esquemaPedidoPlano, esquemaPlano, esquemaRelatorio, tetoAtingido, type EventoGeracao } from "@/lib/regras/ia";
import { brl } from "@/lib/formato";
import { buscarDiagnosticoParaIa, buscarLead, gastoIaDoMes, modoDemo, registrarGeracaoIa } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

// Limite de tempo da rota na Vercel (Fluid Compute).
export const maxDuration = 300;

const erro = (mensagem: string, status: number) => Response.json({ mensagem }, { status });

export async function POST(req: Request) {
  const socio = await exigirSocio();
  const pedido = esquemaPedidoPlano.safeParse(await req.json().catch(() => null));
  if (!pedido.success) return erro("Pedido inválido.", 400);
  const p = pedido.data;

  const lead = await buscarLead(p.leadId);
  if (!lead) return erro("Lead não encontrado.", 404);

  const comIa = iaConfigurada();
  if (!comIa && !modoDemo) return erro("IA ainda não configurada. Cadastre a ANTHROPIC_API_KEY na Vercel.", 503);
  if (comIa) {
    const gasto = await gastoIaDoMes();
    const teto = tetoMensalBRL();
    if (tetoAtingido(gasto, teto)) {
      return erro(`Teto mensal de IA atingido (${brl(gasto)} de ${brl(teto)}). As gerações voltam no próximo mês ou com um teto maior.`, 429);
    }
  }

  const diag = await buscarDiagnosticoParaIa(p.leadId, p.diagnosticoId);
  if (!diag && comIa) return erro("Salve o diagnóstico da visita antes de gerar o relatório.", 400);

  const codificador = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controle) {
      const enviar = (e: EventoGeracao) => controle.enqueue(codificador.encode(JSON.stringify(e) + "\n"));
      let ultimoAviso = 0;
      const escritos = [0, 0];
      const aoProgresso = (i: 0 | 1) => (fase: "pensando" | "escrevendo", caracteres: number) => {
        escritos[i] = caracteres;
        const agora = Date.now();
        if (agora - ultimoAviso < 400) return;
        ultimoAviso = agora;
        const total = escritos[0]! + escritos[1]!;
        enviar({ tipo: "progresso", fase: total > 0 ? "escrevendo" : fase, caracteres: total });
      };
      try {
        const semTokens = { entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0 };
        const salvo = !comIa
          ? await registrarGeracaoIa(
              {
                leadId: lead.id,
                leadNome: lead.nome,
                diagnosticoId: diag?.id ?? null,
                conteudo: exemploRelatorioPlano({
                  nome: lead.nome,
                  segmento: lead.segmento,
                  pontuacao: diag?.pontuacao ?? lead.pontuacao ?? 0,
                  veredito: diag?.veredito ?? lead.veredito ?? "sem veredito",
                }),
                modelo: "exemplo",
                tokens: semTokens,
                custoBRL: 0,
                exemplo: true,
              },
              socio,
            )
          : await (async () => {
              const dados = mensagemDoLead(lead, diag!);
              const [rel, pla] = await Promise.all([
                gerarEstruturado({ sistema: SISTEMA, mensagens: [dados, PEDIDO_RELATORIO], esquema: esquemaRelatorio, aoProgresso: aoProgresso(0) }),
                gerarEstruturado({ sistema: SISTEMA, mensagens: [dados, PEDIDO_PLANO], esquema: esquemaPlano, aoProgresso: aoProgresso(1) }),
              ]);
              const conteudo = rel.dados && pla.dados ? { ...rel.dados, ...pla.dados } : null;
              const falha = rel.erro ?? pla.erro;
              // Grava mesmo quando falha: as chamadas custam e entram no teto do mês.
              const s = await registrarGeracaoIa(
                {
                  leadId: lead.id,
                  leadNome: lead.nome,
                  diagnosticoId: diag!.id,
                  conteudo,
                  erro: falha,
                  modelo: rel.modelo,
                  tokens: {
                    entrada: rel.tokens.entrada + pla.tokens.entrada,
                    saida: rel.tokens.saida + pla.tokens.saida,
                    cacheLeitura: rel.tokens.cacheLeitura + pla.tokens.cacheLeitura,
                    cacheEscrita: rel.tokens.cacheEscrita + pla.tokens.cacheEscrita,
                  },
                  custoBRL: Math.round((rel.custoBRL + pla.custoBRL) * 100) / 100,
                },
                socio,
              );
              if (!s) throw new Error(falha ?? "A geração falhou.");
              return s;
            })();
        if (!salvo) throw new Error("A geração falhou.");
        revalidatePath(`/leads/${lead.id}`);
        enviar({ tipo: "fim", plano: salvo });
      } catch (e) {
        enviar({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Não foi possível gerar agora. Tente de novo." });
      } finally {
        controle.close();
      }
    },
  });

  return new Response(corpo, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
