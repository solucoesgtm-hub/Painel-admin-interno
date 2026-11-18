// Painel das conexões externas: o que está ligado, o que falta configurar e um teste para cada uma.
// Nunca devolve valores de variáveis, só os NOMES das que faltam.
import "server-only";
import { hojeISO, somarDias } from "../formato";
import { iaConfigurada, modeloIa, modeloRapido, verificarIa } from "../ia/claude";
import { configuracaoBancaria, provedorBancario } from "./banco";
import { lerVariaveis, mensagemDeErro, type Teste } from "./comum";
import { provedorEmail, VARIAVEIS_GMAIL } from "./gmail";
import { provedorWhatsApp, VARIAVEIS_WHATSAPP } from "./whatsapp";

export const IDS_CONEXAO = ["neon", "claude", "gmail", "banco", "whatsapp", "agenda", "push"] as const;
export type IdConexao = (typeof IDS_CONEXAO)[number];

export type EstadoConexao = {
  id: IdConexao;
  nome: string;
  para: string;
  /** ligada: tudo configurado · incompleta: parte configurada · demonstracao: nada configurado */
  situacao: "ligada" | "incompleta" | "demonstracao";
  faltando: string[];
  detalhe?: string;
};

function situacao(total: number, faltando: string[]): EstadoConexao["situacao"] {
  if (faltando.length === 0) return "ligada";
  return faltando.length < total ? "incompleta" : "demonstracao";
}

export function estadoConexoes(): EstadoConexao[] {
  const neon = lerVariaveis(["DATABASE_URL", "AUTH_SECRET"] as const).faltando;
  const claude = lerVariaveis(["ANTHROPIC_API_KEY"] as const).faltando;
  const gmail = lerVariaveis(VARIAVEIS_GMAIL).faltando;
  const banco = configuracaoBancaria();
  const whats = lerVariaveis(VARIAVEIS_WHATSAPP).faltando;
  const agenda = lerVariaveis(["GOOGLE_AGENDA_ID", "GOOGLE_AGENDA_CREDENCIAIS"] as const).faltando;
  const push = lerVariaveis(["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_CONTATO"] as const).faltando;

  return [
    { id: "neon", nome: "Banco de dados e login", para: "Guardar leads, diagnósticos, histórico e as senhas dos sócios.", situacao: situacao(2, neon), faltando: neon },
    {
      id: "claude",
      nome: "IA (Claude)",
      para: "Somente o relatório do diagnóstico e o escopo dos contratos, dentro do teto do mês e dos créditos.",
      situacao: situacao(1, claude),
      faltando: claude,
      detalhe: iaConfigurada() ? `Diagnóstico: ${modeloIa()} · contrato: ${modeloRapido()}` : "Sem a chave, o diagnóstico usa um exemplo e o contrato o escopo padrão, sem custo.",
    },
    { id: "gmail", nome: "Gmail", para: "Ler a caixa de entrada, separar por regras simples e criar rascunhos de resposta (nunca envia sozinho).", situacao: situacao(3, gmail), faltando: gmail },
    {
      id: "banco",
      nome: "Banco Inter",
      para: "Saldo e extrato, somente leitura, para conciliar as mensalidades.",
      situacao: banco.escolhido === "demo" ? "demonstracao" : situacao(4, banco.faltando),
      faltando: banco.escolhido === "demo" ? ["PROVEDOR_BANCARIO=inter", ...lerVariaveis(["INTER_CLIENT_ID", "INTER_CLIENT_SECRET", "INTER_CERTIFICADO", "INTER_CHAVE"] as const).faltando] : banco.faltando,
    },
    { id: "whatsapp", nome: "WhatsApp (Meta)", para: "Enviar e receber mensagens de leads e clientes, sempre com aprovação de um sócio.", situacao: situacao(4, whats), faltando: whats },
    { id: "agenda", nome: "Google Agenda", para: "Ler e criar eventos na agenda da GTM.", situacao: situacao(2, agenda), faltando: agenda },
    { id: "push", nome: "Notificações", para: "Avisar no celular quando chega mensagem no chat dos sócios.", situacao: situacao(3, push), faltando: push },
  ];
}

export async function testarConexao(id: IdConexao): Promise<Teste> {
  try {
    switch (id) {
      case "neon": {
        if (!process.env.DATABASE_URL) return { ok: false, detalhe: "DATABASE_URL não definida: o painel está em demonstração." };
        const [{ db }, { sql }] = await Promise.all([import("@/db"), import("drizzle-orm")]);
        await db.execute(sql`select 1`);
        return { ok: true, detalhe: "Banco respondeu normalmente." };
      }
      case "claude":
        return await verificarIa();
      case "gmail":
        return await provedorEmail().testar();
      case "banco":
        return await provedorBancario().testar();
      case "whatsapp":
        return await provedorWhatsApp().testar();
      case "agenda": {
        const g = await import("../google-agenda");
        if (!g.googleAgendaLigado()) return { ok: false, detalhe: "Google Agenda não configurado." };
        const hoje = hojeISO();
        const eventos = await g.listarEventosGoogle(hoje, somarDias(hoje, 7));
        return { ok: true, detalhe: `Agenda lida: ${eventos.length} evento(s) nos próximos 7 dias.` };
      }
      case "push":
        return lerVariaveis(["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_CONTATO"] as const).valores
          ? { ok: true, detalhe: "Chaves presentes. O teste real é ativar as notificações no menu da conta." }
          : { ok: false, detalhe: "Faltam chaves VAPID." };
    }
  } catch (e) {
    return { ok: false, detalhe: mensagemDeErro(e, "Falha no teste.") };
  }
}
