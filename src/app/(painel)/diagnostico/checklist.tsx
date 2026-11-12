"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Building2,
  Calculator,
  Check,
  CloudOff,
  FileText,
  Gauge,
  ListChecks,
  MessageSquareWarning,
  Plus,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Aviso, Botao, CabecalhoCartao, Campo, Cartao, Entrada, EtiquetaVeredito, Selecao, cn } from "@/components/ui/base";
import { useAviso } from "@/components/ui/toast";
import { brl } from "@/lib/formato";
import { FATORES, PESOS_PADRAO, calcularPontuacao, complexidade, economia, veredito, type Fator, type Notas } from "@/lib/regras/pontuacao";
import { acaoSalvarDiagnostico } from "./acoes";

type Estado = {
  leadId: string;
  negocio: { porte: string; tempo: string; atendimento: string[] };
  ferramentas: string[];
  reclamacoes: string[];
  tarefas: { nome: string; peso: number }[];
  numeros: { atendimentosDia: string; horasSemana: string; custoHora: string; ticketMedio: string };
  notas: Notas;
  observacao: string;
  atualizadoEm: string | null;
};

const VAZIO: Estado = {
  leadId: "",
  negocio: { porte: "", tempo: "", atendimento: [] },
  ferramentas: [],
  reclamacoes: [],
  tarefas: [],
  numeros: { atendimentosDia: "", horasSemana: "", custoHora: "", ticketMedio: "" },
  notas: { dor: 0, orcamento: 0, urgencia: 0, decisor: 0, abertura: 0 },
  observacao: "",
  atualizadoEm: null,
};

const SECOES: { id: string; nome: string; icone: LucideIcon }[] = [
  { id: "negocio", nome: "Negócio", icone: Building2 },
  { id: "ferramentas", nome: "Ferramentas atuais", icone: Wrench },
  { id: "reclamacoes", nome: "Reclamações do sistema", icone: MessageSquareWarning },
  { id: "tarefas", nome: "Tarefas manuais", icone: ListChecks },
  { id: "numeros", nome: "Números", icone: Calculator },
  { id: "fechamento", nome: "Fechamento", icone: Gauge },
];

const TAREFAS_SUGERIDAS = ["Responder WhatsApp", "Agendar clientes", "Controlar estoque", "Cobrar pagamentos", "Enviar orçamentos", "Postar no Instagram", "Conferir caixa"];
const CHAVE = (lead: string) => `gtm-diagnostico:${lead || "rascunho"}`;

function Chips({ opcoes, valor, multiplo = true, aoMudar, rotulo }: { opcoes: string[]; valor: string[] | string; multiplo?: boolean; aoMudar: (v: string[] | string) => void; rotulo: string }) {
  const sel = (o: string) => (Array.isArray(valor) ? valor.includes(o) : valor === o);
  return (
    <div role="group" aria-label={rotulo} className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o}
          type="button"
          aria-pressed={sel(o)}
          onClick={() => {
            if (!multiplo) return aoMudar(sel(o) ? "" : o);
            const atual = valor as string[];
            aoMudar(sel(o) ? atual.filter((x) => x !== o) : [...atual, o]);
          }}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition",
            sel(o) ? "border-azul bg-azul text-white" : "border-areia-2 bg-superficie text-tinta-2 hover:border-tinta-3",
          )}
        >
          {sel(o) && <Check aria-hidden className="size-3.5" />}
          {o}
        </button>
      ))}
    </div>
  );
}

