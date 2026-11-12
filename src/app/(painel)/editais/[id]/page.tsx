import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText, CheckCircle2, HelpCircle, XCircle } from "lucide-react";
import { Aviso, CabecalhoCartao, Cartao, Etiqueta } from "@/components/ui/base";
import { EDITAIS } from "@/lib/demo/dados";
import { brl, data } from "@/lib/formato";
import { normalizarMarcacao, vereditoEdital } from "@/lib/regras/editais";
import { exigirSocio } from "@/lib/sessao";
import { EtiquetaVereditoEdital, SITUACAO_EDITAL } from "../comum";

const MARCACAO = {
  atende: { nome: "Atende", tom: "ok" as const, icone: CheckCircle2 },
  nao_atende: { nome: "Não atende", tom: "risco" as const, icone: XCircle },
  verificar: { nome: "Verificar", tom: "alerta" as const, icone: HelpCircle },
};

export default async function FichaEdital({ params }: { params: Promise<{ id: string }> }) {
  await exigirSocio();
  const { id } = await params;
  const e = EDITAIS.find((x) => x.id === id);
  if (!e) notFound();
  const v = vereditoEdital(e.requisitos);

  return (
    <>
      <Link href="/editais" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta">
        <ArrowLeft aria-hidden className="size-4" /> Voltar aos editais
      </Link>

      <header className="animate-surgir mb-4 rounded-xl border border-areia bg-papel p-5 shadow-cartao sm:p-6">
        <div className="flex flex-wrap gap-2">
          <Etiqueta tom={SITUACAO_EDITAL[e.situacao].tom}>{SITUACAO_EDITAL[e.situacao].nome}</Etiqueta>
          <EtiquetaVereditoEdital v={v} />
        </div>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">{e.numero}</h1>
        <p className="mt-1 text-sm text-tinta-3">{e.orgao}</p>
        <p className="mt-3 max-w-3xl text-[15px] leading-relaxed">{e.objeto}</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-areia pt-5 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-tinta-3">Valor</dt><dd className="numeros font-semibold">{brl(e.valor)}</dd></div>
          <div><dt className="text-xs text-tinta-3">Prazo</dt><dd className="numeros font-semibold">{data(e.prazo)}</dd></div>
          <div><dt className="text-xs text-tinta-3">Público</dt><dd>{e.publico}</dd></div>
          <div><dt className="text-xs text-tinta-3">Região</dt><dd>{e.regiao}</dd></div>
        </dl>
      </header>

      <Aviso tom="alerta" titulo="Conferência obrigatória" className="mb-4">
        Requisitos eliminatórios marcados como <strong>Atende</strong> devem ser conferidos por um sócio na página citada antes de aplicar.
      </Aviso>

      {v.tipo !== "apto" && (
        <Aviso tom={v.tipo === "nao_apto" ? "risco" : "info"} titulo={v.tipo === "nao_apto" ? "Por que não está apto" : "O que falta para ficar apto"} className="mb-4">
          <ul className="mt-1 list-disc space-y-0.5 pl-5">{(v.tipo === "nao_apto" ? v.motivos : v.faltas).map((f) => <li key={f}>{f}</li>)}</ul>
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Cartao className="xl:col-span-2">
          <CabecalhoCartao titulo="Elegibilidade × Perfil GTM" descricao="Cada marcação cita a página e o trecho do edital" />
          <ul className="divide-y divide-areia">
            {e.requisitos.map((r) => {
              const m = MARCACAO[normalizarMarcacao(r)];
              return (
                <li key={r.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-medium">{r.texto} {r.eliminatorio && <span className="ml-1 rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">Eliminatório</span>}</p>
                    {r.pagina && r.trecho ? (
                      <blockquote className="mt-2 flex gap-2 border-l-2 border-azul/40 pl-3 text-[13px] italic text-tinta-2">
                        <span>“{r.trecho}”</span>
                        <span className="numeros shrink-0 not-italic text-xs text-azul">p. {r.pagina}</span>
                      </blockquote>
                    ) : (
                      <p className="mt-2 text-xs text-alerta">Sem página citada — marcado como Verificar.</p>
                    )}
                    {r.perfil && <p className="mt-2 text-xs text-tinta-3">Perfil GTM: {r.perfil}</p>}
                  </div>
                  <div><Etiqueta tom={m.tom} icone={m.icone}>{m.nome}</Etiqueta></div>
                </li>
              );
            })}
          </ul>
        </Cartao>

        <div className="space-y-4">
          <Cartao>
            <CabecalhoCartao titulo="Cronograma" />
            <ol className="relative space-y-4 p-5 before:absolute before:bottom-7 before:left-[25px] before:top-7 before:w-px before:bg-areia-2">
              {e.cronograma.map((c) => (
                <li key={c.etapa} className="relative flex items-center gap-3 pl-6">
                  <span aria-hidden className="absolute left-0 size-2.5 rounded-full border-2 border-azul bg-papel" />
                  <span className="flex-1 text-sm">{c.etapa}</span>
                  <span className="numeros text-xs text-tinta-3">{data(c.data)}</span>
                </li>
              ))}
            </ol>
          </Cartao>
          <Cartao>
            <CabecalhoCartao titulo="Critérios de avaliação" />
            <ul className="space-y-3 p-5">
              {e.criterios.map((c) => (
                <li key={c.nome}>
                  <div className="flex justify-between text-sm"><span>{c.nome}</span><span className="numeros font-medium">{c.peso}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-areia"><div className="h-full rounded-full bg-azul" style={{ width: `${c.peso}%` }} /></div>
                </li>
              ))}
            </ul>
          </Cartao>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {([["Documentos exigidos", e.documentos], ["Vedações", e.vedacoes], ["Contrapartidas", e.contrapartidas], ["Dúvidas a enviar ao órgão", e.duvidas]] as const).map(([t, lista]) => (
          <Cartao key={t}>
            <CabecalhoCartao titulo={t} />
            {lista.length ? (
              <ul className="space-y-2 p-5 text-sm">{lista.map((x) => <li key={x} className="flex gap-2"><BookOpenText aria-hidden className="mt-0.5 size-3.5 shrink-0 text-tinta-3" />{x}</li>)}</ul>
            ) : (
              <p className="p-5 text-sm text-tinta-3">Nada encontrado na leitura.</p>
            )}
          </Cartao>
        ))}
      </div>
    </>
  );
}
