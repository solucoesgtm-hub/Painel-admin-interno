// Ponto único de acesso a dados do painel. Só roda no servidor.
// Com DATABASE_URL definida, leads e histórico vêm do Neon (src/db).
// Sem ela, o Hub roda em modo demonstração com dados fictícios em memória.
import "server-only";
import { HISTORICO_INICIAL, LEADS_INICIAIS, SOCIOS, type EventoHistorico, type Lead, type Socio } from "./demo/dados";
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

const CORES_SOCIOS = ["#3f6fd8", "#eb6834", "#1baf7a", "#eda100"];

/** Sócios: tabela `socios` do Neon (ordem de cadastro) ou a lista fictícia da demonstração. */
export async function listarSocios(): Promise<Socio[]> {
  if (modoDemo) return SOCIOS;
  const [{ db }, { socios }, { asc }] = await Promise.all([import("@/db"), import("@/db/schema"), import("drizzle-orm")]);
  const linhas = await db
    .select({ id: socios.id, nome: socios.nome, email: socios.email, area: socios.area })
    .from(socios)
    .orderBy(asc(socios.criadoEm), asc(socios.nome));
  return linhas.map((s, i) => ({
    id: s.id,
    nome: s.nome,
    email: s.email,
    area: s.area ?? "Sócio",
    foco: s.area ?? "",
    cor: CORES_SOCIOS[i % CORES_SOCIOS.length]!,
  }));
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

export async function listarHistorico(limite = 300): Promise<EventoHistorico[]> {
  if (modoDemo) return memoria().historico;
  const [{ db }, { historico, socios, leads }, { desc, eq }] = await Promise.all([
    import("@/db"),
    import("@/db/schema"),
    import("drizzle-orm"),
  ]);
  const linhas = await db
    .select({
      id: historico.id,
      atorTipo: historico.atorTipo,
      atorNome: socios.nome,
      acao: historico.acao,
      entidade: historico.entidade,
      detalhes: historico.detalhes,
      leadNome: leads.nome,
      em: historico.criadoEm,
    })
    .from(historico)
    .leftJoin(socios, eq(historico.atorId, socios.id))
    .leftJoin(leads, eq(historico.entidadeId, leads.id))
    .orderBy(desc(historico.criadoEm))
    .limit(limite);

  const acoes = ["criou", "editou", "excluiu", "moveu_etapa", "aprovou", "recusou", "executou"] as const;
  return linhas.map((h) => {
    const d = (h.detalhes ?? {}) as Record<string, unknown>;
    const alvo = h.leadNome ?? (typeof d.nome === "string" ? d.nome : h.entidade);
    const extra =
      h.acao === "moveu_etapa" && typeof d.etapa === "string"
        ? ` → ${nomeEtapa(d.etapa as EtapaId)}${typeof d.motivoPerda === "string" ? ` (${d.motivoPerda})` : ""}`
        : typeof d.pontuacao === "number"
          ? ` — ${d.pontuacao} pontos`
          : "";
    return {
      id: h.id,
      ator: { tipo: h.atorTipo, nome: h.atorNome ?? (h.atorTipo === "sistema" ? "Sistema" : "Agente") },
      acao: (acoes as readonly string[]).includes(h.acao) ? (h.acao as EventoHistorico["acao"]) : "editou",
      entidade: h.entidade,
      descricao: `${alvo}${extra}`,
      em: h.em.toISOString(),
    };
  });
}
