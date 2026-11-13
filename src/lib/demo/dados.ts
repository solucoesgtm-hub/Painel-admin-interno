// Dados de demonstração — TODOS FICTÍCIOS. Usados enquanto o Neon não está configurado.
// As datas são relativas a hoje, para a demonstração nunca ficar velha.
import { hojeISO, somarDias } from "../formato";
import type { EtapaId } from "../regras/funil";
import type { Requisito } from "../regras/editais";
import type { Veredito } from "../regras/pontuacao";

const H = hojeISO();
const d = (dias: number) => somarDias(H, dias);
const ts = (dias: number, hora = "10:00") => `${d(dias)}T${hora}:00-03:00`;

export type Socio = { id: string; nome: string; email: string; area: string; cor: string; foco: string };

export const SOCIOS: Socio[] = [
  { id: "s-gabriel", nome: "Gabriel", email: "gabriel@exemplo.test", area: "Tecnologia e produto", cor: "#3f6fd8", foco: "Implantações e agentes de IA" },
  { id: "s-thalis", nome: "Thalis", email: "thalis@exemplo.test", area: "Comercial e relacionamento", cor: "#eb6834", foco: "Visitas, propostas e pós-venda" },
  { id: "s-mateus", nome: "Mateus", email: "mateus@exemplo.test", area: "Financeiro e editais", cor: "#1baf7a", foco: "Caixa, contratos e captação" },
];
export const socioPorId = (id: string) => SOCIOS.find((s) => s.id === id);

export type Lead = {
  id: string;
  nome: string;
  segmento: string;
  cidade: string;
  contatoNome: string;
  contatoTelefone: string;
  origem: string;
  etapa: EtapaId;
  donoId: string;
  proximoPasso: string;
  proximoPassoData: string;
  motivoPerda: string | null;
  etapaDesde: string;
  criadoEm: string;
  pontuacao: number | null;
  veredito: Veredito | null;
  valorImplantacao: number;
  mensalidade: number;
};

let n = 0;
const lead = (p: Partial<Lead> & Pick<Lead, "nome" | "segmento" | "etapa" | "donoId" | "proximoPasso">, desde: number, prox: number): Lead => ({
  id: `l-${++n}`,
  cidade: "Marilândia",
  contatoNome: "Contato (exemplo)",
  contatoTelefone: "(27) 90000-00" + String(n).padStart(2, "0"),
  origem: "Indicação",
  motivoPerda: null,
  pontuacao: null,
  veredito: null,
  valorImplantacao: 0,
  mensalidade: 0,
  ...p,
  proximoPassoData: d(prox),
  etapaDesde: ts(-desde),
  criadoEm: ts(-desde - 6),
});

