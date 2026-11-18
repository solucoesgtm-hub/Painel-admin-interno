import type { Metadata } from "next";
import { FlaskConical, MailCheck } from "lucide-react";
import { Aviso, CabecalhoPagina, Etiqueta } from "@/components/ui/base";
import { provedorEmail } from "@/lib/conexoes/gmail";
import { iaConfigurada } from "@/lib/ia/claude";
import type { ResultadoTriagem } from "@/lib/ia/triagem-email";
import { LIMITE_EMAILS, triagemPorRegras } from "@/lib/regras/email";
import { exigirSocio } from "@/lib/sessao";
import { CaixaEmail } from "./caixa";

export const metadata: Metadata = { title: "E-mail" };

export default async function Email() {
  await exigirSocio();
  const provedor = provedorEmail();
  const gmail = provedor.tipo === "gmail";
  let erro: string | null = null;
  let inicial: ResultadoTriagem = { itens: [], fonte: "regras" };
  // Ao abrir, a triagem é por regras (sem custo). A IA roda só quando um sócio pede.
  try {
    const emails = await provedor.listarEntrada(LIMITE_EMAILS);
    inicial = { itens: emails.map((e) => ({ ...triagemPorRegras(e), email: e })), fonte: "regras" };
  } catch (e) {
    erro = e instanceof Error ? e.message : "Não foi possível ler a caixa de e-mail.";
  }

  return (
    <>
      <CabecalhoPagina
        titulo="E-mail"
        descricao="Caixa de entrada dos últimos 14 dias, separada por assunto e urgência. As respostas viram rascunhos no Gmail: nada é enviado sem um sócio."
        acoes={
          gmail ? (
            <Etiqueta tom="ok" icone={MailCheck}>Gmail ligado</Etiqueta>
          ) : (
            <Etiqueta tom="alerta" icone={FlaskConical}>Demonstração</Etiqueta>
          )
        }
      />
      {!gmail && (
        <Aviso tom="info" titulo="Gmail ainda não ligado" className="mb-4">
          Os e-mails abaixo são fictícios e os rascunhos não são criados de verdade. Para ligar a caixa da GTM, siga o passo a passo em docs/CONEXOES.md e
          confira em Conexões.
        </Aviso>
      )}
      {erro && (
        <Aviso tom="risco" titulo="Não foi possível ler o Gmail" className="mb-4">
          {erro}
        </Aviso>
      )}
      <CaixaEmail inicial={inicial} iaLigada={iaConfigurada()} gmail={gmail} />
    </>
  );
}
