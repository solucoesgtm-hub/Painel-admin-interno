// Exemplo montado pelo próprio sistema quando a ANTHROPIC_API_KEY ainda não foi cadastrada.
// Não chama a API e não tem custo: usa as respostas do diagnóstico do lead (quando existem)
// para mostrar o formato completo do relatório e do plano. Com a chave, a IA escreve o texto de verdade.
import { brl } from "../formato";
import { economia, FATORES, type Fator } from "../regras/pontuacao";
import type { ConteudoPlanoIA } from "../regras/ia";

type Base = { nome: string; segmento: string; pontuacao: number; veredito: string; respostas?: Record<string, unknown> };
type Respostas = {
  negocio?: { porte?: string; tempo?: string; atendimento?: string[] };
  ferramentas?: string[];
  reclamacoes?: string[];
  tarefas?: { nome: string; peso: number }[];
  numeros?: { atendimentosDia?: string; horasSemana?: string; custoHora?: string };
  notas?: Partial<Record<Fator, number>>;
};

const juntar = (v: string[] | undefined, padrao: string) => (v?.length ? v.join(", ") : padrao);

export function exemploRelatorioPlano(l: Base): ConteudoPlanoIA {
  const seg = (l.segmento || "comércio local").toLowerCase();
  const r = (l.respostas ?? {}) as Respostas;
  const horas = Number(r.numeros?.horasSemana) || 5;
  const custoHora = Number(r.numeros?.custoHora) || 25;
  const eco = economia(horas, custoHora);
  const tarefas = [...(r.tarefas ?? [])].sort((a, b) => b.peso - a.peso);
  const reclamacoes = r.reclamacoes?.length ? r.reclamacoes : ["Demora para responder", "Esquece retornos"];
  const notas = FATORES.filter((f) => r.notas?.[f.id] !== undefined).map((f) => `${f.nome} ${r.notas![f.id]}/5`);
  const fortes = FATORES.filter((f) => (r.notas?.[f.id] ?? 0) >= 4).map((f) => `${f.nome}: nota alta no diagnóstico`);
  const fracos = FATORES.filter((f) => r.notas?.[f.id] !== undefined && r.notas[f.id]! <= 2);

  return {
    relatorio: {
      resumoExecutivo: `${l.nome} atua no segmento ${seg}${r.negocio?.porte ? ` (equipe: ${r.negocio.porte.toLowerCase()})` : ""}, atende por ${juntar(r.negocio?.atendimento, "balcão e WhatsApp")} e usa ${juntar(r.ferramentas, "WhatsApp e caderno")} no dia a dia. As principais reclamações são: ${reclamacoes.join(", ").toLowerCase()}.\n\nA proposta é automatizar o atendimento e as tarefas manuais de maior peso, com um painel simples para a equipe. (Exemplo montado pelo sistema: a IA ainda não está conectada.)`,
      vereditoExplicado: `Pontuação ${l.pontuacao}/100, veredito ${l.veredito}.${notas.length ? ` Notas do diagnóstico: ${notas.join(", ")}.` : ""}${fracos.length ? ` Pontos de atenção: ${fracos.map((f) => f.nome.toLowerCase()).join(", ")}.` : ""}`,
      diagnosticoAtual: {
        contexto: `${r.negocio?.tempo ? `Tempo de mercado: ${r.negocio.tempo.toLowerCase()}. ` : ""}Atendimento por ${juntar(r.negocio?.atendimento, "balcão e WhatsApp")} e ferramentas atuais: ${juntar(r.ferramentas, "WhatsApp e caderno")}.`,
        processosAtuais: tarefas.length
          ? tarefas.map((t) => `${t.nome} (feito à mão, peso ${t.peso} de 3)`)
          : ["Cliente manda mensagem no WhatsApp", "Atendente responde quando tem tempo", "Pedidos e horários anotados no caderno"],
        gargalos: reclamacoes.map((x) => ({ problema: x, impacto: "Tempo perdido da equipe e risco de perder clientes." })),
      },
      oportunidade: {
        solucaoProposta: `Atendimento automático no WhatsApp e automação de ${tarefas.length ? tarefas.slice(0, 2).map((t) => t.nome.toLowerCase()).join(" e ") : "agendamentos e retornos"}, com painel para a equipe.`,
        beneficios: ["Resposta ao cliente em menos de 1 minuto", "Tarefas manuais reduzidas", "Informação organizada em um só lugar"],
        economiaEstimada: `${horas.toLocaleString("pt-BR")} horas por semana × ${brl(custoHora)} por hora ≈ ${brl(eco.mensal)} por mês (${brl(eco.anual)} por ano).`,
      },
      pontosFortes: fortes.length ? fortes : ["Dor clara e citada várias vezes", "Dono aberto a testar"],
      riscos: [
        { risco: "Orçamento não confirmado", probabilidade: (r.notas?.orcamento ?? 3) <= 2 ? "alta" : "media", impacto: "alta", mitigacao: "Mostrar o protótipo com a economia calculada antes de falar de preço." },
        { risco: "Informação atual em papel ou planilha", probabilidade: "alta", impacto: "media", mitigacao: "Cadastrar os dados manualmente na primeira semana." },
        { risco: "Dependência da API do WhatsApp", probabilidade: "baixa", impacto: "alta", mitigacao: "Usar a API oficial (Cloud API) e um número dedicado." },
      ],
      premissas: [
        ...(r.numeros?.horasSemana ? [] : ["Horas em tarefas manuais não informadas: considerado 5 por semana"]),
        ...(r.numeros?.custoHora ? [] : ["Custo da hora não informado: considerado R$ 25"]),
        "Um único atendente no balcão",
      ],
      recomendacao: l.veredito === "frio" ? "Não seguir agora: manter contato e rever em 60 dias." : "Seguir com ressalvas: confirmar o orçamento na demonstração do protótipo.",
      proximosPassos: ["Marcar 30 minutos com o dono para mostrar o protótipo", "Pedir a lista de serviços, preços e horários", "Enviar proposta com implantação e mensalidade"],
    },
    plano: {
      prd: {
        problema: reclamacoes.join("; ") + ".",
        objetivo: "Responder dúvidas comuns e marcar horários sozinho pelo WhatsApp.",
        publico: "Dono e atendente do balcão; clientes do comércio pelo WhatsApp.",
        escopo: ["Respostas automáticas para dúvidas frequentes", "Marcação de horário com confirmação", "Painel com a agenda do dia"],
        foraDoEscopo: ["Pagamento online", "Emissão de nota fiscal", "Aplicativo próprio"],
        metricasSucesso: ["Primeira resposta em menos de 1 minuto", "5 horas por semana economizadas no balcão"],
      },
      requisitos: {
        funcionais: [
          { codigo: "RF01", descricao: "Responder perguntas frequentes pelo WhatsApp", prioridade: "essencial" },
          { codigo: "RF02", descricao: "Marcar horário livre e confirmar ao cliente", prioridade: "essencial" },
          { codigo: "RF03", descricao: "Enviar lembrete na véspera", prioridade: "desejavel" },
        ],
        naoFuncionais: ["Painel utilizável no celular", "Resposta em até 10 segundos", "Dados hospedados no Brasil ou em provedor com cláusulas da LGPD"],
      },
      fluxos: [
        { nome: "Marcação de horário", ator: "Cliente", gatilho: "Mensagem pedindo horário", passos: ["Assistente identifica serviço e dia", "Sistema consulta horários livres", "Assistente oferece até 3 opções", "Cliente escolhe", "Horário é gravado e confirmado"], resultado: "Horário marcado na agenda do dia" },
        { nome: "Horário ocupado", ator: "Cliente", gatilho: "Escolha de horário que acabou de ser ocupado", passos: ["Sistema detecta conflito", "Assistente oferece o próximo horário livre"], resultado: "Sem marcação duplicada" },
      ],
      regrasNegocio: [
        { codigo: "RN01", regra: "Um horário só pode ter uma marcação ativa.", motivo: "Evitar atendimento duplo." },
        { codigo: "RN02", regra: "Cancelamento até 2 horas antes libera o horário.", motivo: "Reaproveitar a agenda." },
      ],
      normas: [
        { norma: "LGPD", aplicacao: "Guardar só o primeiro nome e o telefone para a marcação, com aviso de privacidade na primeira mensagem." },
        { norma: "Política comercial do WhatsApp Business", aplicacao: "Mensagens iniciadas pela empresa só com modelos aprovados." },
      ],
      arquitetura: {
        visaoGeral: "Aplicação Next.js na Vercel recebe o webhook do WhatsApp, consulta a agenda no Postgres (Neon) e responde com ajuda da API do Claude chamada só pelo servidor.",
        stack: [
          { camada: "Interface", tecnologia: "Next.js + Tailwind", motivo: "Stack que a GTM já domina; funciona bem no celular." },
          { camada: "Dados", tecnologia: "Neon (Postgres) + Drizzle", motivo: "Banco gerenciado, plano gratuito para o protótipo." },
          { camada: "Mensagens", tecnologia: "WhatsApp Cloud API", motivo: "Integração oficial, sem risco de bloqueio do número." },
          { camada: "IA", tecnologia: "API do Claude", motivo: "Entende perguntas livres e extrai data e horário." },
        ],
        integracoes: ["WhatsApp Cloud API (webhook de mensagens)", "API do Claude"],
      },
      modeloDados: [
        { entidade: "servicos", campos: ["id: uuid — chave", "nome: text — nome do serviço", "duracaoMin: integer — tempo do atendimento", "precoCentavos: integer — preço"], observacao: "" },
        { entidade: "horarios", campos: ["id: uuid — chave", "inicio: timestamptz — começo", "servicoId: uuid — serviço", "situacao: text — livre, marcado ou cancelado"], observacao: "Sem dados pessoais além do primeiro nome informado pelo cliente." },
      ],
      telas: [
        { nome: "Agenda do dia", objetivo: "Ver e confirmar os horários marcados.", elementos: ["Lista por hora", "Etiqueta de situação", "Botão confirmar"] },
        { nome: "Serviços", objetivo: "Cadastrar serviços e duração.", elementos: ["Tabela", "Formulário com validação"] },
      ],
      metodologia: {
        abordagem: "Entregas curtas com validação do dono ao fim de cada fase.",
        fases: [
          { nome: "Preparação", objetivo: "Levantar serviços, horários e textos de resposta.", entregaveis: ["Lista de serviços", "Perguntas frequentes"], duracaoDias: 2 },
          { nome: "Construção", objetivo: "Montar agenda, webhook e assistente.", entregaveis: ["Protótipo em ambiente de teste"], duracaoDias: 6 },
          { nome: "Validação", objetivo: "Testar com mensagens reais do dono.", entregaveis: ["Ajustes", "Roteiro de uso"], duracaoDias: 2 },
        ],
        criteriosAceite: ["Marca um horário de ponta a ponta pelo WhatsApp", "Agenda do dia mostra a marcação em até 1 minuto"],
      },
      passos: [
        { ordem: 1, titulo: "Criar projeto e banco", descricao: "Next.js, Drizzle, migração inicial no Neon.", estimativaHoras: 3 },
        { ordem: 2, titulo: "Cadastro de serviços", descricao: "Tela e server action com Zod.", estimativaHoras: 4 },
        { ordem: 3, titulo: "Webhook do WhatsApp", descricao: "Receber e responder mensagens em ambiente de teste.", estimativaHoras: 6 },
        { ordem: 4, titulo: "Marcação com IA", descricao: "Extrair data e serviço e gravar o horário.", estimativaHoras: 8 },
        { ordem: 5, titulo: "Agenda do dia", descricao: "Tela de acompanhamento para o balcão.", estimativaHoras: 4 },
      ],
    },
  };
}
