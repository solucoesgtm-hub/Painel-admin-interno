// Provedor bancário (somente leitura: saldo e extrato). Demonstração ou Banco Inter Empresas.
// Nada de pagamento ou transferência: a especificação proíbe (docs/PROMPT-GTM-HUB.md, 4.8).
//
// Variáveis (só no servidor):
//   PROVEDOR_BANCARIO     → "demo" (padrão) ou "inter"
//   INTER_CLIENT_ID, INTER_CLIENT_SECRET → da aplicação criada no Internet Banking (Integrações)
//   INTER_CERTIFICADO, INTER_CHAVE       → arquivos .crt e .key da aplicação (PEM ou PEM em base64)
//   INTER_AMBIENTE        → "producao" (padrão) ou "sandbox"
//   INTER_CONTA           → opcional, número da conta quando houver mais de uma
//
// Endereços e formatos conforme a documentação pública do Inter (developers.inter.co) na data
// desta versão. Confira lá antes de ligar em produção: o Inter muda versões de tempos em tempos.
import "server-only";
import { EXTRATO, type Lancamento } from "../demo/dados";
import { lerPem, lerVariaveis, mensagemDeErro, requisicaoMtls, type Teste } from "./comum";

export const VARIAVEIS_INTER = ["INTER_CLIENT_ID", "INTER_CLIENT_SECRET", "INTER_CERTIFICADO", "INTER_CHAVE"] as const;
const ESCOPOS_INTER = "extrato.read";
const BASE = { producao: "https://cdpj.partners.bancointer.com.br", sandbox: "https://cdpj-sandbox.partners.uatinter.co" };

export type Saldo = { disponivel: number; consultadoEm: string };

export interface ProvedorBancario {
  readonly tipo: "inter" | "demo";
  saldo(): Promise<Saldo>;
  /** Lançamentos entre duas datas "AAAA-MM-DD", inclusive. */
  extrato(de: string, ate: string): Promise<Lancamento[]>;
  testar(): Promise<Teste>;
}

/* ---------------- Demonstração ---------------- */
const demo: ProvedorBancario = {
  tipo: "demo",
  async saldo() {
    const total = EXTRATO.reduce((a, l) => a + (l.tipo === "entrada" ? l.valor : -l.valor), 0);
    return { disponivel: 8000 + total, consultadoEm: new Date().toISOString() };
  },
  async extrato(de, ate) {
    return EXTRATO.filter((l) => l.data >= de && l.data <= ate);
  },
  async testar() {
    return { ok: true, detalhe: "Demonstração: saldo e extrato fictícios." };
  },
};

/* ---------------- Banco Inter ---------------- */
type VarsInter = Record<(typeof VARIAVEIS_INTER)[number], string>;
let cacheToken: { token: string; expira: number } | null = null;

function inter(v: VarsInter): ProvedorBancario {
  const base = process.env.INTER_AMBIENTE?.trim() === "sandbox" ? BASE.sandbox : BASE.producao;
  const cert = lerPem(v.INTER_CERTIFICADO);
  const chave = lerPem(v.INTER_CHAVE);
  const conta = process.env.INTER_CONTA?.trim();

  async function token(): Promise<string> {
    if (cacheToken && cacheToken.expira - 60_000 > Date.now()) return cacheToken.token;
    const corpo = new URLSearchParams({
      client_id: v.INTER_CLIENT_ID,
      client_secret: v.INTER_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: ESCOPOS_INTER,
    }).toString();
    const r = await requisicaoMtls(`${base}/oauth/v2/token`, {
      metodo: "POST",
      cabecalhos: { "Content-Type": "application/x-www-form-urlencoded" },
      corpo,
      cert,
      chave,
    });
    if (r.status !== 200) throw new Error(r.status === 401 || r.status === 400 ? "Inter recusou as credenciais ou o certificado." : `Inter: erro ${r.status} ao autenticar.`);
    const j = JSON.parse(r.texto) as { access_token: string; expires_in: number };
    cacheToken = { token: j.access_token, expira: Date.now() + j.expires_in * 1000 };
    return j.access_token;
  }

  async function obter<T>(caminho: string): Promise<T> {
    const r = await requisicaoMtls(`${base}${caminho}`, {
      cabecalhos: { Authorization: `Bearer ${await token()}`, ...(conta ? { "x-conta-corrente": conta } : {}) },
      cert,
      chave,
    });
    if (r.status === 429) throw new Error("Inter: limite de consultas atingido. Tente em um minuto.");
    if (r.status !== 200) throw new Error(`Inter: erro ${r.status}.`);
    return JSON.parse(r.texto) as T;
  }

  return {
    tipo: "inter",
    async saldo() {
      const s = await obter<{ disponivel?: number }>("/banking/v2/saldo");
      return { disponivel: Number(s.disponivel ?? 0), consultadoEm: new Date().toISOString() };
    },
    async extrato(de, ate) {
      type Transacao = { dataEntrada?: string; tipoOperacao?: "C" | "D"; valor?: string | number; titulo?: string; descricao?: string; tipoTransacao?: string };
      const r = await obter<{ transacoes?: Transacao[] }>(`/banking/v2/extrato?dataInicio=${de}&dataFim=${ate}`);
      return (r.transacoes ?? []).map((t, i) => ({
        id: `inter-${t.dataEntrada ?? de}-${i}`,
        data: (t.dataEntrada ?? de).slice(0, 10),
        descricao: [t.titulo, t.descricao].filter(Boolean).join(" — ") || t.tipoTransacao || "Lançamento",
        valor: Math.abs(Number(t.valor ?? 0)),
        tipo: t.tipoOperacao === "D" ? "saida" : "entrada",
        conciliadoCom: null,
      }));
    },
    async testar() {
      try {
        const s = await this.saldo();
        const ambiente = base === BASE.sandbox ? "sandbox" : "produção";
        return { ok: true, detalhe: `Conectado ao Inter (${ambiente}). Saldo lido com sucesso${s.disponivel >= 0 ? "" : " (negativo)"}.` };
      } catch (e) {
        return { ok: false, detalhe: mensagemDeErro(e, "Não foi possível falar com o Inter.") };
      }
    },
  };
}

/** Situação para a tela de conexões. */
export function configuracaoBancaria(): { escolhido: "inter" | "demo"; faltando: string[] } {
  const escolhido = process.env.PROVEDOR_BANCARIO?.trim() === "inter" ? "inter" : "demo";
  return { escolhido, faltando: escolhido === "inter" ? lerVariaveis(VARIAVEIS_INTER).faltando : [] };
}

/** Provedor em uso: o Inter com PROVEDOR_BANCARIO=inter e todas as variáveis; senão, a demonstração. */
export function provedorBancario(): ProvedorBancario {
  if (process.env.PROVEDOR_BANCARIO?.trim() !== "inter") return demo;
  const { valores } = lerVariaveis(VARIAVEIS_INTER);
  if (!valores) return demo;
  try {
    return inter(valores);
  } catch (e) {
    // Certificado ilegível: não derruba as telas, só avisa em cada consulta.
    const erro = mensagemDeErro(e, "Configuração do Inter inválida.");
    const falha = async (): Promise<never> => {
      throw new Error(erro);
    };
    return { tipo: "inter", saldo: falha, extrato: falha, testar: async () => ({ ok: false, detalhe: erro }) };
  }
}
