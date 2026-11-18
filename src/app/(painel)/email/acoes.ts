"use server";
// Ações da caixa de e-mail. O servidor relê a caixa a cada ação: o navegador só manda o id
// do e-mail e o texto da resposta, nunca o destinatário. Rascunho, nunca envio.
import { z } from "zod";
import { provedorEmail } from "@/lib/conexoes/gmail";
import { LIMITE_EMAILS } from "@/lib/regras/email";
import { triarEmails, type ResultadoTriagem } from "@/lib/ia/triagem-email";
import { iaConfigurada } from "@/lib/ia/claude";
import { registrarNoHistorico } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export async function acaoTriarComIa(): Promise<{ ok: true; triagem: ResultadoTriagem } | { ok: false; mensagem: string }> {
  await exigirSocio();
  if (!iaConfigurada()) return { ok: false, mensagem: "A IA ainda não está ligada. Veja em Conexões." };
  try {
    const emails = await provedorEmail().listarEntrada(LIMITE_EMAILS);
    return { ok: true, triagem: await triarEmails(emails) };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível ler a caixa de e-mail." };
  }
}

const esquema = z.object({
  emailId: z.string().min(1).max(200),
  corpo: z.string().trim().min(1, "Escreva a resposta.").max(10_000),
});

export async function acaoCriarRascunho(dados: unknown): Promise<{ ok: true; demo: boolean } | { ok: false; mensagem: string }> {
  const socio = await exigirSocio();
  const r = esquema.safeParse(dados);
  if (!r.success) return { ok: false, mensagem: r.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    const provedor = provedorEmail();
    const email = (await provedor.listarEntrada(50)).find((e) => e.id === r.data.emailId);
    if (!email) return { ok: false, mensagem: "Esse e-mail não está mais na caixa de entrada." };
    await provedor.criarRascunho({
      emailId: email.id,
      conversaId: email.conversaId,
      para: email.de,
      assunto: email.assunto,
      corpo: r.data.corpo,
      mensagemId: email.mensagemId,
    });
    await registrarNoHistorico(socio, "criou", "rascunho_email", `Rascunho para ${email.nomeDe || email.de} — ${email.assunto}`).catch(() => {});
    return { ok: true, demo: provedor.tipo === "demo" };
  } catch (e) {
    return { ok: false, mensagem: e instanceof Error ? e.message : "Não foi possível criar o rascunho." };
  }
}
