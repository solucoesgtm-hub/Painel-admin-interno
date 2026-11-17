// Exemplo fictício usado no modo demonstração (sem ANTHROPIC_API_KEY e sem banco).
// Não chama a API e não tem dado real: só mostra o formato do relatório, do plano e do código.
import type { CodigoIA, ConteudoPlanoIA } from "../regras/ia";

type Base = { nome: string; segmento: string; pontuacao: number; veredito: string };

export function exemploRelatorioPlano(l: Base): Omit<ConteudoPlanoIA, "codigo"> {
  const seg = l.segmento || "comércio local";
  return {
    relatorio: {
      resumo: `${l.nome} é um ${seg.toLowerCase()} de pequeno porte que atende quase tudo pelo WhatsApp e controla agenda e pedidos em caderno. A maior dor é responder clientes fora do horário e esquecer retornos. A GTM pode entregar um atendente automático no WhatsApp com agenda integrada. (Exemplo fictício da demonstração.)`,
      vereditoExplicado: `Pontuação ${l.pontuacao}/100, veredito ${l.veredito}. A dor e a urgência pesam a favor; o orçamento ainda não foi confirmado e o decisor participou só de parte da conversa.`,
      pontosFortes: ["Dor clara e citada várias vezes", "Dono aberto a testar", "Volume de mensagens alto justifica a automação"],
      riscos: [
        { risco: "Orçamento não confirmado", mitigacao: "Mostrar o protótipo com a economia por mês calculada antes de falar de preço." },
        { risco: "Dados da agenda no caderno", mitigacao: "Começar com cadastro manual dos horários na primeira semana." },
        { risco: "Dependência da API do WhatsApp", mitigacao: "Usar a API oficial (Cloud API) e um número dedicado." },
      ],
      premissas: ["Cerca de 40 mensagens por dia", "Um único atendente no balcão"],
      proximosPassos: ["Marcar 30 minutos com o dono para mostrar o protótipo", "Pedir a lista de serviços e horários", "Enviar proposta com implantação e mensalidade"],
    },
    plano: {
      prd: {
        problema: "Mensagens sem resposta fora do horário e retornos esquecidos.",
        objetivo: "Responder perguntas comuns e marcar horários sozinho pelo WhatsApp.",
        publico: "Dono e atendente do balcão; clientes do comércio pelo WhatsApp.",
        escopo: ["Respostas automáticas para dúvidas frequentes", "Marcação de horário com confirmação", "Painel com a agenda do dia"],
        foraDoEscopo: ["Pagamento online", "Emissão de nota fiscal", "Aplicativo próprio"],
        metricasSucesso: ["Tempo de primeira resposta abaixo de 1 minuto", "5 horas por semana economizadas no balcão"],
      },
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

export function exemploCodigo(): CodigoIA {
  return {
    instrucoes: "```bash\nnpx create-next-app@latest prototipo --ts --tailwind --app\ncd prototipo\nnpm install drizzle-orm @neondatabase/serverless zod\nnpm install -D drizzle-kit\n```\n\nCopie `.env.example` para `.env.local`, preencha e rode `npm run dev`.",
    arquivos: [
      {
        caminho: "src/db/schema.ts",
        linguagem: "ts",
        descricao: "Tabelas de serviços e horários.",
        conteudo: `import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const servicos = pgTable("servicos", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  duracaoMin: integer("duracao_min").notNull(),
  precoCentavos: integer("preco_centavos").notNull().default(0),
});

export const horarios = pgTable("horarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  servicoId: uuid("servico_id").notNull().references(() => servicos.id),
  situacao: text("situacao").notNull().default("marcado"),
});
`,
      },
      {
        caminho: "src/app/api/whatsapp/route.ts",
        linguagem: "ts",
        descricao: "Webhook do WhatsApp (stub com TODO).",
        conteudo: `import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(url.searchParams.get("hub.challenge") ?? "");
  }
  return new Response("Proibido", { status: 403 });
}

export async function POST(req: Request) {
  const corpo = await req.json();
  // TODO: extrair a mensagem, perguntar à IA e responder pela Cloud API.
  console.log("mensagem recebida", JSON.stringify(corpo).slice(0, 200));
  return NextResponse.json({ ok: true });
}
`,
      },
      {
        caminho: ".env.example",
        linguagem: "bash",
        descricao: "Variáveis sem valores.",
        conteudo: "DATABASE_URL=\nWHATSAPP_VERIFY_TOKEN=\nWHATSAPP_TOKEN=\nANTHROPIC_API_KEY=\n",
      },
    ],
  };
}
