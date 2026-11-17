// Ponto único de acesso a dados do painel. Só roda no servidor.
// Com DATABASE_URL definida, leads e histórico vêm do Neon (src/db).
// Sem ela, o Hub roda em modo demonstração com dados fictícios em memória.
import "server-only";
import { CONTRATOS, EMPRESA_DEMO, EVENTOS, HISTORICO_INICIAL, MENSAGENS_DEMO, LEADS_INICIAIS, SOCIOS, type Evento, type EventoHistorico, type Lead, type Socio } from "./demo/dados";
import type { DadosEvento } from "./regras/agenda";
import { MINUTOS_PARA_APAGAR, podeApagar, type Mensagem } from "./regras/chat";
import { EMPRESA_VAZIA, type ContratoCliente, type DadosContrato, type DadosEmpresa } from "./regras/empresa";
import { nomeEtapa, type DadosEditarLead, type DadosNovoLead, type EtapaId } from "./regras/funil";
import { inicioDoMes, type CodigoIA, type ConteudoPlanoIA, type PlanoIASalvo } from "./regras/ia";
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

type InscricaoPushMemoria = { socioId: string; endpoint: string; p256dh: string; auth: string };
type Memoria = {
  leads: Lead[];
  historico: EventoHistorico[];
  diagnosticos: (DiagnosticoSalvo & { respostas?: Record<string, unknown> })[];
  planosIa: PlanoIASalvo[];
  empresa: DadosEmpresa;
  contratos: ContratoCliente[];
  eventos: Evento[];
  mensagens: Mensagem[];
  leituras: Record<string, string>;
  apagadasEm: Record<string, string>;
  vistos: Record<string, string>;
  inscricoes?: (InscricaoPushMemoria)[];
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
  m.planosIa ??= [];
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
  m.mensagens ??= structuredClone(MENSAGENS_DEMO);
  m.leituras ??= {};
  m.apagadasEm ??= {};
  // Demonstração: Thalis aparece online e Mateus visto há algumas horas.
  m.vistos ??= {
    "s-thalis": new Date(Date.now() - 60_000).toISOString(),
    "s-mateus": new Date(Date.now() - 3 * 60 * 60_000).toISOString(),
  };
  return m;
}

async function neon() {
  const consultas = await import("@/db/consultas/leads");
  return consultas;
}

const CORES_SOCIOS = ["#3f6fd8", "#eb6834", "#1baf7a", "#eda100"];

/** Sócios: tabela `socios` do Neon (ordem de cadastro) ou a lista fictícia da demonstração. */
export async function listarSocios(): Promise<Socio[]> {
  if (modoDemo) return SOCIOS.map((s) => ({ ...s, vistoEm: memoria().vistos[s.id] ?? null }));
  const [{ db }, { socios }, { asc }] = await Promise.all([import("@/db"), import("@/db/schema"), import("drizzle-orm")]);
  const linhas = await db
    .select({ id: socios.id, nome: socios.nome, email: socios.email, area: socios.area, vistoEm: socios.vistoEm })
    .from(socios)
    .orderBy(asc(socios.criadoEm), asc(socios.nome));
  return linhas.map((s, i) => ({
    id: s.id,
    nome: s.nome,
    email: s.email,
    area: s.area ?? "Sócio",
    foco: s.area ?? "",
    cor: CORES_SOCIOS[i % CORES_SOCIOS.length]!,
    vistoEm: s.vistoEm?.toISOString() ?? null,
  }));
}

