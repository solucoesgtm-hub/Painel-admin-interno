// Peças comuns das conexões externas (Gmail, Inter, WhatsApp…). Só no servidor.
// Padrão de todas: uma interface, uma versão de demonstração e a versão real.
// A real só entra quando TODAS as variáveis dela existem; até lá, o painel segue em demonstração.
import "server-only";
import { request } from "node:https";

export type Teste = { ok: boolean; detalhe: string };

/** Lê variáveis obrigatórias; devolve os valores ou a lista do que falta. */
export function lerVariaveis<const K extends readonly string[]>(nomes: K): { valores: Record<K[number], string> | null; faltando: string[] } {
  const faltando = nomes.filter((n) => !process.env[n]?.trim());
  if (faltando.length) return { valores: null, faltando };
  return { valores: Object.fromEntries(nomes.map((n) => [n, process.env[n]!.trim()])) as Record<K[number], string>, faltando: [] };
}

/**
 * Certificado/chave guardados em variável de ambiente: aceita o PEM em várias linhas,
 * o PEM numa linha só com "\n", ou o arquivo inteiro em base64.
 */
export function lerPem(valor: string): string {
  const v = valor.trim();
  if (v.includes("-----BEGIN")) return v.replace(/\\n/g, "\n");
  const decodificado = Buffer.from(v, "base64").toString("utf8");
  if (decodificado.includes("-----BEGIN")) return decodificado;
  throw new Error("Certificado em formato inesperado: use o PEM ou o PEM em base64.");
}

/** Requisição HTTPS com certificado de cliente (mTLS), sem dependência nova. */
export function requisicaoMtls(
  url: string,
  opcoes: { metodo?: string; cabecalhos?: Record<string, string>; corpo?: string; cert: string; chave: string; tempoMs?: number },
): Promise<{ status: number; texto: string }> {
  return new Promise((resolve, reject) => {
    const req = request(
      url,
      {
        method: opcoes.metodo ?? "GET",
        headers: { ...(opcoes.corpo ? { "Content-Length": Buffer.byteLength(opcoes.corpo).toString() } : {}), ...opcoes.cabecalhos },
        cert: opcoes.cert,
        key: opcoes.chave,
        timeout: opcoes.tempoMs ?? 20_000,
      },
      (res) => {
        const partes: Buffer[] = [];
        res.on("data", (c: Buffer) => partes.push(c));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, texto: Buffer.concat(partes).toString("utf8") }));
      },
    );
    req.on("timeout", () => req.destroy(new Error("O banco demorou demais para responder.")));
    req.on("error", reject);
    if (opcoes.corpo) req.write(opcoes.corpo);
    req.end();
  });
}

export const mensagemDeErro = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);
