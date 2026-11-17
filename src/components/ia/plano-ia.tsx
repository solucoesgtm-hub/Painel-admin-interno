"use client";
// Relatório e plano do protótipo gerados pela IA: botão com andamento e abas Relatório, Plano e Código.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type ReactNode } from "react";
import { Bot, Check, Copy, Download, FileCode2, FileText, ListChecks, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { Aviso, Botao, Etiqueta, Medidor, cn } from "@/components/ui/base";
import { useAviso } from "@/components/ui/toast";
import { brl, dataHora } from "@/lib/formato";
import {
  codigoMarkdown,
  formatarHoras,
  nomeArquivo,
  planoMarkdown,
  relatorioMarkdown,
  type EstadoIA,
  type EventoGeracao,
  type PedidoPlano,
  type PlanoIASalvo,
} from "@/lib/regras/ia";

type Andamento = { etapa: 1 | 2; fase: "enviando" | "pensando" | "escrevendo"; caracteres: number } | null;

/** Chama a rota e lê o streaming (um JSON por linha). Devolve o plano salvo ou lança o erro. */
async function chamar(pedido: PedidoPlano, aoAndar: (e: Extract<EventoGeracao, { tipo: "progresso" }>) => void): Promise<PlanoIASalvo> {
  const res = await fetch("/api/ia/plano", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedido) });
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => null)) as { mensagem?: string } | null;
    throw new Error(j?.mensagem ?? (res.status === 401 || res.redirected ? "Sua sessão expirou. Entre de novo." : "Não foi possível gerar agora."));
  }
  const leitor = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let resto = "";
  for (;;) {
    const { value, done } = await leitor.read();
    if (value) resto += value;
    const linhas = resto.split("\n");
    resto = linhas.pop() ?? "";
    for (const l of linhas) {
      if (!l.trim()) continue;
      const ev = JSON.parse(l) as EventoGeracao;
      if (ev.tipo === "progresso") aoAndar(ev);
      else if (ev.tipo === "fim") return ev.plano;
      else throw new Error(ev.mensagem);
    }
    if (done) break;
  }
  throw new Error("A conexão caiu antes do fim. O que já foi gerado aparece ao recarregar a ficha.");
}

function useGerador(leadId: string, aoTerminar: (p: PlanoIASalvo) => void) {
  const [andamento, setAndamento] = useState<Andamento>(null);
  const [erro, setErro] = useState("");
  const avisar = useAviso();
  const router = useRouter();
  const ocupado = useRef(false);

  async function rodar(inicio: { diagnosticoId?: string } | { planoId: string }) {
    if (ocupado.current) return;
    ocupado.current = true;
    setErro("");
    try {
      let planoId = "planoId" in inicio ? inicio.planoId : "";
      if (!planoId) {
        setAndamento({ etapa: 1, fase: "enviando", caracteres: 0 });
        const p = await chamar({ etapa: "plano", leadId, ...inicio }, (e) => setAndamento({ etapa: 1, fase: e.fase, caracteres: e.caracteres }));
        aoTerminar(p);
        planoId = p.id;
      }
      setAndamento({ etapa: 2, fase: "enviando", caracteres: 0 });
      const completo = await chamar({ etapa: "codigo", leadId, planoId }, (e) => setAndamento({ etapa: 2, fase: e.fase, caracteres: e.caracteres }));
      aoTerminar(completo);
      avisar({ tom: "ok", texto: "Relatório, plano e código prontos" });
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível gerar agora.");
      router.refresh();
    } finally {
      ocupado.current = false;
      setAndamento(null);
    }
  }
  return { andamento, erro, rodar };
}

function TextoAndamento({ a }: { a: NonNullable<Andamento> }) {
  const etapa = a.etapa === 1 ? "Etapa 1 de 2 · relatório e plano" : "Etapa 2 de 2 · esqueleto de código";
  const fase = a.fase === "enviando" ? "Enviando o diagnóstico…" : a.fase === "pensando" ? "A IA está analisando…" : `Escrevendo… ${a.caracteres.toLocaleString("pt-BR")} caracteres`;
  return (
    <div role="status" aria-live="polite" className="space-y-2 rounded-md bg-azul-suave/60 px-4 py-3 text-sm">
      <p className="font-medium text-azul-escuro">{etapa}</p>
      <p className="text-tinta-2">{fase}</p>
      <Medidor valor={(a.etapa - 1) / 2 + Math.min(0.45, a.caracteres / 60000)} rotulo="Andamento da geração" />
      <p className="text-xs text-tinta-3">Pode levar alguns minutos. Mantenha esta tela aberta.</p>
    </div>
  );
}

