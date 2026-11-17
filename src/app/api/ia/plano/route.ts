// Gera o relatório e o plano do protótipo (etapa "plano") e depois o esqueleto de código (etapa "codigo").
// Resposta em streaming: um JSON por linha (EventoGeracao), para a tela mostrar o andamento.
import { revalidatePath } from "next/cache";
import { gerarEstruturado, iaConfigurada, tetoMensalBRL } from "@/lib/ia/claude";
import { exemploCodigo, exemploRelatorioPlano } from "@/lib/ia/exemplo";
import { mensagemDoLead, PEDIDO_PLANO, pedidoCodigo, SISTEMA } from "@/lib/ia/prompts/relatorio-plano";
import {
  esquemaCodigo,
  esquemaPedidoPlano,
  esquemaRelatorioPlano,
  tetoAtingido,
  type EventoGeracao,
  type PlanoIASalvo,
} from "@/lib/regras/ia";
import { brl } from "@/lib/formato";
import {
  anexarCodigoIa,
  buscarDiagnosticoParaIa,
  buscarLead,
  buscarPlanoIa,
  gastoIaDoMes,
  modoDemo,
  registrarGeracaoIa,
} from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

// Cada etapa cabe neste limite (plano da Vercel com Fluid Compute).
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

  // Dados que cada etapa precisa, conferidos antes de abrir o streaming.
  const diag = p.etapa === "plano" ? await buscarDiagnosticoParaIa(p.leadId, p.diagnosticoId) : null;
  if (p.etapa === "plano" && !diag && comIa) return erro("Salve o diagnóstico da visita antes de gerar o relatório.", 400);
  const plano = p.etapa === "codigo" ? await buscarPlanoIa(p.leadId, p.planoId) : null;
  if (p.etapa === "codigo" && !plano) return erro("Plano não encontrado. Gere o relatório e o plano de novo.", 404);

  const codificador = new TextEncoder();
  const corpo = new ReadableStream<Uint8Array>({
    async start(controle) {
      const enviar = (e: EventoGeracao) => controle.enqueue(codificador.encode(JSON.stringify(e) + "\n"));
      let ultimoAviso = 0;
      const aoProgresso = (fase: "pensando" | "escrevendo", caracteres: number) => {
        const agora = Date.now();
        if (agora - ultimoAviso < 400) return;
        ultimoAviso = agora;
        enviar({ tipo: "progresso", fase, caracteres });
      };
      try {
        let salvo: PlanoIASalvo | null = null;
        if (p.etapa === "plano") {
          if (!comIa) {
            salvo = await registrarGeracaoIa(
              {
                leadId: lead.id,
                leadNome: lead.nome,
                diagnosticoId: diag?.id ?? null,
                conteudo: exemploRelatorioPlano({ nome: lead.nome, segmento: lead.segmento, pontuacao: diag?.pontuacao ?? lead.pontuacao ?? 0, veredito: diag?.veredito ?? lead.veredito ?? "sem veredito" }),
                modelo: "exemplo",
                tokens: { entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0 },
                custoBRL: 0,
                exemplo: true,
              },
              socio,
            );
          } else {
            const r = await gerarEstruturado({
              sistema: SISTEMA,
              mensagens: [mensagemDoLead(lead, diag!), PEDIDO_PLANO],
              esquema: esquemaRelatorioPlano,
              aoProgresso,
            });
            salvo = await registrarGeracaoIa(
              { leadId: lead.id, leadNome: lead.nome, diagnosticoId: diag!.id, conteudo: r.dados, erro: r.erro, modelo: r.modelo, tokens: r.tokens, custoBRL: r.custoBRL },
              socio,
            );
            if (!salvo) throw new Error(r.erro ?? "A geração falhou.");
          }
        } else {
          const base = plano!;
          if (base.conteudo.codigo) salvo = base;
          else if (!comIa || base.exemplo) {
            salvo = await anexarCodigoIa(base, { leadNome: lead.nome, codigo: exemploCodigo(), tokens: { entrada: 0, saida: 0, cacheLeitura: 0, cacheEscrita: 0 }, custoBRL: 0 }, socio);
          } else {
            const d = await buscarDiagnosticoParaIa(lead.id, base.diagnosticoId ?? undefined);
            const mensagens = [...(d ? [mensagemDoLead(lead, d)] : []), pedidoCodigo({ relatorio: base.conteudo.relatorio, plano: base.conteudo.plano })];
            const r = await gerarEstruturado({ sistema: SISTEMA, mensagens, esquema: esquemaCodigo, aoProgresso });
            if (!r.dados) {
              // A chamada que falhou também custa: fica registrada para o teto do mês.
              await registrarGeracaoIa(
                { leadId: lead.id, leadNome: lead.nome, diagnosticoId: base.diagnosticoId, conteudo: null, erro: r.erro, modelo: r.modelo, tokens: r.tokens, custoBRL: r.custoBRL },
                socio,
              );
              throw new Error(r.erro ?? "A geração do código falhou.");
            }
            salvo = await anexarCodigoIa(base, { leadNome: lead.nome, codigo: r.dados.codigo, tokens: r.tokens, custoBRL: r.custoBRL }, socio);
          }
        }
        revalidatePath(`/leads/${lead.id}`);
        enviar({ tipo: "fim", plano: salvo! });
      } catch (e) {
        enviar({ tipo: "erro", mensagem: e instanceof Error ? e.message : "Não foi possível gerar agora. Tente de novo." });
      } finally {
        controle.close();
      }
    },
  });

  return new Response(corpo, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