export const LEADS_INICIAIS: Lead[] = [
  lead({ nome: "Padaria Pão do Vale (exemplo)", segmento: "Padaria", etapa: "lead", donoId: "s-thalis", proximoPasso: "Ligar para agendar visita", origem: "Instagram" }, 2, 1),
  lead({ nome: "Oficina Roda Firme (exemplo)", segmento: "Oficina", etapa: "lead", donoId: "s-thalis", proximoPasso: "Enviar apresentação pelo WhatsApp", origem: "Visita espontânea", cidade: "Colatina" }, 9, -1),
  lead({ nome: "Ótica Vista Clara (exemplo)", segmento: "Loja de roupas", etapa: "lead", donoId: "s-mateus", proximoPasso: "Confirmar interesse", origem: "Evento" }, 1, 3),
  lead({ nome: "Clínica Sorriso Leve (exemplo)", segmento: "Clínica", etapa: "visita", donoId: "s-thalis", proximoPasso: "Visita de diagnóstico às 14h", origem: "Indicação", pontuacao: 78, veredito: "quente" }, 3, 0),
  lead({ nome: "Mercadinho Bom Preço (exemplo)", segmento: "Mercado", etapa: "visita", donoId: "s-gabriel", proximoPasso: "Levantar fluxo de estoque", origem: "Google", pontuacao: 52, veredito: "morno", cidade: "Colatina" }, 11, 2),
  lead({ nome: "Academia Movimento (exemplo)", segmento: "Academia", etapa: "proposta", donoId: "s-thalis", proximoPasso: "Apresentar proposta revisada", origem: "Instagram", pontuacao: 81, veredito: "quente", valorImplantacao: 2400, mensalidade: 390 }, 4, 2),
  lead({ nome: "Restaurante Sabor da Serra (exemplo)", segmento: "Restaurante", etapa: "proposta", donoId: "s-gabriel", proximoPasso: "Cobrar retorno da proposta", origem: "Indicação", pontuacao: 63, veredito: "morno", valorImplantacao: 1800, mensalidade: 290 }, 8, -2),
  lead({ nome: "Farmácia Vida Plena (exemplo)", segmento: "Farmácia", etapa: "fechado", donoId: "s-mateus", proximoPasso: "Assinar contrato", origem: "Evento", pontuacao: 74, veredito: "quente", valorImplantacao: 3200, mensalidade: 450 }, 2, 1),
  lead({ nome: "Clínica Bem Estar (exemplo)", segmento: "Clínica", etapa: "em_desenvolvimento", donoId: "s-gabriel", proximoPasso: "Entregar agente de agendamento", origem: "Indicação", pontuacao: 86, veredito: "quente", valorImplantacao: 3800, mensalidade: 490 }, 6, 4),
  lead({ nome: "Loja Estilo Vivo (exemplo)", segmento: "Loja de roupas", etapa: "em_desenvolvimento", donoId: "s-gabriel", proximoPasso: "Testar catálogo no WhatsApp", origem: "Instagram", pontuacao: 69, veredito: "morno", valorImplantacao: 2200, mensalidade: 320 }, 12, 0),
  lead({ nome: "Padaria São José (exemplo)", segmento: "Padaria", etapa: "manutencao", donoId: "s-thalis", proximoPasso: "Revisão mensal de uso", origem: "Indicação", pontuacao: 72, veredito: "quente", valorImplantacao: 1900, mensalidade: 290 }, 60, 6),
  lead({ nome: "Auto Peças Central (exemplo)", segmento: "Oficina", etapa: "manutencao", donoId: "s-mateus", proximoPasso: "Ajustar respostas automáticas", origem: "Google", pontuacao: 66, veredito: "morno", valorImplantacao: 2100, mensalidade: 340, cidade: "Colatina" }, 95, 9),
  lead({ nome: "Pet Shop Amigo Fiel (exemplo)", segmento: "Loja de roupas", etapa: "perdido", donoId: "s-thalis", proximoPasso: "Retomar contato em 90 dias", origem: "Instagram", motivoPerda: "Preço acima do orçamento", pontuacao: 38, veredito: "frio" }, 20, 70),
  lead({ nome: "Sorveteria Gelato (exemplo)", segmento: "Restaurante", etapa: "perdido", donoId: "s-gabriel", proximoPasso: "Retomar no verão", origem: "Visita espontânea", motivoPerda: "Sem urgência agora", pontuacao: 41, veredito: "frio" }, 32, 50),
];

export type EventoHistorico = {
  id: string;
  ator: { tipo: "socio" | "agente" | "sistema"; nome: string };
  acao: "criou" | "editou" | "excluiu" | "moveu_etapa" | "aprovou" | "recusou" | "executou";
  entidade: string;
  descricao: string;
  em: string;
};