function Rodape({ estado }: { estado: EstadoIA }) {
  if (estado.tipo === "exemplo")
    return <p className="flex gap-2 text-xs text-tinta-3"><ShieldAlert aria-hidden className="size-4 shrink-0" />Demonstração: gera um exemplo fictício, sem chamar a IA.</p>;
  if (estado.tipo === "ligada")
    return <p className="numeros text-xs text-tinta-3">Gasto com IA neste mês: {brl(estado.gastoMes)} de {brl(estado.teto)}</p>;
  return null;
}

/** Botão para o checklist, logo depois de salvar o diagnóstico. */
export function BotaoGerarPlano({ leadId, diagnosticoId, estado }: { leadId: string; diagnosticoId: string; estado: EstadoIA }) {
  const [pronto, setPronto] = useState<PlanoIASalvo | null>(null);
  const { andamento, erro, rodar } = useGerador(leadId, setPronto);
  const bloqueio = motivoBloqueio(estado);
  return (
    <div className="space-y-3">
      <Botao icone={Sparkles} className="w-full" disabled={!!andamento || !!bloqueio} onClick={() => rodar({ diagnosticoId })}>
        {bloqueio ?? (andamento ? "Gerando…" : "Gerar relatório e plano")}
      </Botao>
      {andamento && <TextoAndamento a={andamento} />}
      {erro && <p role="alert" className="text-sm text-risco">{erro}</p>}
      {pronto && !andamento && (
        <p role="status" className="text-sm text-ok">
          {pronto.conteudo.codigo ? "Pronto." : "Relatório e plano prontos."}{" "}
          <Link href={`/leads/${leadId}#plano-ia`} className="font-medium underline underline-offset-2">Ver na ficha do lead</Link>
        </p>
      )}
      <Rodape estado={estado} />
    </div>
  );
}

function motivoBloqueio(estado: EstadoIA): string | null {
  if (estado.tipo === "desligada") return "IA ainda não configurada";
  if (estado.tipo === "ligada" && estado.gastoMes >= estado.teto) return "Teto mensal de IA atingido";
  return null;
}

type Aba = "relatorio" | "plano" | "codigo";
const ABAS: { id: Aba; nome: string; icone: typeof FileText }[] = [
  { id: "relatorio", nome: "Relatório", icone: FileText },
  { id: "plano", nome: "Plano", icone: ListChecks },
  { id: "codigo", nome: "Código", icone: FileCode2 },
];

