// Consultas do chat interno e das tentativas de login.
// O chat não grava no histórico: mensagem é conversa, não alteração de cadastro.
import { and, asc, count, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from "drizzle-orm";
import { db } from "../index";
import { chatLeituras, loginTentativas, mensagens, pushInscricoes } from "../schema";

/** As últimas `limite` mensagens (da mais antiga para a mais nova). */
export async function listarMensagens(limite = 200) {
  const linhas = await db.select().from(mensagens).orderBy(desc(mensagens.criadoEm)).limit(limite);
  return linhas.reverse();
}

/** Só o que mudou desde `desde`: mensagens criadas ou apagadas depois disso (no máximo 200). */
export async function listarMudancas(desde: Date) {
  return db
    .select()
    .from(mensagens)
    .where(or(gt(mensagens.criadoEm, desde), gt(mensagens.apagadaEm, desde)))
    .orderBy(asc(mensagens.criadoEm))
    .limit(200);
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

/* ---------------- Notificações (Web Push) ---------------- */
export async function salvarInscricao(socioId: string, i: { endpoint: string; p256dh: string; auth: string }, aparelho: string) {
  await db
    .insert(pushInscricoes)
    .values({ socioId, ...i, aparelho })
    .onConflictDoUpdate({ target: pushInscricoes.endpoint, set: { socioId, p256dh: i.p256dh, auth: i.auth, aparelho } });
}

export async function removerInscricoes(endpoints: string[]) {
  if (endpoints.length) await db.delete(pushInscricoes).where(inArray(pushInscricoes.endpoint, endpoints));
}

/** Inscrições de todos os sócios menos `exceto` (quem mandou a mensagem). */
export async function inscricoesDosOutros(exceto: string) {
  return db
    .select({ socioId: pushInscricoes.socioId, endpoint: pushInscricoes.endpoint, p256dh: pushInscricoes.p256dh, auth: pushInscricoes.auth })
    .from(pushInscricoes)
    .where(ne(pushInscricoes.socioId, exceto));
}

export async function inscricoesDe(socioId: string) {
  return db
    .select({ endpoint: pushInscricoes.endpoint, p256dh: pushInscricoes.p256dh, auth: pushInscricoes.auth })
    .from(pushInscricoes)
    .where(eq(pushInscricoes.socioId, socioId));
}