export const HISTORICO_INICIAL: EventoHistorico[] = [
  { id: "h1", ator: { tipo: "socio", nome: "Thalis" }, acao: "moveu_etapa", entidade: "lead", descricao: "Academia Movimento (exemplo) → Proposta", em: ts(0, "09:12") },
  { id: "h2", ator: { tipo: "agente", nome: "Agente de follow-up" }, acao: "criou", entidade: "aprovacao", descricao: "Mensagem de retorno para Restaurante Sabor da Serra", em: ts(0, "08:30") },
  { id: "h3", ator: { tipo: "socio", nome: "Mateus" }, acao: "editou", entidade: "mensalidade", descricao: "Padaria São José — marcada como paga", em: ts(-1, "17:40") },
  { id: "h4", ator: { tipo: "socio", nome: "Gabriel" }, acao: "criou", entidade: "projeto", descricao: "Agente de agendamento — Clínica Bem Estar", em: ts(-1, "15:05") },
  { id: "h5", ator: { tipo: "sistema", nome: "Radar de editais" }, acao: "executou", entidade: "edital", descricao: "2 novos editais encontrados", em: ts(-2, "06:00") },
  { id: "h6", ator: { tipo: "socio", nome: "Thalis" }, acao: "criou", entidade: "diagnostico", descricao: "Clínica Sorriso Leve — 78 pontos (Quente)", em: ts(-2, "14:22") },
  { id: "h7", ator: { tipo: "socio", nome: "Mateus" }, acao: "criou", entidade: "contrato", descricao: "Contrato Farmácia Vida Plena gerado a partir da proposta", em: ts(-3, "11:10") },
  { id: "h8", ator: { tipo: "socio", nome: "Gabriel" }, acao: "aprovou", entidade: "aprovacao", descricao: "Lembrete de pagamento para Auto Peças Central", em: ts(-3, "09:02") },
  { id: "h9", ator: { tipo: "socio", nome: "Thalis" }, acao: "moveu_etapa", entidade: "lead", descricao: "Pet Shop Amigo Fiel → Perdido (Preço acima do orçamento)", em: ts(-4, "16:48") },
  { id: "h10", ator: { tipo: "socio", nome: "Mateus" }, acao: "excluiu", entidade: "custo", descricao: "Assinatura duplicada de ferramenta de design", em: ts(-5, "10:30") },
  { id: "h11", ator: { tipo: "agente", nome: "Agente financeiro" }, acao: "executou", entidade: "conciliacao", descricao: "4 entradas conciliadas automaticamente", em: ts(-5, "07:00") },
];

// ---------- Financeiro ----------
export const FATURAMENTO_MESES = [
  { mes: "dez", entradas: 2100, saidas: 1290 },
  { mes: "jan", entradas: 2580, saidas: 1380 },
  { mes: "fev", entradas: 2870, saidas: 1420 },
  { mes: "mar", entradas: 3310, saidas: 1510 },
  { mes: "abr", entradas: 3640, saidas: 1560 },
  { mes: "mai", entradas: 3990, saidas: 1600 },
  { mes: "jun", entradas: 4300, saidas: 1650 },
  { mes: "jul", entradas: 5120, saidas: 1720 },
  { mes: "ago", entradas: 6240, saidas: 2100 },
  { mes: "set", entradas: 7180, saidas: 2380 },
  { mes: "out", entradas: 8350, saidas: 2460 },
  { mes: "nov", entradas: 6890, saidas: 1980 },
];

export type Mensalidade = { id: string; cliente: string; produto: string; valor: number; vencimento: string; pagoEm: string | null };
export const MENSALIDADES: Mensalidade[] = [
  { id: "m1", cliente: "Padaria São José (exemplo)", produto: "Atendente WhatsApp", valor: 290, vencimento: d(-7), pagoEm: d(-8) },
  { id: "m2", cliente: "Auto Peças Central (exemplo)", produto: "Atendente WhatsApp + Estoque", valor: 340, vencimento: d(-3), pagoEm: null },
  { id: "m3", cliente: "Clínica Bem Estar (exemplo)", produto: "Agente de agendamento", valor: 490, vencimento: d(5), pagoEm: null },
  { id: "m4", cliente: "Loja Estilo Vivo (exemplo)", produto: "Catálogo inteligente", valor: 320, vencimento: d(8), pagoEm: null },
  { id: "m5", cliente: "Farmácia Vida Plena (exemplo)", produto: "Atendente WhatsApp + Estoque", valor: 450, vencimento: d(12), pagoEm: null },
  { id: "m6", cliente: "Clínica Sorriso Leve (exemplo)", produto: "Agente de agendamento", valor: 490, vencimento: d(-12), pagoEm: d(-12) },
];

