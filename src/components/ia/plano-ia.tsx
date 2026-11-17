"use client";
// Relatório do lead e plano do protótipo gerados pela IA: botão com andamento e abas Relatório e Plano.
// Não gera código: o plano é o documento para a implementação, feita depois.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { Bot, Copy, Download, FileText, ListChecks, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";
import { Aviso, Botao, Etiqueta, Medidor, cn } from "@/components/ui/base";
import { useAviso } from "@/components/ui/toast";
import { VerPlano, VerRelatorio } from "./ver-plano";
import { brl, dataHora } from "@/lib/formato";
import {
  nomeArquivo,
  planoMarkdown,
  relatorioMarkdown,
  type EstadoIA,
  type EventoGeracao,
  type PedidoPlano,
  type PlanoIASalvo,
} from "@/lib/regras/ia";

type Andamento = { fase: "enviando" | "pensando" | "escrevendo"; caracteres: number } | null;

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

  async function rodar(diagnosticoId?: string) {
    if (ocupado.current) return;
    ocupado.current = true;
    setErro("");
    try {
      setAndamento({ fase: "enviando", caracteres: 0 });
      const p = await chamar({ leadId, diagnosticoId }, (e) => setAndamento({ fase: e.fase, caracteres: e.caracteres }));
      aoTerminar(p);
      avisar({ tom: "ok", texto: "Relatório e plano prontos" });
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
  const fase = a.fase === "enviando" ? "Enviando o diagnóstico…" : a.fase === "pensando" ? "A IA está analisando…" : `Escrevendo… ${a.caracteres.toLocaleString("pt-BR")} caracteres`;
  return (
    <div role="status" aria-live="polite" className="space-y-2 rounded-md bg-azul-suave/60 px-4 py-3 text-sm">
      <p className="font-medium text-azul-escuro">Gerando relatório e plano</p>
      <p className="text-tinta-2">{fase}</p>
      <Medidor valor={Math.min(0.95, 0.05 + a.caracteres / 45000)} rotulo="Andamento da geração" />
      <p className="text-xs text-tinta-3">Leva de 1 a 3 minutos. Mantenha esta tela aberta.</p>
    </div>
  );
}

function Rodape({ estado }: { estado: EstadoIA }) {
  if (estado.tipo === "exemplo")
    return (
      <p className="flex gap-2 text-xs text-tinta-3">
        <ShieldAlert aria-hidden className="size-4 shrink-0" />
        IA ainda não conectada: o resultado é um exemplo montado pelo sistema a partir do diagnóstico, sem custo. Ao cadastrar a chave da API, o mesmo botão passa a gerar com a IA.
      </p>
    );
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
      <Botao icone={Sparkles} className="w-full" disabled={!!andamento || !!bloqueio} onClick={() => rodar(diagnosticoId)}>
        {bloqueio ?? (andamento ? "Gerando…" : "Gerar relatório e plano")}
      </Botao>
      {andamento && <TextoAndamento a={andamento} />}
      {erro && <p role="alert" className="text-sm text-risco">{erro}</p>}
      {pronto && !andamento && (
        <p role="status" className="text-sm text-ok">
          Relatório e plano prontos.{" "}
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

type Aba = "relatorio" | "plano";
const ABAS: { id: Aba; nome: string; icone: typeof FileText }[] = [
  { id: "relatorio", nome: "Relatório", icone: FileText },
  { id: "plano", nome: "Plano", icone: ListChecks },
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
    return aba === "relatorio" ? relatorioMarkdown(plano.conteudo, leadNome) : planoMarkdown(plano.conteudo, leadNome);
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
    const msg = estado.tipo === "ligada" ? "Gerar de novo usa a IA e entra no gasto do mês. Continuar?" : "Gerar o exemplo de novo?";
    if (window.confirm(msg)) rodar();
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
        {plano?.exemplo && !andamento && (
          <Aviso tom="info" titulo="Exemplo de demonstração">
            Este documento foi montado pelo sistema com os dados do diagnóstico, sem a IA. Use para conhecer o formato; com a chave da API conectada, gere de novo para ter o texto escrito pela IA.
          </Aviso>
        )}

        {!plano && !andamento && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-12 place-items-center rounded-full border border-dashed border-areia-2 bg-superficie-2 text-tinta-3"><Sparkles aria-hidden className="size-5" /></span>
            <div>
              <p className="font-medium">Nenhum relatório ainda</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-tinta-3">A IA lê o diagnóstico e entrega um relatório completo para os sócios e o plano de implementação do protótipo: requisitos, fluxos, regras de negócio, normas, arquitetura, dados, telas, metodologia e passos.</p>
            </div>
            <Botao icone={Sparkles} disabled={!!bloqueio} onClick={() => rodar()}>{bloqueio ?? "Gerar relatório e plano"}</Botao>
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
            </div>

            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tinta-3">
              {plano.exemplo ? <Etiqueta tom="neutro">Exemplo · IA não conectada</Etiqueta> : <span>Modelo {plano.modelo}</span>}
              {!plano.exemplo && <span className="numeros">{(plano.tokensEntrada + plano.tokensSaida).toLocaleString("pt-BR")} tokens · custo estimado {brl(plano.custoBRL)}</span>}
            </p>
          </>
        )}
        <Rodape estado={estado} />
      </div>
    </div>
  );
}

