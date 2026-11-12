// Ponto único de acesso a dados do painel. Só roda no servidor.
// Com DATABASE_URL definida, leads e histórico vêm do Neon (src/db).
// Sem ela, o Hub roda em modo demonstração com dados fictícios em memória.
import "server-only";
import { HISTORICO_INICIAL, LEADS_INICIAIS, SOCIOS, type EventoHistorico, type Lead } from "./demo/dados";
import { nomeEtapa, type DadosNovoLead, type EtapaId } from "./regras/funil";

export const modoDemo = !process.env.DATABASE_URL;

type Memoria = { leads: Lead[]; historico: EventoHistorico[] };
const g = globalThis as unknown as { __gtmMemoria?: Memoria };
function memoria(): Memoria {
  g.__gtmMemoria ??= { leads: structuredClone(LEADS_INICIAIS), historico: structuredClone(HISTORICO_INICIAL) };
  return g.__gtmMemoria;
}

async function neon() {
  const consultas = await import("@/db/consultas/leads");
  return consultas;
}

export async function listarSocios() {
  return SOCIOS;
}

export async function listarLeads(): Promise<Lead[]> {
  if (modoDemo) return memoria().leads;
  const { listarFunil } = await neon();
  const linhas = await listarFunil();
  return linhas.map((l) => ({
    id: l.id,
    nome: l.nome,
    segmento: l.segmento ?? "",
    cidade: l.cidade ?? "",
    contatoNome: l.contatoNome ?? "",
    contatoTelefone: l.contatoTelefone ?? "",
    origem: l.origem ?? "",
    etapa: l.etapa,
    donoId: l.donoId,
    proximoPasso: l.proximoPasso,
    proximoPassoData: l.proximoPassoData,
    motivoPerda: l.motivoPerda,
    etapaDesde: l.etapaDesde.toISOString(),
    criadoEm: l.criadoEm.toISOString(),
    pontuacao: null,
    veredito: null,
    valorImplantacao: 0,
    mensalidade: 0,
  }));
}

export async function buscarLead(id: string) {
  const todos = await listarLeads();
  return todos.find((l) => l.id === id) ?? null;
}

function registrar(socioNome: string, acao: EventoHistorico["acao"], entidade: string, descricao: string) {
  memoria().historico.unshift({
    id: crypto.randomUUID(),
    ator: { tipo: "socio", nome: socioNome },
    acao,
    entidade,
    descricao,
    em: new Date().toISOString(),
  });
}

/** Cria o lead e registra no histórico no mesmo lote. */
export async function criarLead(dados: DadosNovoLead, socio: { id: string; nome: string }) {
  if (!modoDemo) {
    const { criarLead } = await neon();
    return criarLead({ ...dados, etapa: "lead" }, socio.id);
  }
  const agora = new Date().toISOString();
  const novo: Lead = {
    id: crypto.randomUUID(),
    nome: dados.nome,
    segmento: dados.segmento ?? "",
    cidade: dados.cidade ?? "",
    contatoNome: dados.contatoNome ?? "",
    contatoTelefone: dados.contatoTelefone ?? "",
    origem: dados.origem ?? "",
    etapa: "lead",
    donoId: dados.donoId,
    proximoPasso: dados.proximoPasso,
    proximoPassoData: dados.proximoPassoData,
    motivoPerda: null,
    etapaDesde: agora,
    criadoEm: agora,
    pontuacao: null,
    veredito: null,
    valorImplantacao: 0,
    mensalidade: 0,
  };
  memoria().leads.unshift(novo);
  registrar(socio.nome, "criou", "lead", dados.nome);
  return novo.id;
}

export async function moverLead(leadId: string, etapa: EtapaId, socio: { id: string; nome: string }, motivoPerda?: string) {
  const lead = await buscarLead(leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  if (!modoDemo) {
    const { moverEtapa } = await neon();
    return moverEtapa(leadId, etapa, socio.id, {
      proximoPasso: lead.proximoPasso,
      proximoPassoData: lead.proximoPassoData,
      motivoPerda,
    });
  }
  lead.etapa = etapa;
  lead.etapaDesde = new Date().toISOString();
  lead.motivoPerda = etapa === "perdido" ? (motivoPerda ?? null) : null;
  registrar(
    socio.nome,
    "moveu_etapa",
    "lead",
    `${lead.nome} → ${nomeEtapa(etapa)}${motivoPerda && etapa === "perdido" ? ` (${motivoPerda})` : ""}`,
  );
}

export async function listarHistorico(): Promise<EventoHistorico[]> {
  // No Neon, o histórico entra na Fase 1.3 (consulta + tela com filtros já prontos).
  return memoria().historico;
}