export type Lancamento = { id: string; data: string; descricao: string; valor: number; tipo: "entrada" | "saida"; conciliadoCom: string | null; categoria?: string };
export const EXTRATO: Lancamento[] = [
  { id: "e1", data: d(0), descricao: "Pix recebido — Clínica Bem Estar (exemplo)", valor: 1900, tipo: "entrada", conciliadoCom: "Parcela 2/2 implantação" },
  { id: "e2", data: d(-1), descricao: "Pix recebido — Auto Peças Central (exemplo)", valor: 340, tipo: "entrada", conciliadoCom: null },
  { id: "e3", data: d(-1), descricao: "Hospedagem e servidores", valor: 189.9, tipo: "saida", conciliadoCom: null, categoria: "Infraestrutura" },
  { id: "e4", data: d(-2), descricao: "Créditos de API de IA", valor: 212.4, tipo: "saida", conciliadoCom: null, categoria: "IA" },
  { id: "e5", data: d(-4), descricao: "Pix recebido — Farmácia Vida Plena (exemplo)", valor: 1600, tipo: "entrada", conciliadoCom: "Parcela 1/2 implantação" },
  { id: "e6", data: d(-5), descricao: "DAS MEI", valor: 76.9, tipo: "saida", conciliadoCom: null, categoria: "Impostos" },
  { id: "e7", data: d(-8), descricao: "Pix recebido — Padaria São José (exemplo)", valor: 290, tipo: "entrada", conciliadoCom: "Mensalidade nov" },
  { id: "e8", data: d(-9), descricao: "Combustível — visitas", valor: 160, tipo: "saida", conciliadoCom: null, categoria: "Deslocamento" },
];

export const CUSTOS_FIXOS = [
  { nome: "Hospedagem e servidores", categoria: "Infraestrutura", valor: 189.9 },
  { nome: "Créditos de IA (média)", categoria: "IA", valor: 240 },
  { nome: "DAS MEI", categoria: "Impostos", valor: 76.9 },
  { nome: "Ferramentas (n8n, design, e-mail)", categoria: "Ferramentas", valor: 168 },
  { nome: "Telefone e internet", categoria: "Operação", valor: 120 },
];

export const MEI = { abertura: "2025-03-01", faturadoNoAno: 61_480 };

// ---------- Editais ----------
export type SituacaoEdital = "em_analise" | "aplicando" | "enviado" | "descartado" | "resultado";
export type Edital = {
  id: string;
  orgao: string;
  numero: string;
  objeto: string;
  valor: number;
  publico: string;
  regiao: string;
  prazo: string;
  situacao: SituacaoEdital;
  origem: "link" | "pdf" | "radar";
  cronograma: { etapa: string; data: string }[];
  documentos: string[];
  criterios: { nome: string; peso: number }[];
  vedacoes: string[];
  contrapartidas: string[];
  duvidas: string[];
  requisitos: Requisito[];
};

