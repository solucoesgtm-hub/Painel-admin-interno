import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardCheck, FileSignature, FolderKanban, MapPin, Phone, Receipt, Tag, UserRound } from "lucide-react";
import {
  Avatar,
  BotaoLink,
  CabecalhoCartao,
  Cartao,
  Etiqueta,
  EtiquetaVeredito,
  EstadoVazio,
  Medidor,
} from "@/components/ui/base";
import { CONTRATOS, MENSALIDADES, PROJETOS } from "@/lib/demo/dados";
import { brl, data, dataCurta, relativo } from "@/lib/formato";
import { situacaoMensalidade } from "@/lib/regras/financeiro";
import { estaParado, nomeEtapa } from "@/lib/regras/funil";
import { buscarLead, listarDiagnosticos, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { EditarLead } from "./editar";

export default async function FichaCliente({ params }: { params: Promise<{ id: string }> }) {
  await exigirSocio();
  const { id } = await params;
  const l = await buscarLead(id);
  if (!l) notFound();
  const [socios, diagnosticos] = await Promise.all([listarSocios(), listarDiagnosticos(l.id)]);
  const dono = socios.find((s) => s.id === l.donoId);
  const base = l.nome;
  const projetos = PROJETOS.filter((p) => p.cliente === base);
  const contratos = CONTRATOS.filter((c) => c.cliente === base);
  const pagamentos = MENSALIDADES.filter((m) => m.cliente === base);

  return (
    <>
      <Link href="/leads" className="mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-tinta-3 hover:text-tinta">
        <ArrowLeft aria-hidden className="size-4" /> Voltar ao funil
      </Link>

      <header className="animate-surgir mb-6 flex flex-col gap-4 rounded-xl border border-areia bg-papel p-5 shadow-cartao sm:p-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Etiqueta tom={l.etapa === "perdido" ? "risco" : l.etapa === "manutencao" || l.etapa === "fechado" ? "ok" : "info"}>{nomeEtapa(l.etapa)}</Etiqueta>
            <EtiquetaVeredito v={l.veredito} />
            {estaParado(l.etapa, l.etapaDesde) && <Etiqueta tom="alerta">Parado há mais de 7 dias</Etiqueta>}
          </div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-[28px]">{l.nome}</h1>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-tinta-3">
            <span className="inline-flex items-center gap-1.5"><Tag aria-hidden className="size-3.5" />{l.segmento || "Sem segmento"}</span>
            <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden className="size-3.5" />{l.cidade || "—"}</span>
            <span className="inline-flex items-center gap-1.5"><UserRound aria-hidden className="size-3.5" />Origem: {l.origem || "—"}</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-lg bg-superficie-2 p-4 lg:w-80">
          <p className="text-xs font-medium uppercase tracking-wide text-tinta-3">Próximo passo</p>
          <p className="text-sm font-medium">{l.proximoPasso}</p>
          <div className="flex items-center justify-between text-xs text-tinta-3">
            <span>{data(l.proximoPassoData)} · {relativo(l.proximoPassoData)}</span>
            {dono && <span className="inline-flex items-center gap-1.5"><Avatar nome={dono.nome} cor={dono.cor} tamanho="sm" />{dono.nome}</span>}
          </div>
          <EditarLead lead={l} socios={socios} />
        </div>
      </header>

      {l.etapa === "perdido" && l.motivoPerda && (
        <p className="mb-4 rounded-md bg-risco-suave px-4 py-3 text-sm text-risco">Motivo da perda: <strong>{l.motivoPerda}</strong></p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <Cartao>
            <CabecalhoCartao titulo="Contatos" />
            <dl className="divide-y divide-areia text-sm">
              <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-tinta-3">Responsável</dt><dd className="font-medium">{l.contatoNome || "—"}</dd></div>
              <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-tinta-3">Telefone</dt>
                <dd>{l.contatoTelefone ? <a className="inline-flex items-center gap-1.5 font-medium text-azul hover:underline" href={`tel:${l.contatoTelefone.replace(/\D/g, "")}`}><Phone aria-hidden className="size-3.5" />{l.contatoTelefone}</a> : "—"}</dd></div>
              <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-tinta-3">Cliente desde</dt><dd>{data(l.criadoEm)}</dd></div>
              <div className="flex justify-between gap-3 px-5 py-3"><dt className="text-tinta-3">Na etapa desde</dt><dd>{data(l.etapaDesde)}</dd></div>
            </dl>
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Diagnósticos" acao={<BotaoLink href={`/diagnostico?lead=${l.id}`} variante="fantasma" className="min-h-9 px-2 text-azul">Novo</BotaoLink>} />
            {l.pontuacao === null ? (
              <EstadoVazio icone={ClipboardCheck} titulo="Sem diagnóstico" texto="Faça o checklist na visita para ter a pontuação e o veredito." />
            ) : (
              <div className="space-y-3 p-5">
                <div className="flex items-end justify-between">
                  <p className="numeros text-3xl font-semibold">{l.pontuacao}<span className="text-base text-tinta-3">/100</span></p>
                  <EtiquetaVeredito v={l.veredito} />
                </div>
                <Medidor valor={l.pontuacao / 100} rotulo="Pontuação do diagnóstico" tom={l.veredito === "quente" ? "ok" : l.veredito === "morno" ? "alerta" : "azul"} />
                {diagnosticos.length > 0 ? (
                  <ul className="divide-y divide-areia border-t border-areia pt-1 text-[13px]">
                    {diagnosticos.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-tinta-2">{data(d.criadoEm)} · {d.autor}</span>
                        <span className="numeros font-medium">{d.pontuacao} pts</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-tinta-3">Pontuação do diagnóstico mais recente.</p>
                )}
              </div>
            )}
          </Cartao>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Cartao>
            <CabecalhoCartao titulo="Proposta" descricao="Valores combinados com o cliente" />
            {l.valorImplantacao || l.mensalidade ? (
              <div className="grid grid-cols-2 divide-x divide-areia">
                <div className="p-5"><p className="text-xs text-tinta-3">Implantação</p><p className="numeros mt-1 text-xl font-semibold">{brl(l.valorImplantacao)}</p></div>
                <div className="p-5"><p className="text-xs text-tinta-3">Mensalidade</p><p className="numeros mt-1 text-xl font-semibold">{brl(l.mensalidade)}</p></div>
              </div>
            ) : (
              <EstadoVazio icone={Receipt} titulo="Nenhuma proposta ainda" texto="Quando combinar os valores com o cliente, registre a implantação e a mensalidade em Editar." />
            )}
          </Cartao>

          <Cartao>
            <CabecalhoCartao titulo="Projetos" />
            {projetos.length === 0 ? (
              <EstadoVazio icone={FolderKanban} titulo="Sem projetos" texto="Projetos aparecem aqui quando o cliente fecha." />
            ) : (
              <ul className="divide-y divide-areia">
                {projetos.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1"><p className="text-sm font-medium">{p.nome}</p><p className="text-xs text-tinta-3">Prazo {dataCurta(p.prazo)}</p></div>
                    <div className="w-32"><Medidor valor={p.tarefas.feitas / p.tarefas.total} rotulo={`Progresso de ${p.nome}`} /></div>
                    <span className="numeros w-10 text-right text-xs text-tinta-3">{p.tarefas.feitas}/{p.tarefas.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </Cartao>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Cartao>
              <CabecalhoCartao titulo="Contratos" />
              {contratos.length === 0 ? (
                <EstadoVazio icone={FileSignature} titulo="Sem contratos" texto="Gere o contrato a partir da proposta aprovada." />
              ) : (
                <ul className="divide-y divide-areia">
                  {contratos.map((c) => (
                    <li key={c.id} className="px-5 py-3.5 text-sm">
                      <p className="font-medium">{c.produto}</p>
                      <p className="text-xs text-tinta-3">{data(c.inicio)} a {data(c.fim)}</p>
                      <div className="mt-1.5">{c.assinado ? <Etiqueta tom="ok">Assinado</Etiqueta> : <Etiqueta tom="alerta">Aguardando assinatura</Etiqueta>}</div>
                    </li>
                  ))}
                </ul>
              )}
            </Cartao>
            <Cartao>
              <CabecalhoCartao titulo="Pagamentos" />
              {pagamentos.length === 0 ? (
                <EstadoVazio icone={Receipt} titulo="Sem cobranças" texto="As mensalidades do cliente aparecem aqui." />
              ) : (
                <ul className="divide-y divide-areia">
                  {pagamentos.map((m) => {
                    const s = situacaoMensalidade(m.vencimento, m.pagoEm);
                    return (
                      <li key={m.id} className="flex items-center justify-between px-5 py-3.5 text-sm">
                        <div><p className="numeros font-medium">{brl(m.valor)}</p><p className="text-xs text-tinta-3">Vence {data(m.vencimento)}</p></div>
                        <Etiqueta tom={s === "pago" ? "ok" : s === "atrasado" ? "risco" : "alerta"}>{s === "pago" ? "Pago" : s === "atrasado" ? "Atrasado" : "A vencer"}</Etiqueta>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Cartao>
          </div>
        </div>
      </div>
    </>
  );
}
