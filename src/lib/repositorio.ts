// Ponto único de acesso a dados do painel. Só roda no servidor.
// Com DATABASE_URL definida, leads e histórico vêm do Neon (src/db).
// Sem ela, o Hub roda em modo demonstração com dados fictícios em memória.
import "server-only";
import { CONTRATOS, EMPRESA_DEMO, EVENTOS, HISTORICO_INICIAL, LEADS_INICIAIS, SOCIOS, type Evento, type EventoHistorico, type Lead, type Socio } from "./demo/dados";
import type { DadosEvento } from "./regras/agenda";
import { EMPRESA_VAZIA, type ContratoCliente, type DadosContrato, type DadosEmpresa } from "./regras/empresa";
import { nomeEtapa, type DadosEditarLead, type DadosNovoLead, type EtapaId } from "./regras/funil";
import {
  calcularPontuacao,
  complexidade,
  contarIntegracoes,
  veredito,
  type DadosDiagnostico,
  type Veredito,
} from "./regras/pontuacao";

export const modoDemo = !process.env.DATABASE_URL;

export type DiagnosticoSalvo = {
  id: string;
  leadId: string;
  pontuacao: number;
  veredito: Veredito;
  complexidade: "baixa" | "media" | "alta" | null;
  autor: string;
  criadoEm: string;
};