export const EDITAIS: Edital[] = [
  {
    id: "ed-1",
    orgao: "Fundação de Amparo à Pesquisa (exemplo)",
    numero: "Edital 14/2026 (fictício)",
    objeto: "Apoio a startups e microempresas com soluções de inteligência artificial para o comércio local",
    valor: 60000,
    publico: "MEI, ME e startups com sede no ES",
    regiao: "Espírito Santo",
    prazo: d(18),
    situacao: "aplicando",
    origem: "radar",
    cronograma: [
      { etapa: "Inscrições", data: d(18) },
      { etapa: "Resultado preliminar", data: d(48) },
      { etapa: "Recursos", data: d(55) },
      { etapa: "Resultado final", data: d(70) },
    ],
    documentos: ["Cartão CNPJ", "Certidão negativa federal", "Certidão FGTS", "Plano de trabalho", "Currículo da equipe"],
    criterios: [
      { nome: "Inovação da solução", peso: 30 },
      { nome: "Impacto regional", peso: 25 },
      { nome: "Capacidade da equipe", peso: 20 },
      { nome: "Viabilidade comercial", peso: 15 },
      { nome: "Contrapartida", peso: 10 },
    ],
    vedacoes: ["Empresas com débitos fiscais", "Projetos já financiados pelo mesmo programa"],
    contrapartidas: ["10% do valor em horas de equipe"],
    duvidas: ["MEI aberto há menos de 2 anos pode participar?", "Horas dos sócios valem como contrapartida?"],
    requisitos: [
      { id: "r1", texto: "Sede no Espírito Santo", eliminatorio: true, marcacao: "atende", pagina: 3, trecho: "empresas com sede no Estado do Espírito Santo", perfil: "Sede em Marilândia, ES" },
      { id: "r2", texto: "Enquadramento como MEI, ME ou EPP", eliminatorio: true, marcacao: "atende", pagina: 3, trecho: "microempreendedores individuais, microempresas e empresas de pequeno porte", perfil: "MEI" },
      { id: "r3", texto: "Certidões negativas válidas na inscrição", eliminatorio: true, marcacao: "verificar", pagina: 7, trecho: "certidões válidas na data da submissão", perfil: "Certidão FGTS vence antes do prazo" },
      { id: "r4", texto: "Mínimo de 1 ano de abertura", eliminatorio: false, marcacao: "atende", pagina: 4, trecho: "constituída há pelo menos 12 meses", perfil: "Aberta em mar/2025" },
      { id: "r5", texto: "Equipe com formação em tecnologia", eliminatorio: false, marcacao: "verificar", pagina: null, trecho: null, perfil: "Sem página citada na leitura" },
    ],
  },
  {
    id: "ed-2",
    orgao: "Agência de Desenvolvimento (exemplo)",
    numero: "Chamada 03/2026 (fictícia)",
    objeto: "Digitalização de pequenos negócios do interior",
    valor: 25000,
    publico: "Empresas de tecnologia que atendam municípios do interior",
    regiao: "Noroeste do ES",
    prazo: d(6),
    situacao: "em_analise",
    origem: "link",
    cronograma: [{ etapa: "Inscrições", data: d(6) }, { etapa: "Resultado", data: d(30) }],
    documentos: ["Cartão CNPJ", "Portfólio", "Proposta técnica"],
    criterios: [{ nome: "Proposta técnica", peso: 50 }, { nome: "Preço", peso: 30 }, { nome: "Experiência", peso: 20 }],
    vedacoes: ["Consórcios"],
    contrapartidas: [],
    duvidas: ["Aceita atestado de cliente privado?"],
    requisitos: [
      { id: "r1", texto: "Atestado de capacidade técnica", eliminatorio: true, marcacao: "verificar", pagina: 5, trecho: "ao menos um atestado de capacidade técnica", perfil: "Pedir atestado à Padaria São José" },
      { id: "r2", texto: "Atuação no interior", eliminatorio: false, marcacao: "atende", pagina: 2, trecho: "municípios com até 50 mil habitantes", perfil: "Marilândia e Colatina" },
    ],
  },
  {
    id: "ed-3",
    orgao: "Programa Nacional de Inovação (exemplo)",
    numero: "Edital 41/2026 (fictício)",
    objeto: "Subvenção para empresas com faturamento acima de R$ 4,8 milhões",
    valor: 400000,
    publico: "Empresas de médio porte",
    regiao: "Nacional",
    prazo: d(25),
    situacao: "descartado",
    origem: "radar",
    cronograma: [{ etapa: "Inscrições", data: d(25) }],
    documentos: ["Balanço auditado"],
    criterios: [{ nome: "Mérito", peso: 100 }],
    vedacoes: ["MEI"],
    contrapartidas: ["20% de contrapartida financeira"],
    duvidas: [],
    requisitos: [
      { id: "r1", texto: "Faturamento anual acima de R$ 4,8 milhões", eliminatorio: true, marcacao: "nao_atende", pagina: 2, trecho: "receita bruta anual superior a R$ 4,8 milhões", perfil: "MEI" },
    ],
  },
  {
    id: "ed-4",
    orgao: "Prefeitura Municipal (exemplo)",
    numero: "Chamamento 07/2026 (fictício)",
    objeto: "Soluções digitais para o atendimento ao cidadão",
    valor: 18000,
    publico: "Empresas locais",
    regiao: "Marilândia",
    prazo: d(-10),
    situacao: "enviado",
    origem: "pdf",
    cronograma: [{ etapa: "Resultado", data: d(12) }],
    documentos: ["Proposta", "Certidões"],
    criterios: [{ nome: "Menor preço", peso: 100 }],
    vedacoes: [],
    contrapartidas: [],
    duvidas: [],
    requisitos: [
      { id: "r1", texto: "Empresa sediada no município", eliminatorio: true, marcacao: "atende", pagina: 1, trecho: "sediadas no Município", perfil: "Sim" },
    ],
  },
];