export function Checklist({ leads, leadInicial }: { leads: { id: string; nome: string }[]; leadInicial?: string }) {
  const [e, setE] = useState<Estado>({ ...VAZIO, leadId: leadInicial ?? "" });
  const [carregado, setCarregado] = useState(false);
  const [online, setOnline] = useState(true);
  const [novaTarefa, setNovaTarefa] = useState("");
  const [erroSalvar, setErroSalvar] = useState("");
  const [salvoEm, setSalvoEm] = useState<string | null>(null);
  const [salvando, iniciarSalvar] = useTransition();
  const router = useRouter();
  const avisar = useAviso();

  function salvarNoServidor() {
    setErroSalvar("");
    if (!navigator.onLine) {
      setErroSalvar("Sem sinal. O rascunho está guardado no aparelho; salve quando a internet voltar.");
      return;
    }
    const leadId = e.leadId;
    iniciarSalvar(async () => {
      const r = await acaoSalvarDiagnostico({
        leadId,
        notas: e.notas,
        tarefas: e.tarefas,
        ferramentas: e.ferramentas,
        reclamacoes: e.reclamacoes,
        negocio: e.negocio,
        numeros: e.numeros,
        observacao: e.observacao,
      });
      if (!r.ok) {
        setErroSalvar(r.mensagem);
        return;
      }
      try { localStorage.removeItem(CHAVE(leadId)); } catch {}
      setSalvoEm(leadId);
      setE({ ...VAZIO });
      avisar({ tom: "ok", texto: `Diagnóstico salvo: ${r.pontuacao} pontos` });
      router.refresh();
    });
  }

  // Carrega rascunho salvo no aparelho (funciona sem sinal).
  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE(e.leadId));
      if (salvo) setE(JSON.parse(salvo));
    } catch {}
    setCarregado(true);
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Salva a cada alteração.
  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(CHAVE(e.leadId), JSON.stringify(e)); } catch {}
  }, [e, carregado]);

  const atualizar = (p: Partial<Estado> | ((x: Estado) => Partial<Estado>)) =>
    setE((x) => ({ ...x, ...(typeof p === "function" ? p(x) : p), atualizadoEm: new Date().toISOString() }));

  const pontos = calcularPontuacao(e.notas, PESOS_PADRAO);
  const v = veredito(pontos);
  const comp = complexidade(e.tarefas, e.ferramentas.filter((f) => f !== "Caderno").length > 2 ? 2 : 1);
  const eco = economia(Number(e.numeros.horasSemana) || 0, Number(e.numeros.custoHora) || 0);
  const preenchidas = useMemo(() => {
    const s = [
      !!(e.negocio.porte && e.negocio.tempo),
      e.ferramentas.length > 0,
      e.reclamacoes.length > 0,
      e.tarefas.length > 0,
      !!(e.numeros.horasSemana && e.numeros.custoHora),
      Object.values(e.notas).every((n) => n > 0),
    ];
    return s;
  }, [e]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Aviso tom="alerta" titulo="Proteção de dados (LGPD)">
          Registre só os <strong>processos</strong> do cliente. Nunca anote dados pessoais de pacientes ou consumidores do cliente.
        </Aviso>

        <Cartao className="p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <Campo rotulo="Lead visitado" id="lead">
              <Selecao id="lead" value={e.leadId} onChange={(ev) => atualizar({ leadId: ev.target.value })}>
                <option value="">Selecione o lead</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </Selecao>
            </Campo>
            <p className={cn("inline-flex min-h-11 items-center gap-2 text-xs", online ? "text-ok" : "text-alerta")} aria-live="polite">
              {online ? <Check aria-hidden className="size-4" /> : <CloudOff aria-hidden className="size-4" />}
              {online ? "Salvo neste aparelho" : "Sem sinal — salvando no aparelho"}
            </p>
          </div>
          <nav aria-label="Seções do checklist" className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
            {SECOES.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className={cn("inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 ring-inset", preenchidas[i] ? "bg-ok-suave text-ok ring-ok/20" : "bg-offwhite text-tinta-3 ring-areia")}>
                {preenchidas[i] ? <Check aria-hidden className="size-3" /> : <span className="numeros">{i + 1}</span>}
                {s.nome}
              </a>
            ))}
          </nav>
        </Cartao>

        <Secao n={1} {...SECOES[0]!}>
          <div className="space-y-5">
            <div><p className="mb-2 text-[13px] font-medium text-tinta-2">Porte</p>
              <Chips rotulo="Porte" multiplo={false} opcoes={["Só o dono", "2 a 5 pessoas", "6 a 15 pessoas", "Mais de 15"]} valor={e.negocio.porte} aoMudar={(x) => atualizar({ negocio: { ...e.negocio, porte: x as string } })} /></div>
            <div><p className="mb-2 text-[13px] font-medium text-tinta-2">Tempo de mercado</p>
              <Chips rotulo="Tempo de mercado" multiplo={false} opcoes={["Menos de 1 ano", "1 a 5 anos", "5 a 15 anos", "Mais de 15"]} valor={e.negocio.tempo} aoMudar={(x) => atualizar({ negocio: { ...e.negocio, tempo: x as string } })} /></div>
            <div><p className="mb-2 text-[13px] font-medium text-tinta-2">Como atende os clientes</p>
              <Chips rotulo="Canais de atendimento" opcoes={["Balcão", "WhatsApp", "Telefone", "Instagram", "Entrega"]} valor={e.negocio.atendimento} aoMudar={(x) => atualizar({ negocio: { ...e.negocio, atendimento: x as string[] } })} /></div>
          </div>
        </Secao>

        <Secao n={2} {...SECOES[1]!}>
          <Chips rotulo="Ferramentas atuais" opcoes={["WhatsApp comum", "WhatsApp Business", "Planilha", "Caderno", "Sistema de gestão", "Agenda de papel", "Maquininha"]} valor={e.ferramentas} aoMudar={(x) => atualizar({ ferramentas: x as string[] })} />
        </Secao>

        <Secao n={3} {...SECOES[2]!}>
          <Chips rotulo="Reclamações" opcoes={["Demora para responder", "Perde mensagens", "Esquece retornos", "Erros no estoque", "Falta de relatório", "Clientes faltam", "Sistema caro", "Sistema difícil"]} valor={e.reclamacoes} aoMudar={(x) => atualizar({ reclamacoes: x as string[] })} />
        </Secao>

        <Secao n={4} {...SECOES[3]!} descricao="Toque para incluir e defina o peso: 1 = leve, 3 = consome muito tempo.">
          <div className="flex flex-wrap gap-2">
            {TAREFAS_SUGERIDAS.filter((t) => !e.tarefas.some((x) => x.nome === t)).map((t) => (
              <button key={t} type="button" onClick={() => atualizar({ tarefas: [...e.tarefas, { nome: t, peso: 2 }] })}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-dashed border-areia-2 px-4 text-sm text-tinta-2 hover:border-azul hover:text-azul">
                <Plus aria-hidden className="size-3.5" />{t}
              </button>
            ))}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(ev) => { ev.preventDefault(); if (novaTarefa.trim()) { atualizar({ tarefas: [...e.tarefas, { nome: novaTarefa.trim(), peso: 2 }] }); setNovaTarefa(""); } }}>
            <label htmlFor="nova-tarefa" className="sr-only">Outra tarefa manual</label>
            <Entrada id="nova-tarefa" placeholder="Outra tarefa manual" value={novaTarefa} onChange={(ev) => setNovaTarefa(ev.target.value)} />
            <Botao type="submit" variante="secundario" icone={Plus}>Incluir</Botao>
          </form>
          {e.tarefas.length > 0 && (
            <ul className="mt-4 divide-y divide-areia rounded-md border border-areia bg-superficie">
              {e.tarefas.map((t, i) => (
                <li key={t.nome} className="flex flex-wrap items-center gap-3 px-3 py-2">
                  <span className="min-w-0 flex-1 text-sm">{t.nome}</span>
                  <div role="radiogroup" aria-label={`Peso de ${t.nome}`} className="flex gap-1">
                    {[1, 2, 3].map((p) => (
                      <button key={p} type="button" role="radio" aria-checked={t.peso === p}
                        onClick={() => atualizar({ tarefas: e.tarefas.map((x, j) => (j === i ? { ...x, peso: p } : x)) })}
                        className={cn("numeros grid size-11 place-items-center rounded-md border text-sm font-medium", t.peso === p ? "border-azul bg-azul text-white" : "border-areia-2 bg-superficie text-tinta-3")}>
                        {p}
                      </button>
                    ))}
                  </div>
                  <button type="button" aria-label={`Remover ${t.nome}`} onClick={() => atualizar({ tarefas: e.tarefas.filter((_, j) => j !== i) })}
                    className="grid size-11 place-items-center rounded-md text-tinta-3 hover:bg-risco-suave hover:text-risco">
                    <Trash2 aria-hidden className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Secao>

        <Secao n={5} {...SECOES[4]!}>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {([
              ["atendimentosDia", "Atendimentos por dia", "numeric"],
              ["horasSemana", "Horas/semana em tarefas manuais", "decimal"],
              ["custoHora", "Custo da hora (R$)", "decimal"],
              ["ticketMedio", "Ticket médio (R$)", "decimal"],
            ] as const).map(([k, r, m]) => (
              <Campo key={k} rotulo={r} id={k}>
                <Entrada id={k} inputMode={m} value={e.numeros[k]} onChange={(ev) => atualizar({ numeros: { ...e.numeros, [k]: ev.target.value.replace(",", ".") } })} />
              </Campo>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 divide-x divide-areia overflow-hidden rounded-md border border-areia bg-azul-suave/50">
            {([["Por semana", eco.semanal], ["Por mês", eco.mensal], ["Por ano", eco.anual]] as const).map(([r, val]) => (
              <div key={r} className="px-3 py-3 text-center">
                <p className="text-[11px] uppercase tracking-wide text-tinta-3">{r}</p>
                <p className="numeros mt-0.5 text-[15px] font-semibold text-azul-escuro sm:text-lg">{brl(val)}</p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-tinta-3">Calculadora de economia: horas por semana × custo da hora.</p>
        </Secao>

        <Secao n={6} {...SECOES[5]!} descricao="Dê uma nota de 0 a 5 para cada fator. A pontuação é calculada na hora.">
          <div className="space-y-4">
            {FATORES.map((f) => (
              <div key={f.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="sm:w-48">
                  <p className="text-sm font-medium">{f.nome} <span className="numeros text-xs font-normal text-tinta-3">· peso {PESOS_PADRAO[f.id]}</span></p>
                  <p className="text-xs text-tinta-3">{f.dica}</p>
                </div>
                <div role="radiogroup" aria-label={`Nota de ${f.nome}`} className="grid flex-1 grid-cols-6 gap-1.5">
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={e.notas[f.id] === n}
                      onClick={() => atualizar((x) => ({ notas: { ...x.notas, [f.id as Fator]: n } }))}
                      className={cn("numeros min-h-11 rounded-md border text-sm font-medium transition",
                        e.notas[f.id] === n ? "border-azul bg-azul text-white" : e.notas[f.id] > n ? "border-azul/20 bg-azul-suave text-azul-escuro" : "border-areia-2 bg-superficie text-tinta-3")}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Secao>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Cartao className="overflow-hidden">
          <div className="relative overflow-hidden bg-grafite p-6 text-white">
            <p className="text-xs uppercase tracking-[0.14em] text-[#8b90a6]">Pontuação</p>
            <div className="mt-2 flex items-end justify-between">
              <p className="numeros text-5xl font-semibold leading-none">{pontos}<span className="text-lg text-[#8b90a6]">/100</span></p>
              <EtiquetaVeredito v={pontos === 0 ? null : v} />
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div className="h-full rounded-full bg-azul-claro transition-[width] duration-500" style={{ width: `${pontos}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-[#8b90a6]"><span>Frio</span><span>Morno 45</span><span>Quente 70</span></div>
          </div>
          <dl className="divide-y divide-areia text-sm">
            <div className="flex justify-between px-5 py-3"><dt className="text-tinta-3">Complexidade estimada</dt><dd className="font-medium capitalize">{comp === "media" ? "Média" : comp}</dd></div>
            <div className="flex justify-between px-5 py-3"><dt className="text-tinta-3">Economia por mês</dt><dd className="numeros font-medium">{brl(eco.mensal)}</dd></div>
            <div className="flex justify-between px-5 py-3"><dt className="text-tinta-3">Seções completas</dt><dd className="numeros font-medium">{preenchidas.filter(Boolean).length}/6</dd></div>
          </dl>
        </Cartao>

        <div className="mt-4 space-y-2">
          <Botao icone={Save} onClick={salvarNoServidor} disabled={salvando} className="min-h-12 w-full">
            {salvando ? "Salvando…" : "Salvar diagnóstico"}
          </Botao>
          {erroSalvar && <p role="alert" className="text-sm text-risco">{erroSalvar}</p>}
          {salvoEm && !erroSalvar && (
            <p role="status" className="text-sm text-ok">
              Diagnóstico salvo na ficha do cliente.{" "}
              <Link href={`/leads/${salvoEm}`} className="font-medium underline underline-offset-2">Abrir ficha</Link>
            </p>
          )}
          <p className="text-xs text-tinta-3">Grava pontuação, veredito e respostas na ficha do lead. Antes disso, tudo fica só neste aparelho.</p>
        </div>

        <Cartao className="mt-4">
          <CabecalhoCartao titulo="Saídas com IA" descricao="Geradas pelo servidor a partir do checklist" />
          <div className="space-y-2 p-4">
            {[["Resumo para os sócios", Sparkles], ["Texto de proposta", FileText], ["Especificação técnica (PRD)", ListChecks]].map(([n, I]) => {
              const Icone = I as LucideIcon;
              return (
                <button key={n as string} type="button" disabled
                  className="flex min-h-11 w-full items-center gap-3 rounded-md border border-areia bg-superficie px-3 text-left text-sm text-tinta-2 disabled:cursor-not-allowed disabled:opacity-60">
                  <Icone aria-hidden className="size-4 text-azul" />{n as string}
                </button>
              );
            })}
            <p className="flex gap-2 pt-1 text-xs text-tinta-3"><ShieldAlert aria-hidden className="size-4 shrink-0" />Disponível na Fase 2, após configurar a chave da API do Claude no servidor.</p>
          </div>
        </Cartao>
      </aside>
    </div>
  );
}

function Secao({ id, n, nome, icone: Icone, descricao, children }: { id: string; n: number; nome: string; icone: LucideIcon; descricao?: string; children: React.ReactNode }) {
  return (
    <Cartao id={id} className="scroll-mt-24">
      <header className="flex items-center gap-3 border-b border-areia px-5 py-4">
        <span className="grid size-9 place-items-center rounded-md bg-azul-suave text-azul-escuro"><Icone aria-hidden className="size-[18px]" /></span>
        <div>
          <p className="numeros text-[11px] font-medium uppercase tracking-[0.14em] text-tinta-3">Seção {n} de 6</p>
          <h2 className="text-[15px] font-semibold">{nome}</h2>
        </div>
      </header>
      <div className="p-5">
        {descricao && <p className="-mt-1 mb-4 text-sm text-tinta-3">{descricao}</p>}
        {children}
      </div>
    </Cartao>
  );
}