type Memoria = {
  leads: Lead[];
  historico: EventoHistorico[];
  diagnosticos: DiagnosticoSalvo[];
  empresa: DadosEmpresa;
  contratos: ContratoCliente[];
  eventos: Evento[];
};
const g = globalThis as unknown as { __gtmMemoria?: Memoria };
function memoria(): Memoria {
  g.__gtmMemoria ??= {
    leads: structuredClone(LEADS_INICIAIS),
    historico: structuredClone(HISTORICO_INICIAL),
  } as Memoria;
  // Completa campos que não existiam numa memória criada por versão anterior (servidor de desenvolvimento).
  const m = g.__gtmMemoria;
  m.diagnosticos ??= [];
  m.empresa ??= { ...EMPRESA_DEMO };
  m.contratos ??= CONTRATOS.map((c) => ({
    id: c.id,
    leadId: null,
    cliente: c.cliente,
    produto: c.produto,
    inicio: c.inicio,
    fim: c.fim,
    valorMensal: c.valorMensal,
    valorImplantacao: 0,
    situacao: c.assinado ? "vigente" : "aguardando",
    observacoes: "",
  }));
  m.eventos ??= structuredClone(EVENTOS);
  return m;
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
    pontuacao: l.diagnosticos[0]?.pontuacao ?? null,
    veredito: l.diagnosticos[0]?.veredito ?? null,
    valorImplantacao: l.valorImplantacaoCentavos / 100,
    mensalidade: l.mensalidadeCentavos / 100,
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

/** Edita dados, próximo passo e valores da proposta do lead, com registro no histórico. */
export async function atualizarLead(dados: DadosEditarLead, socio: { id: string; nome: string }) {
  const lead = await buscarLead(dados.leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  if (!modoDemo) {
    const { atualizarLead } = await neon();
    return atualizarLead(
      dados.leadId,
      {
        nome: dados.nome,
        segmento: dados.segmento || null,
        cidade: dados.cidade || null,
        contatoNome: dados.contatoNome || null,
        contatoTelefone: dados.contatoTelefone || null,
        origem: dados.origem || null,
        donoId: dados.donoId,
        proximoPasso: dados.proximoPasso,
        proximoPassoData: dados.proximoPassoData,
        valorImplantacaoCentavos: Math.round(dados.valorImplantacao * 100),
        mensalidadeCentavos: Math.round(dados.mensalidade * 100),
      },
      socio.id,
    );
  }
  Object.assign(lead, {
    nome: dados.nome,
    segmento: dados.segmento ?? "",
    cidade: dados.cidade ?? "",
    contatoNome: dados.contatoNome ?? "",
    contatoTelefone: dados.contatoTelefone ?? "",
    origem: dados.origem ?? "",
    donoId: dados.donoId,
    proximoPasso: dados.proximoPasso,
    proximoPassoData: dados.proximoPassoData,
    valorImplantacao: dados.valorImplantacao,
    mensalidade: dados.mensalidade,
  });
  registrar(socio.nome, "editou", "lead", dados.nome);
}

/** Salva o diagnóstico da visita. Pontuação, veredito e complexidade são calculados aqui, no servidor. */
export async function salvarDiagnostico(dados: DadosDiagnostico, socio: { id: string; nome: string }) {
  const lead = await buscarLead(dados.leadId);
  if (!lead) throw new Error("Lead não encontrado.");
  const pontuacao = calcularPontuacao(dados.notas);
  const resultado = {
    pontuacao,
    veredito: veredito(pontuacao),
    complexidade: complexidade(dados.tarefas, contarIntegracoes(dados.ferramentas)),
  };
  if (!modoDemo) {
    const { salvarDiagnostico } = await neon();
    const { leadId, ...respostas } = dados;
    await salvarDiagnostico({ leadId, respostas, ...resultado, criadoPor: socio.id }, lead.nome);
    return resultado;
  }
  memoria().diagnosticos.unshift({
    id: crypto.randomUUID(),
    leadId: dados.leadId,
    ...resultado,
    autor: socio.nome,
    criadoEm: new Date().toISOString(),
  });
  lead.pontuacao = resultado.pontuacao;
  lead.veredito = resultado.veredito;
  registrar(socio.nome, "criou", "diagnostico", `${lead.nome} — ${pontuacao} pontos`);
  return resultado;
}

export async function listarDiagnosticos(leadId: string): Promise<DiagnosticoSalvo[]> {
  if (modoDemo) return memoria().diagnosticos.filter((d) => d.leadId === leadId);
  const { listarDiagnosticos } = await neon();
  const linhas = await listarDiagnosticos(leadId);
  return linhas.map((d) => ({
    id: d.id,
    leadId: d.leadId,
    pontuacao: d.pontuacao,
    veredito: d.veredito,
    complexidade: d.complexidade,
    autor: d.autor.nome,
    criadoEm: d.criadoEm.toISOString(),
  }));
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

/* ---------------- Nossa empresa ---------------- */
async function consultasEmpresa() {
  return import("@/db/consultas/empresa");
}

/** Dados cadastrais da GTM. No Neon, vazios até o primeiro preenchimento. */
export async function buscarEmpresa(): Promise<DadosEmpresa> {
  if (modoDemo) return memoria().empresa;
  const { buscarEmpresa } = await consultasEmpresa();
  const e = await buscarEmpresa();
  if (!e) return { ...EMPRESA_VAZIA };
  return {
    razaoSocial: e.razaoSocial,
    nomeFantasia: e.nomeFantasia,
    cnpj: e.cnpj,
    email: e.email,
    telefone: e.telefone,
    endereco: e.endereco,
    municipio: e.municipio,
    site: e.site,
    chavePix: e.chavePix,
    abertura: e.abertura ?? "",
  };
}

export async function salvarEmpresa(dados: DadosEmpresa, socio: { id: string; nome: string }) {
  const atual = await buscarEmpresa();
  const campos = (Object.keys(dados) as (keyof DadosEmpresa)[]).filter((k) => dados[k] !== atual[k]);
  if (campos.length === 0) return;
  if (!modoDemo) {
    const { salvarEmpresa } = await consultasEmpresa();
    return salvarEmpresa({ ...dados, abertura: dados.abertura || null }, socio.id, campos);
  }
  memoria().empresa = { ...dados };
  registrar(socio.nome, "editou", "empresa", "Dados da empresa");
}

export async function listarContratos(): Promise<ContratoCliente[]> {
  if (modoDemo) return [...memoria().contratos].sort((a, b) => a.fim.localeCompare(b.fim));
  const { listarContratos } = await consultasEmpresa();
  const linhas = await listarContratos();
  return linhas.map((c) => ({
    id: c.id,
    leadId: c.leadId,
    cliente: c.cliente,
    produto: c.produto,
    inicio: c.inicio,
    fim: c.fim,
    valorMensal: c.valorMensalCentavos / 100,
    valorImplantacao: c.valorImplantacaoCentavos / 100,
    situacao: c.situacao,
    observacoes: c.observacoes,
  }));
}

const camposContrato = (d: DadosContrato) => ({
  leadId: d.leadId || null,
  cliente: d.cliente,
  produto: d.produto,
  inicio: d.inicio,
  fim: d.fim,
  valorMensalCentavos: Math.round(d.valorMensal * 100),
  valorImplantacaoCentavos: Math.round(d.valorImplantacao * 100),
  situacao: d.situacao,
  observacoes: d.observacoes,
});

/** Cria (sem id) ou edita (com id) um contrato, com registro no histórico. */
export async function salvarContrato(d: DadosContrato, socio: { id: string; nome: string }) {
  const anterior = d.id ? (await listarContratos()).find((c) => c.id === d.id) : undefined;
  if (d.id && !anterior) throw new Error("Contrato não encontrado.");
  const encerrou = anterior && anterior.situacao !== "encerrado" && d.situacao === "encerrado";
  const descricao = `Contrato — ${d.cliente}${encerrou ? " (encerrado)" : ""}`;
  if (!modoDemo) {
    const c = await consultasEmpresa();
    if (!d.id) return c.criarContrato(camposContrato(d), socio.id);
    await c.atualizarContrato(d.id, camposContrato(d), socio.id, descricao);
    return d.id;
  }
  const novo: ContratoCliente = {
    id: d.id ?? crypto.randomUUID(),
    leadId: d.leadId || null,
    cliente: d.cliente,
    produto: d.produto,
    inicio: d.inicio,
    fim: d.fim,
    valorMensal: d.valorMensal,
    valorImplantacao: d.valorImplantacao,
    situacao: d.situacao,
    observacoes: d.observacoes,
  };
  const m = memoria();
  m.contratos = anterior ? m.contratos.map((c) => (c.id === novo.id ? novo : c)) : [novo, ...m.contratos];
  registrar(socio.nome, anterior ? "editou" : "criou", "contrato", descricao);
  return novo.id;
}

/* ---------------- Agenda ---------------- */
export type FonteAgenda = "google" | "demo";

/**
 * Eventos entre duas datas. Com o Google Agenda configurado, lê a agenda real da GTM
 * (o que muda no Google aparece aqui na hora). Sem ele, usa os eventos de demonstração.
 */
export async function listarEventos(de: string, ate: string): Promise<{ eventos: Evento[]; fonte: FonteAgenda; erro?: string }> {
  const g = await import("./google-agenda");
  if (!g.googleAgendaLigado()) {
    return { eventos: memoria().eventos.filter((e) => e.data >= de && e.data <= ate), fonte: "demo" };
  }
  try {
    return { eventos: await g.listarEventosGoogle(de, ate), fonte: "google" };
  } catch (e) {
    return { eventos: [], fonte: "google", erro: e instanceof Error ? e.message : "Falha ao ler o Google Agenda." };
  }
}

/** Cria o evento no Google Agenda (ou na memória da demonstração) e registra no histórico. */
export async function criarEvento(d: DadosEvento, socio: { id: string; nome: string }) {
  const g = await import("./google-agenda");
  if (g.googleAgendaLigado()) {
    const id = await g.criarEventoGoogle(d);
    await registrarNoHistorico(socio, "criou", "evento", `Evento — ${d.titulo}`);
    return id;
  }
  const novo: Evento = { id: crypto.randomUUID(), titulo: d.titulo, data: d.data, inicio: d.inicio, fim: d.fim, socioId: d.socioId, tipo: d.tipo };
  memoria().eventos.push(novo);
  registrar(socio.nome, "criou", "evento", `Evento — ${d.titulo}`);
  return novo.id;
}

export async function excluirEvento(id: string, titulo: string, socio: { id: string; nome: string }) {
  const g = await import("./google-agenda");
  if (g.googleAgendaLigado()) {
    await g.excluirEventoGoogle(id);
    await registrarNoHistorico(socio, "excluiu", "evento", `Evento — ${titulo}`);
    return;
  }
  memoria().eventos = memoria().eventos.filter((e) => e.id !== id);
  registrar(socio.nome, "excluiu", "evento", `Evento — ${titulo}`);
}

/** Histórico de ações sem tabela própria (ex.: eventos que vivem no Google). */
async function registrarNoHistorico(socio: { id: string; nome: string }, acao: "criou" | "excluiu", entidade: string, nome: string) {
  if (modoDemo) return registrar(socio.nome, acao, entidade, nome);
  const [{ db }, { historico }] = await Promise.all([import("@/db"), import("@/db/schema")]);
  await db.insert(historico).values({ atorTipo: "socio", atorId: socio.id, acao, entidade, detalhes: { nome } });
}