/** Painel da ficha do lead: gerar, ver em abas, copiar e baixar em .md. */
export function PainelPlanoIA({
  leadId,
  leadNome,
  temDiagnostico,
  estado,
  planoInicial,
}: {
  leadId: string;
  leadNome: string;
  temDiagnostico: boolean;
  estado: EstadoIA;
  planoInicial: PlanoIASalvo | null;
}) {
  const [plano, setPlano] = useState(planoInicial);
  const [aba, setAba] = useState<Aba>("relatorio");
  const { andamento, erro, rodar } = useGerador(leadId, setPlano);
  const avisar = useAviso();
  const base = useId();
  const bloqueio = motivoBloqueio(estado) ?? (!temDiagnostico && estado.tipo !== "exemplo" ? "Salve um diagnóstico primeiro" : null);

  const markdown = () => {
    if (!plano) return "";
    if (aba === "relatorio") return relatorioMarkdown(plano.conteudo, leadNome);
    if (aba === "plano") return planoMarkdown(plano.conteudo, leadNome);
    return codigoMarkdown(plano.conteudo, leadNome);
  };
  async function copiar() {
    try {
      await navigator.clipboard.writeText(markdown());
      avisar({ tom: "ok", texto: "Copiado em Markdown" });
    } catch {
      avisar({ tom: "risco", texto: "Não foi possível copiar neste navegador" });
    }
  }
  function baixar() {
    const url = URL.createObjectURL(new Blob([markdown()], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo(aba, leadNome);
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function gerarDeNovo() {
    const msg = estado.tipo === "ligada" ? "Gerar de novo usa a IA e entra no gasto do mês. Continuar?" : "Gerar de novo?";
    if (window.confirm(msg)) rodar({});
  }

  return (
    <div id="plano-ia" className="scroll-mt-24">
      <header className="flex flex-col gap-3 border-b border-areia px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight"><Bot aria-hidden className="size-4 text-azul-escuro" />Relatório e plano do protótipo</h2>
          <p className="mt-0.5 text-[13px] text-tinta-3">
            {plano ? `Gerado em ${dataHora(plano.criadoEm)} por ${plano.autor}` : "Gerado pela IA a partir do diagnóstico mais recente"}
          </p>
        </div>
        {plano && !andamento && (
          <Botao variante="secundario" icone={RotateCcw} disabled={!!bloqueio} onClick={gerarDeNovo} className="self-start sm:self-auto">
            Gerar de novo
          </Botao>
        )}
      </header>

      <div className="space-y-4 p-5 sm:p-6">
        {andamento && <TextoAndamento a={andamento} />}
        {erro && <Aviso tom="risco" titulo="A geração não terminou">{erro}</Aviso>}

        {!plano && !andamento && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-dashed border-areia-2 bg-superficie-2 text-tinta-3"><Sparkles aria-hidden className="size-5" /></span>
            <div>
              <p className="font-medium">Nenhum relatório ainda</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-tinta-3">A IA lê o diagnóstico e entrega o resumo para os sócios, o plano do protótipo e um esqueleto de código para começar.</p>
            </div>
            <Botao icone={Sparkles} disabled={!!bloqueio} onClick={() => rodar({})}>{bloqueio ?? "Gerar relatório e plano"}</Botao>
          </div>
        )}

        {plano && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="tablist" aria-label="Partes do resultado" className="flex gap-1 overflow-x-auto rounded-full bg-superficie-2 p-1">
                {ABAS.map((a) => (
                  <button
                    key={a.id}
                    id={`${base}-${a.id}`}
                    role="tab"
                    type="button"
                    aria-selected={aba === a.id}
                    aria-controls={`${base}-painel`}
                    onClick={() => setAba(a.id)}
                    className={cn(
                      "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition",
                      aba === a.id ? "bg-papel-forte text-tinta shadow-cartao" : "text-tinta-3 hover:text-tinta",
                    )}
                  >
                    <a.icone aria-hidden className="size-4" />{a.nome}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Botao variante="secundario" icone={Copy} onClick={copiar}>Copiar</Botao>
                <Botao variante="secundario" icone={Download} onClick={baixar}>Baixar .md</Botao>
              </div>
            </div>

            <div id={`${base}-painel`} role="tabpanel" aria-labelledby={`${base}-${aba}`} className="min-w-0">
              {aba === "relatorio" && <VerRelatorio p={plano} />}
              {aba === "plano" && <VerPlano p={plano} />}
              {aba === "codigo" && (
                <VerCodigo p={plano} acao={!andamento && !plano.conteudo.codigo ? <Botao icone={FileCode2} disabled={!!bloqueio} onClick={() => rodar({ planoId: plano.id })}>{bloqueio ?? "Gerar o código"}</Botao> : null} />
              )}
            </div>

            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-3">
              {plano.exemplo ? <Etiqueta tom="neutro">Exemplo fictício</Etiqueta> : <span>Modelo {plano.modelo}</span>}
              {!plano.exemplo && <span className="numeros">{(plano.tokensEntrada + plano.tokensSaida).toLocaleString("pt-BR")} tokens · custo estimado {brl(plano.custoBRL)}</span>}
            </p>
          </>
        )}
        <Rodape estado={estado} />
      </div>
    </div>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-5 text-sm font-semibold first:mt-0">{children}</h3>;
}
function Lista({ itens }: { itens: string[] }) {
  if (!itens.length) return <p className="text-sm text-tinta-3">—</p>;
  return (
    <ul className="space-y-1.5 text-sm text-tinta-2">
      {itens.map((i, n) => <li key={n} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />{i}</li>)}
    </ul>
  );
}
const paragrafo = "whitespace-pre-line text-sm leading-relaxed text-tinta-2";

function VerRelatorio({ p }: { p: PlanoIASalvo }) {
  const r = p.conteudo.relatorio;
  return (
    <article>
      <Titulo>Resumo</Titulo><p className={paragrafo}>{r.resumo}</p>
      <Titulo>Veredito</Titulo><p className={paragrafo}>{r.vereditoExplicado}</p>
      <Titulo>Pontos fortes</Titulo><Lista itens={r.pontosFortes} />
      <Titulo>Riscos</Titulo>
      <ul className="space-y-2 text-sm">
        {r.riscos.map((x, i) => (
          <li key={i} className="rounded-md border border-areia bg-superficie px-3 py-2">
            <p className="flex items-center gap-1.5 font-medium text-tinta"><ShieldAlert aria-hidden className="size-4 text-alerta" />{x.risco}</p>
            <p className="mt-0.5 text-tinta-2">{x.mitigacao}</p>
          </li>
        ))}
      </ul>
      <Titulo>Premissas</Titulo><Lista itens={r.premissas} />
      <Titulo>Próximos passos</Titulo>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-tinta-2">{r.proximosPassos.map((x, i) => <li key={i}>{x}</li>)}</ol>
    </article>
  );
}

function VerPlano({ p }: { p: PlanoIASalvo }) {
  const { prd, arquitetura, modeloDados, telas, passos } = p.conteudo.plano;
  const total = passos.reduce((a, x) => a + x.estimativaHoras, 0);
  return (
    <article>
      <Titulo>PRD</Titulo>
      <dl className="space-y-2 text-sm">
        {([["Problema", prd.problema], ["Objetivo", prd.objetivo], ["Público", prd.publico]] as const).map(([k, v]) => (
          <div key={k}><dt className="font-medium text-tinta">{k}</dt><dd className="text-tinta-2">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div><Titulo>Escopo</Titulo><Lista itens={prd.escopo} /></div>
        <div><Titulo>Fora do escopo</Titulo><Lista itens={prd.foraDoEscopo} /></div>
        <div><Titulo>Métricas de sucesso</Titulo><Lista itens={prd.metricasSucesso} /></div>
      </div>
      <Titulo>Arquitetura</Titulo>
      <p className={paragrafo}>{arquitetura.visaoGeral}</p>
      <ul className="mt-3 divide-y divide-areia rounded-md border border-areia bg-superficie text-sm">
        {arquitetura.stack.map((s, i) => (
          <li key={i} className="px-3 py-2"><span className="font-medium">{s.camada}:</span> {s.tecnologia} <span className="text-tinta-3">— {s.motivo}</span></li>
        ))}
      </ul>
      {arquitetura.integracoes.length > 0 && (<><Titulo>Integrações</Titulo><Lista itens={arquitetura.integracoes} /></>)}
      <Titulo>Modelo de dados</Titulo>
      <div className="grid gap-3 md:grid-cols-2">
        {modeloDados.map((e, i) => (
          <div key={i} className="rounded-md border border-areia bg-superficie p-3 text-sm">
            <p className="font-mono text-[13px] font-semibold">{e.entidade}</p>
            <ul className="mt-1.5 space-y-0.5 break-words font-mono text-xs text-tinta-2">{e.campos.map((c, j) => <li key={j}>{c}</li>)}</ul>
            {e.observacao && <p className="mt-2 text-xs text-tinta-3">{e.observacao}</p>}
          </div>
        ))}
      </div>
      <Titulo>Telas</Titulo>
      <div className="grid gap-3 md:grid-cols-2">
        {telas.map((t, i) => (
          <div key={i} className="rounded-md border border-areia bg-superficie p-3 text-sm">
            <p className="font-medium">{t.nome}</p><p className="text-tinta-2">{t.objetivo}</p>
            <p className="mt-1 text-xs text-tinta-3">{t.elementos.join(" · ")}</p>
          </div>
        ))}
      </div>
      <Titulo>Passos de implementação · ≈ {formatarHoras(total)}</Titulo>
      <ol className="space-y-2 text-sm">
        {[...passos].sort((a, b) => a.ordem - b.ordem).map((x) => (
          <li key={x.ordem} className="flex gap-3">
            <span className="numeros grid size-7 shrink-0 place-items-center rounded-full bg-azul-suave text-xs font-semibold text-azul-escuro">{x.ordem}</span>
            <div className="min-w-0"><p className="font-medium">{x.titulo} <span className="numeros font-normal text-tinta-3">· {formatarHoras(x.estimativaHoras)}</span></p><p className="text-tinta-2">{x.descricao}</p></div>
          </li>
        ))}
      </ol>
    </article>
  );
}

function VerCodigo({ p, acao }: { p: PlanoIASalvo; acao: ReactNode }) {
  const c = p.conteudo.codigo;
  if (!c)
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <p className="font-medium">Esqueleto de código ainda não gerado</p>
        <p className="max-w-sm text-sm text-tinta-3">A segunda etapa parte do plano acima e entrega os arquivos iniciais do protótipo.</p>
        {acao}
      </div>
    );
  return (
    <article className="space-y-4">
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-superficie-2 p-3 text-[13px] leading-relaxed text-tinta-2">{c.instrucoes}</pre>
      {c.arquivos.map((a, i) => (
        <section key={i} className="overflow-hidden rounded-md border border-areia">
          <header className="border-b border-areia bg-superficie px-3 py-2">
            <p className="break-all font-mono text-[13px] font-semibold">{a.caminho}</p>
            <p className="text-xs text-tinta-3">{a.descricao}</p>
          </header>
          <pre tabIndex={0} aria-label={`Código de ${a.caminho}`} className="max-h-[28rem] overflow-auto bg-grafite p-3 font-mono text-xs leading-relaxed text-[#e6e7ee]"><code>{a.conteudo}</code></pre>
        </section>
      ))}
    </article>
  );
}
