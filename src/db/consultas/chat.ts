// Consultas do chat interno e das tentativas de login.
// O chat não grava no histórico: mensagem é conversa, não alteração de cadastro.
import { and, count, desc, eq, gt, isNull, lt, ne, sql } from "drizzle-orm";
import { db } from "../index";
import { chatLeituras, loginTentativas, mensagens } from "../schema";

/** As últimas `limite` mensagens (da mais antiga para a mais nova). */
export async function listarMensagens(limite = 200) {
  const linhas = await db.select().from(mensagens).orderBy(desc(mensagens.criadoEm)).limit(limite);
  return linhas.reverse();
}

export async function criarMensagem(autorId: string, texto: string) {
  const [m] = await db.insert(mensagens).values({ autorId, texto }).returning();
  return m!;
}

/** Apaga só se for do autor e ainda estiver dentro do prazo. Devolve se apagou. */
export async function apagarMensagem(id: string, autorId: string, desde: Date) {
  const r = await db
    .update(mensagens)
    .set({ texto: "", apagadaEm: new Date() })
    .where(and(eq(mensagens.id, id), eq(mensagens.autorId, autorId), isNull(mensagens.apagadaEm), gt(mensagens.criadoEm, desde)))
    .returning({ id: mensagens.id });
  return r.length > 0;
}

export async function marcarLido(socioId: string) {
  await db
    .insert(chatLeituras)
    .values({ socioId, lidoAte: new Date() })
    .onConflictDoUpdate({ target: chatLeituras.socioId, set: { lidoAte: new Date() } });
}

/** Mensagens de outros sócios, não apagadas, depois da última leitura. */
export async function contarNaoLidas(socioId: string) {
  const [r] = await db
    .select({ n: count() })
    .from(mensagens)
    .where(
      and(
        ne(mensagens.autorId, socioId),
        isNull(mensagens.apagadaEm),
        gt(mensagens.criadoEm, sql`coalesce((select ${chatLeituras.lidoAte} from ${chatLeituras} where ${chatLeituras.socioId} = ${socioId}), 'epoch'::timestamptz)`),
      ),
    );
  return r?.n ?? 0;
}

/* ---------------- Tentativas de login ---------------- */
export async function contarTentativas(chave: string, desde: Date) {
  const [r] = await db
    .select({ n: count() })
    .from(loginTentativas)
    .where(and(eq(loginTentativas.chave, chave), gt(loginTentativas.criadoEm, desde)));
  return r?.n ?? 0;
}

export async function registrarTentativa(chave: string) {
  await db.insert(loginTentativas).values({ chave });
}

/** Login certo zera as tentativas do e-mail; aproveita para limpar as antigas de todos. */
export async function limparTentativas(chave: string, antigasAntesDe: Date) {
  await db.batch([
    db.delete(loginTentativas).where(eq(loginTentativas.chave, chave)),
    db.delete(loginTentativas).where(lt(loginTentativas.criadoEm, antigasAntesDe)),
  ]);
}