export const PERFIL_GTM = {
  tipo: "MEI — Desenvolvimento de programas de computador sob encomenda",
  abertura: MEI.abertura,
  municipio: "Marilândia, ES",
  socios: ["Gabriel — Tecnologia", "Thalis — Comercial", "Mateus — Financeiro"],
  certidoes: [
    { nome: "Certidão negativa federal", validade: d(64) },
    { nome: "Certidão FGTS", validade: d(9) },
    { nome: "Certidão estadual", validade: d(120) },
    { nome: "Certidão municipal", validade: d(-2) },
  ],
};

// ---------- Projetos, contratos, produtos ----------
export type Projeto = { id: string; nome: string; cliente: string; situacao: "planejado" | "em_andamento" | "em_teste" | "entregue" | "pausado"; donoId: string; prazo: string; repositorio: string; tarefas: { feitas: number; total: number } };
export const PROJETOS: Projeto[] = [
  { id: "p1", nome: "Agente de agendamento", cliente: "Clínica Bem Estar (exemplo)", situacao: "em_andamento", donoId: "s-gabriel", prazo: d(4), repositorio: "github.com/exemplo/agendamento", tarefas: { feitas: 7, total: 11 } },
  { id: "p2", nome: "Catálogo no WhatsApp", cliente: "Loja Estilo Vivo (exemplo)", situacao: "em_teste", donoId: "s-gabriel", prazo: d(1), repositorio: "github.com/exemplo/catalogo", tarefas: { feitas: 9, total: 10 } },
  { id: "p3", nome: "Atendente + estoque", cliente: "Farmácia Vida Plena (exemplo)", situacao: "planejado", donoId: "s-mateus", prazo: d(21), repositorio: "", tarefas: { feitas: 0, total: 14 } },
  { id: "p4", nome: "Atendente WhatsApp", cliente: "Padaria São José (exemplo)", situacao: "entregue", donoId: "s-thalis", prazo: d(-58), repositorio: "github.com/exemplo/padaria", tarefas: { feitas: 8, total: 8 } },
  { id: "p5", nome: "Respostas automáticas v2", cliente: "Auto Peças Central (exemplo)", situacao: "pausado", donoId: "s-mateus", prazo: d(-3), repositorio: "github.com/exemplo/autopecas", tarefas: { feitas: 3, total: 6 } },
];

export type Contrato = { id: string; cliente: string; produto: string; inicio: string; fim: string; valorMensal: number; assinado: boolean };
export const CONTRATOS: Contrato[] = [
  { id: "c1", cliente: "Padaria São José (exemplo)", produto: "Atendente WhatsApp", inicio: d(-340), fim: d(25), valorMensal: 290, assinado: true },
  { id: "c2", cliente: "Auto Peças Central (exemplo)", produto: "Atendente WhatsApp + Estoque", inicio: d(-95), fim: d(270), valorMensal: 340, assinado: true },
  { id: "c3", cliente: "Clínica Bem Estar (exemplo)", produto: "Agente de agendamento", inicio: d(-6), fim: d(359), valorMensal: 490, assinado: true },
  { id: "c4", cliente: "Farmácia Vida Plena (exemplo)", produto: "Atendente WhatsApp + Estoque", inicio: d(3), fim: d(368), valorMensal: 450, assinado: false },
];

