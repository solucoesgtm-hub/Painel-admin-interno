// Exemplo fictício usado no modo demonstração (sem ANTHROPIC_API_KEY e sem banco).
// Não chama a API e não tem dado real: só mostra o formato do relatório e do plano.
import type { ConteudoPlanoIA } from "../regras/ia";

type Base = { nome: string; segmento: string; pontuacao: number; veredito: string };

export function exemploRelatorioPlano(l: Base): ConteudoPlanoIA {
  const seg = (l.segmento || "comércio local").toLowerCase();
  return {
    relatorio: {
      resumoExecutivo: `${l.nome} é um ${seg} de pequeno porte que concentra o atendimento no WhatsApp e controla agenda e pedidos em caderno. A principal dor é responder clientes fora do horário e esquecer retornos, o que gera perda de vendas.\n\nA proposta é um atendente automático no WhatsApp integrado a uma agenda simples, com painel para o balcão. (Exemplo fictício da demonstração.)`,
      vereditoExplicado: `Pontuação ${l.pontuacao}/100, veredito ${l.veredito}. Dor e urgência têm notas altas; orçamento ainda não foi confirmado e o decisor participou só de parte da conversa.`,
      diagnosticoAtual: {
        contexto: "Negócio com 2 a 5 pessoas, atendimento por balcão e WhatsApp comum, agenda em caderno.",
        processosAtuais: ["Cliente manda mensagem no WhatsApp", "Atendente responde quando tem tempo", "Horário é anotado no caderno", "Confirmação é feita por ligação no dia"],
        gargalos: [
          { problema: "Mensagens sem resposta fora do horário", impacto: "Clientes procuram o concorrente" },
          { problema: "Retornos esquecidos", impacto: "Horários vagos e retrabalho" },
        ],
      },
      oportunidade: {
        solucaoProposta: "Atendimento automático no WhatsApp com marcação de horário e painel da agenda do dia.",
        beneficios: ["Resposta em menos de 1 minuto", "Agenda organizada em um só lugar", "Menos faltas com lembrete automático"],
        economiaEstimada: "5 horas por semana × R$ 25 por hora ≈ R$ 540 por mês.",
      },
      pontosFortes: ["Dor clara e citada várias vezes", "Dono aberto a testar", "Volume de mensagens justifica a automação"],
      riscos: [
        { risco: "Orçamento não confirmado", probabilidade: "media", impacto: "alta", mitigacao: "Mostrar o protótipo com a economia calculada antes de falar de preço." },
        { risco: "Agenda atual em papel", probabilidade: "alta", impacto: "media", mitigacao: "Cadastrar os horários manualmente na primeira semana." },
        { risco: "Dependência da API do WhatsApp", probabilidade: "baixa", impacto: "alta", mitigacao: "Usar a API oficial (Cloud API) e um número dedicado." },
      ],
      premissas: ["Cerca de 40 mensagens por dia", "Um único atendente no balcão"],
      recomendacao: "Seguir com ressalvas: confirmar o orçamento na demonstração do protótipo.",
      proximosPassos: ["Marcar 30 minutos com o dono para mostrar o protótipo", "Pedir a lista de serviços e horários", "Enviar proposta com implantação e mensalidade"],
    },
    plano: {
      prd: {
        problema: "Mensagens sem resposta fora do horário e retornos esquecidos.",
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