/** Marca que o sócio usou o painel agora ("visto por último"). Quem chama limita a uma vez por minuto. */
export async function registrarVisto(socioId: string) {
  if (modoDemo) {
    memoria().vistos[socioId] = new Date().toISOString();
    return;
  }
  const [{ db }, { socios }, { eq }] = await Promise.all([import("@/db"), import("@/db/schema"), import("drizzle-orm")]);
  await db.update(socios).set({ vistoEm: new Date() }).where(eq(socios.id, socioId));
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
    const id = await salvarDiagnostico({ leadId, respostas, ...resultado, criadoPor: socio.id }, lead.nome);
    return { ...resultado, id };
  }
  const { leadId: _lead, ...respostas } = dados;
  memoria().diagnosticos.unshift({
    id: crypto.randomUUID(),
    leadId: dados.leadId,
    respostas,
    ...resultado,
    autor: socio.nome,
    criadoEm: new Date().toISOString(),
  });
  lead.pontuacao = resultado.pontuacao;
  lead.veredito = resultado.veredito;
  registrar(socio.nome, "criou", "diagnostico", `${lead.nome} — ${pontuacao} pontos`);
  return { ...resultado, id: memoria().diagnosticos[0]!.id };
}

export async function listarDiagnosticos(leadId: string): Promise<DiagnosticoSalvo[]> {
  if (modoDemo) return memoria().diagnosticos.filter((d) => d.leadId === leadId).map(({ respostas: _r, ...d }) => d);
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

/* ---------------- Chat interno ---------------- */
async function consultasChat() {
  return import("@/db/consultas/chat");
}

/** Últimas mensagens do chat, da mais antiga para a mais nova. */
export async function listarMensagens(): Promise<Mensagem[]> {
  if (modoDemo) return memoria().mensagens;
  const { listarMensagens } = await consultasChat();
  return (await listarMensagens()).map((m) => ({
    id: m.id,
    autorId: m.autorId,
    texto: m.apagadaEm ? "" : m.texto,
    apagada: !!m.apagadaEm,
    em: m.criadoEm.toISOString(),
  }));
}

/** Folga para não perder mensagem gravada perto do corte (o navegador ignora as repetidas pelo id). */
const FOLGA_CURSOR_MS = 5000;

/**
 * Atualização incremental do chat: devolve só mensagens novas ou apagadas desde `cursor`
 * e o novo cursor (hora do servidor). Sem novidade, a resposta é uma lista vazia.
 */
export async function buscarMudancasChat(cursor: string): Promise<{ mensagens: Mensagem[]; cursor: string }> {
  const agora = new Date();
  const desde = new Date(new Date(cursor).getTime() - FOLGA_CURSOR_MS);
  if (modoDemo) {
    const d = desde.toISOString();
    return {
      mensagens: memoria().mensagens.filter((m) => m.em > d || (memoria().apagadasEm[m.id] ?? "") > d),
      cursor: agora.toISOString(),
    };
  }
  const { listarMudancas } = await consultasChat();
  const linhas = await listarMudancas(desde);
  return {
    mensagens: linhas.map((m) => ({
      id: m.id,
      autorId: m.autorId,
      texto: m.apagadaEm ? "" : m.texto,
      apagada: !!m.apagadaEm,
      em: m.criadoEm.toISOString(),
    })),
    cursor: agora.toISOString(),
  };
}

export async function enviarMensagem(texto: string, socio: { id: string }): Promise<Mensagem> {
  if (!modoDemo) {
    const c = await consultasChat();
    const m = await c.criarMensagem(socio.id, texto);
    await c.marcarLido(socio.id);
    return { id: m.id, autorId: m.autorId, texto: m.texto, apagada: false, em: m.criadoEm.toISOString() };
  }
  const nova: Mensagem = { id: crypto.randomUUID(), autorId: socio.id, texto, apagada: false, em: new Date().toISOString() };
  memoria().mensagens.push(nova);
  memoria().leituras[socio.id] = nova.em;
  return nova;
}

/** Só o autor apaga, e só dentro do prazo (MINUTOS_PARA_APAGAR). Devolve se apagou. */
export async function apagarMensagem(id: string, socio: { id: string }): Promise<boolean> {
  const desde = new Date(Date.now() - MINUTOS_PARA_APAGAR * 60_000);
  if (!modoDemo) {
    const { apagarMensagem } = await consultasChat();
    return apagarMensagem(id, socio.id, desde);
  }
  const m = memoria().mensagens.find((x) => x.id === id);
  if (!m || !podeApagar(m, socio.id)) return false;
  m.texto = "";
  m.apagada = true;
  memoria().apagadasEm[m.id] = new Date().toISOString();
  return true;
}

export async function marcarChatLido(socio: { id: string }) {
  if (!modoDemo) {
    const { marcarLido } = await consultasChat();
    return marcarLido(socio.id);
  }
  memoria().leituras[socio.id] = new Date().toISOString();
}

export async function contarMensagensNaoLidas(socio: { id: string }): Promise<number> {
  if (!modoDemo) {
    const { contarNaoLidas } = await consultasChat();
    return contarNaoLidas(socio.id);
  }
  const lido = memoria().leituras[socio.id] ?? "";
  return memoria().mensagens.filter((m) => m.autorId !== socio.id && !m.apagada && m.em > lido).length;
}

/* ---------------- Notificações (Web Push) ---------------- */
type InscricaoPush = { endpoint: string; p256dh: string; auth: string };

export async function salvarInscricaoPush(socio: { id: string }, i: InscricaoPush, aparelho: string) {
  if (modoDemo) {
    memoria().inscricoes = [...(memoria().inscricoes ?? []).filter((x) => x.endpoint !== i.endpoint), { ...i, socioId: socio.id }];
    return;
  }
  const { salvarInscricao } = await consultasChat();
  await salvarInscricao(socio.id, i, aparelho);
}

export async function removerInscricaoPush(endpoint: string) {
  if (modoDemo) {
    memoria().inscricoes = (memoria().inscricoes ?? []).filter((x) => x.endpoint !== endpoint);
    return;
  }
  const { removerInscricoes } = await consultasChat();
  await removerInscricoes([endpoint]);
}

/** Avisa os outros sócios de uma mensagem nova (em todos os aparelhos que ativaram). */
export async function notificarMensagem(autor: { id: string; nome: string }, texto: string) {
  const [{ enviarAvisos, pushConfigurado }, { avisoDeMensagem }] = await Promise.all([import("./push"), import("./regras/chat")]);
  if (!pushConfigurado()) return;
  const lista = modoDemo
    ? (memoria().inscricoes ?? []).filter((x) => x.socioId !== autor.id)
    : await (await consultasChat()).inscricoesDosOutros(autor.id);
  const porSocio = new Map<string, InscricaoPush[]>();
  for (const i of lista) porSocio.set(i.socioId, [...(porSocio.get(i.socioId) ?? []), i]);
  const expirados = (
    await Promise.all(
      [...porSocio].map(async ([socioId, inscricoes]) => {
        const naoLidas = await contarMensagensNaoLidas({ id: socioId });
        return enviarAvisos(inscricoes, avisoDeMensagem(autor.nome, texto, naoLidas));
      }),
    )
  ).flat();
  if (expirados.length && !modoDemo) await (await consultasChat()).removerInscricoes(expirados);
}

/** Notificação de teste só para os aparelhos do próprio sócio. Devolve quantos aparelhos receberam. */
export async function testarPush(socio: { id: string }): Promise<number> {
  const { enviarAvisos, pushConfigurado } = await import("./push");
  if (!pushConfigurado()) return 0;
  const lista = modoDemo
    ? (memoria().inscricoes ?? []).filter((x) => x.socioId === socio.id)
    : await (await consultasChat()).inscricoesDe(socio.id);
  const expirados = await enviarAvisos(lista, { titulo: "GTM Hub", texto: "Notificações ativadas neste aparelho.", url: "/chat" });
  if (expirados.length && !modoDemo) await (await consultasChat()).removerInscricoes(expirados);
  return lista.length - expirados.length;
}

/* ---------------- IA: relatório e plano do protótipo ---------------- */
async function consultasIa() {
  return import("@/db/consultas/ia");
}

const ehUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export type DiagnosticoParaIa = {
  id: string | null;
  pontuacao: number;
  veredito: Veredito;
  complexidade: "baixa" | "media" | "alta" | null;
  respostas: Record<string, unknown>;
  criadoEm: string;
};

/** Diagnóstico com as respostas do checklist: o indicado ou o mais recente do lead. */
export async function buscarDiagnosticoParaIa(leadId: string, diagnosticoId?: string): Promise<DiagnosticoParaIa | null> {
  if (modoDemo) {
    const d = memoria().diagnosticos.find((x) => x.leadId === leadId && (!diagnosticoId || x.id === diagnosticoId));
    return d ? { id: d.id, pontuacao: d.pontuacao, veredito: d.veredito, complexidade: d.complexidade, respostas: d.respostas ?? {}, criadoEm: d.criadoEm } : null;
  }
  if (!ehUuid(leadId) || (diagnosticoId && !ehUuid(diagnosticoId))) return null;
  const { diagnosticoParaIa } = await consultasIa();
  const d = await diagnosticoParaIa(leadId, diagnosticoId);
  return d
    ? { id: d.id, pontuacao: d.pontuacao, veredito: d.veredito, complexidade: d.complexidade, respostas: d.respostas, criadoEm: d.criadoEm.toISOString() }
    : null;
}

/** Gasto estimado com IA no mês corrente (fuso de São Paulo), em reais. */
export async function gastoIaDoMes(): Promise<number> {
  const desde = inicioDoMes();
  if (modoDemo) return memoria().planosIa.filter((p) => new Date(p.criadoEm) >= desde).reduce((a, p) => a + p.custoBRL, 0);
  const { gastoDesde } = await consultasIa();
  return (await gastoDesde(desde)) / 100;
}

export type RegistroGeracao = {
  leadId: string;
  leadNome: string;
  diagnosticoId: string | null;
  conteudo: ConteudoPlanoIA | null;
  erro?: string;
  modelo: string;
  tokens: { entrada: number; saida: number; cacheLeitura: number; cacheEscrita: number };
  custoBRL: number;
  exemplo?: boolean;
};

/** Grava a geração (que deu certo ou não) e o histórico no mesmo lote. Devolve o plano salvo, se houver. */
export async function registrarGeracaoIa(g: RegistroGeracao, socio: { id: string; nome: string }): Promise<PlanoIASalvo | null> {
  const criadoEm = new Date().toISOString();
  if (modoDemo) {
    if (!g.conteudo) {
      registrar(socio.nome, "executou", "plano_ia", `${g.leadNome} — geração falhou`);
      return null;
    }
    const plano: PlanoIASalvo = {
      id: crypto.randomUUID(),
      leadId: g.leadId,
      diagnosticoId: g.diagnosticoId,
      conteudo: g.conteudo,
      modelo: g.modelo,
      tokensEntrada: g.tokens.entrada,
      tokensSaida: g.tokens.saida,
      custoBRL: g.custoBRL,
      autor: socio.nome,
      criadoEm,
      exemplo: !!g.exemplo,
    };
    memoria().planosIa.unshift(plano);
    registrar(socio.nome, "criou", "plano_ia", `${g.leadNome} — relatório e plano`);
    return plano;
  }
  const { salvarPlanoIa } = await consultasIa();
  const id = await salvarPlanoIa(
    {
      leadId: g.leadId,
      diagnosticoId: g.diagnosticoId,
      situacao: g.conteudo ? "ok" : "erro",
      conteudo: g.conteudo,
      erro: g.erro?.slice(0, 500) ?? null,
      modelo: g.modelo,
      tokensEntrada: g.tokens.entrada,
      tokensSaida: g.tokens.saida,
      tokensCacheLeitura: g.tokens.cacheLeitura,
      tokensCacheEscrita: g.tokens.cacheEscrita,
      custoCentavos: Math.round(g.custoBRL * 100),
      criadoPor: socio.id,
    },
    g.leadNome,
  );
  if (!g.conteudo) return null;
  return {
    id,
    leadId: g.leadId,
    diagnosticoId: g.diagnosticoId,
    conteudo: g.conteudo,
    modelo: g.modelo,
    tokensEntrada: g.tokens.entrada,
    tokensSaida: g.tokens.saida,
    custoBRL: g.custoBRL,
    autor: socio.nome,
    criadoEm,
    exemplo: false,
  };
}

type LinhaPlano = Awaited<ReturnType<Awaited<ReturnType<typeof consultasIa>>["buscarPlanoIa"]>>;

async function paraPlanoSalvo(r: LinhaPlano): Promise<PlanoIASalvo | null> {
  if (!r?.plano.conteudo || r.plano.situacao !== "ok") return null;
  const { esquemaPlanoIA } = await import("./regras/ia");
  const conteudo = esquemaPlanoIA.safeParse(r.plano.conteudo);
  if (!conteudo.success) return null;
  return {
    id: r.plano.id,
    leadId: r.plano.leadId,
    diagnosticoId: r.plano.diagnosticoId,
    conteudo: conteudo.data,
    modelo: r.plano.modelo,
    tokensEntrada: r.plano.tokensEntrada,
    tokensSaida: r.plano.tokensSaida,
    custoBRL: r.plano.custoCentavos / 100,
    autor: r.autor,
    criadoEm: r.plano.criadoEm.toISOString(),
    exemplo: false,
  };
}

/** Último relatório e plano que deram certo para o lead. */
export async function ultimoPlanoIa(leadId: string): Promise<PlanoIASalvo | null> {
  if (modoDemo) return memoria().planosIa.find((p) => p.leadId === leadId) ?? null;
  if (!ehUuid(leadId)) return null;
  const { ultimoPlanoIa } = await consultasIa();
  return paraPlanoSalvo(await ultimoPlanoIa(leadId));
}

/** Plano gravado do lead indicado (segunda etapa: código). */
export async function buscarPlanoIa(leadId: string, planoId: string): Promise<PlanoIASalvo | null> {
  if (modoDemo) return memoria().planosIa.find((p) => p.id === planoId && p.leadId === leadId) ?? null;
  if (!ehUuid(planoId)) return null;
  const { buscarPlanoIa } = await consultasIa();
  const p = await paraPlanoSalvo(await buscarPlanoIa(planoId));
  return p && p.leadId === leadId ? p : null;
}

/** Junta o esqueleto de código ao plano e soma o custo. Devolve o plano completo. */
export async function anexarCodigoIa(
  plano: PlanoIASalvo,
  g: Pick<RegistroGeracao, "leadNome" | "tokens" | "custoBRL"> & { codigo: CodigoIA },
  socio: { id: string; nome: string },
): Promise<PlanoIASalvo> {
  const completo: PlanoIASalvo = {
    ...plano,
    conteudo: { ...plano.conteudo, codigo: g.codigo },
    tokensEntrada: plano.tokensEntrada + g.tokens.entrada,
    tokensSaida: plano.tokensSaida + g.tokens.saida,
    custoBRL: Math.round((plano.custoBRL + g.custoBRL) * 100) / 100,
  };
  if (modoDemo) {
    memoria().planosIa = memoria().planosIa.map((p) => (p.id === plano.id ? completo : p));
    registrar(socio.nome, "editou", "plano_ia", `${g.leadNome} — esqueleto de código`);
    return completo;
  }
  const { anexarCodigo } = await consultasIa();
  await anexarCodigo(
    plano.id,
    completo.conteudo,
    {
      tokensEntrada: g.tokens.entrada,
      tokensSaida: g.tokens.saida,
      tokensCacheLeitura: g.tokens.cacheLeitura,
      tokensCacheEscrita: g.tokens.cacheEscrita,
      custoCentavos: Math.round(g.custoBRL * 100),
    },
    socio.id,
    g.leadNome,
  );
  return completo;
}