export type Produto = { id: string; nome: string; descricao: string; implantacao: number; mensalidade: number; clientesAtivos: number };
export const PRODUTOS: Produto[] = [
  { id: "pr1", nome: "Atendente WhatsApp", descricao: "Responde dúvidas, horários e pedidos 24h com IA", implantacao: 1900, mensalidade: 290, clientesAtivos: 1 },
  { id: "pr2", nome: "Atendente + Estoque", descricao: "Atendente integrado ao estoque e ao caixa", implantacao: 2600, mensalidade: 390, clientesAtivos: 2 },
  { id: "pr3", nome: "Agente de agendamento", descricao: "Agenda, confirma e remarca consultas sozinho", implantacao: 3500, mensalidade: 490, clientesAtivos: 2 },
  { id: "pr4", nome: "Catálogo inteligente", descricao: "Catálogo no WhatsApp com busca por foto e preço", implantacao: 2200, mensalidade: 320, clientesAtivos: 1 },
];

// ---------- Agenda ----------
export type Evento = { id: string; titulo: string; data: string; inicio: string; fim: string; socioId: string; tipo: "visita" | "proximo_passo" | "edital" | "reuniao" };
export const EVENTOS: Evento[] = [
  { id: "ev1", titulo: "Visita — Clínica Sorriso Leve", data: d(0), inicio: "14:00", fim: "15:30", socioId: "s-thalis", tipo: "visita" },
  { id: "ev2", titulo: "Reunião semanal dos sócios", data: d(0), inicio: "08:00", fim: "09:00", socioId: "s-gabriel", tipo: "reuniao" },
  { id: "ev3", titulo: "Entrega catálogo — Estilo Vivo", data: d(1), inicio: "10:00", fim: "11:00", socioId: "s-gabriel", tipo: "proximo_passo" },
  { id: "ev4", titulo: "Assinar contrato — Farmácia", data: d(1), inicio: "16:00", fim: "16:45", socioId: "s-mateus", tipo: "proximo_passo" },
  { id: "ev5", titulo: "Proposta — Academia Movimento", data: d(2), inicio: "09:30", fim: "10:30", socioId: "s-thalis", tipo: "proximo_passo" },
  { id: "ev6", titulo: "Levantamento — Mercadinho", data: d(2), inicio: "15:00", fim: "17:00", socioId: "s-gabriel", tipo: "visita" },
  { id: "ev7", titulo: "Prazo — Chamada 03/2026", data: d(6), inicio: "18:00", fim: "18:30", socioId: "s-mateus", tipo: "edital" },
  { id: "ev8", titulo: "Revisão — Padaria São José", data: d(6), inicio: "11:00", fim: "11:45", socioId: "s-thalis", tipo: "proximo_passo" },
  { id: "ev9", titulo: "Prazo — Edital 14/2026", data: d(18), inicio: "18:00", fim: "18:30", socioId: "s-mateus", tipo: "edital" },
  { id: "ev10", titulo: "Ajustes — Auto Peças", data: d(9), inicio: "14:00", fim: "15:00", socioId: "s-mateus", tipo: "proximo_passo" },
  { id: "ev11", titulo: "Agente de agendamento — entrega", data: d(4), inicio: "10:00", fim: "11:30", socioId: "s-gabriel", tipo: "proximo_passo" },
];

// ---------- Automação ----------
export type Aprovacao = { id: string; agente: string; titulo: string; conteudo: string; contexto: string; criadaEm: string };
export const APROVACOES: Aprovacao[] = [
  { id: "a1", agente: "Agente de follow-up", titulo: "Mensagem de retorno — Restaurante Sabor da Serra", contexto: "Proposta enviada há 8 dias sem resposta", conteudo: "Olá! Tudo bem? Passando para saber se conseguiu olhar a proposta do atendente no WhatsApp. Posso tirar alguma dúvida ou ajustar algo?", criadaEm: ts(0, "08:30") },
  { id: "a2", agente: "Agente financeiro", titulo: "Lembrete de pagamento — Auto Peças Central", contexto: "Mensalidade vencida há 3 dias", conteudo: "Oi! Lembrando que a mensalidade de R$ 340,00 venceu. Segue a chave Pix para facilitar. Qualquer coisa, estamos à disposição.", criadaEm: ts(0, "07:05") },
  { id: "a3", agente: "Radar de editais", titulo: "Incluir na triagem — Chamada de inovação municipal", contexto: "Novo edital encontrado na página monitorada", conteudo: "Edital de R$ 30.000 para soluções digitais em municípios do noroeste do ES. Prazo em 22 dias.", criadaEm: ts(-1, "06:00") },
];

export type Agente = { id: string; nome: string; situacao: "ativo" | "pausado" | "erro"; gatilho: string; ultimaExecucao: string; custoMes: number; teto: number };
export const AGENTES: Agente[] = [
  { id: "ag1", nome: "Agente de follow-up", situacao: "ativo", gatilho: "Diário, 08:00", ultimaExecucao: ts(0, "08:00"), custoMes: 18.4, teto: 40 },
  { id: "ag2", nome: "Agente financeiro", situacao: "ativo", gatilho: "Pix recebido + diário 07:00", ultimaExecucao: ts(0, "07:00"), custoMes: 9.7, teto: 30 },
  { id: "ag3", nome: "Radar de editais", situacao: "ativo", gatilho: "Semanal, segunda 06:00", ultimaExecucao: ts(-2, "06:00"), custoMes: 31.2, teto: 35 },
  { id: "ag4", nome: "Leitor de editais", situacao: "pausado", gatilho: "Novo PDF na triagem", ultimaExecucao: ts(-6, "13:20"), custoMes: 12.1, teto: 60 },
  { id: "ag5", nome: "Resumo de diagnóstico", situacao: "erro", gatilho: "Diagnóstico concluído", ultimaExecucao: ts(-1, "15:02"), custoMes: 4.3, teto: 25 },
];

// ---------- Análise ----------
export const ANALISE = {
  conversao: [
    { etapa: "Lead", total: 48 },
    { etapa: "Visita", total: 31 },
    { etapa: "Proposta", total: 19 },
    { etapa: "Fechado", total: 9 },
  ],
  tempoMedio: [
    { etapa: "Lead", dias: 5 },
    { etapa: "Visita", dias: 7 },
    { etapa: "Proposta", dias: 11 },
    { etapa: "Fechado", dias: 4 },
    { etapa: "Em desenv.", dias: 18 },
  ],
  origem: [
    { origem: "Indicação", total: 17 },
    { origem: "Instagram", total: 12 },
    { origem: "Visita espontânea", total: 8 },
    { origem: "Evento", total: 6 },
    { origem: "Google", total: 5 },
  ],
  segmento: [
    { segmento: "Clínica", total: 11 },
    { segmento: "Padaria", total: 9 },
    { segmento: "Mercado", total: 8 },
    { segmento: "Restaurante", total: 7 },
    { segmento: "Oficina", total: 7 },
    { segmento: "Outros", total: 6 },
  ],
  motivosPerda: [
    { motivo: "Preço acima do orçamento", total: 6 },
    { motivo: "Sem urgência agora", total: 5 },
    { motivo: "Sem resposta após proposta", total: 4 },
    { motivo: "Escolheu concorrente", total: 2 },
    { motivo: "Decisor não aprovou", total: 2 },
  ],
  calibracao: [
    { faixa: "0–44 (Frio)", leads: 14, fecharam: 1 },
    { faixa: "45–69 (Morno)", leads: 18, fecharam: 3 },
    { faixa: "70–100 (Quente)", leads: 16, fecharam: 5 },
  ],
};
