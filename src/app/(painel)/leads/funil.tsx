"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, CalendarClock, GripVertical, LayoutGrid, List, Plus, Search, UserRound } from "lucide-react";
import {
  AreaTexto,
  Avatar,
  Botao,
  Campo,
  Cartao,
  Entrada,
  EstadoVazio,
  Etiqueta,
  EtiquetaVeredito,
  Selecao,
  Tabela,
  Td,
  Th,
  Tr,
  cn,
} from "@/components/ui/base";
import { Modal } from "@/components/ui/modal";
import { useAviso } from "@/components/ui/toast";
import type { Lead, Socio } from "@/lib/demo/dados";
import { brl, dataCurta, hojeISO, relativo, somarDias } from "@/lib/formato";
import { ETAPAS, MOTIVOS_PERDA, ORIGENS, SEGMENTOS, estaParado, nomeEtapa, type EtapaId } from "@/lib/regras/funil";
import { acaoCriarLead, acaoMoverLead } from "./acoes";

const COR_ETAPA: Record<EtapaId, string> = {
  lead: "#8b90a6",
  visita: "#7fa2ff",
  proposta: "#3f6fd8",
  fechado: "#1baf7a",
  em_desenvolvimento: "#eda100",
  manutencao: "#17803d",
  perdido: "#b9381f",
};

export function Funil({
  leadsIniciais,
  socios,
  socioAtualId,
  abrirNovo,
}: {
  leadsIniciais: Lead[];
  socios: Socio[];
  socioAtualId: string;
  abrirNovo: boolean;
}) {
  const router = useRouter();
  const avisar = useAviso();
  const [, iniciar] = useTransition();
  const [leads, moverOtimista] = useOptimistic(leadsIniciais, (atual, m: { id: string; etapa: EtapaId }) =>
    atual.map((l) => (l.id === m.id ? { ...l, etapa: m.etapa, etapaDesde: new Date().toISOString() } : l)),
  );
  const [visao, setVisao] = useState<"quadro" | "lista">("quadro");
  const [busca, setBusca] = useState("");
  const [dono, setDono] = useState("todos");
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<EtapaId | null>(null);
  const [novoAberto, setNovoAberto] = useState(abrirNovo);
  const [perda, setPerda] = useState<{ id: string; nome: string } | null>(null);

  const filtrados = useMemo(
    () =>
      leads.filter(
        (l) =>
          (dono === "todos" || l.donoId === dono) &&
          (!busca || `${l.nome} ${l.segmento} ${l.cidade}`.toLowerCase().includes(busca.toLowerCase())),
      ),
    [leads, dono, busca],
  );

  function mover(id: string, etapa: EtapaId) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.etapa === etapa) return;
    if (etapa === "perdido") {
      setPerda({ id, nome: lead.nome });
      return;
    }
    iniciar(async () => {
      moverOtimista({ id, etapa });
      const r = await acaoMoverLead({ leadId: id, etapa });
      avisar(r.ok ? { tom: "ok", texto: `${lead.nome} → ${nomeEtapa(etapa)}` } : { tom: "risco", texto: r.mensagem });
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-3" />
          <label htmlFor="busca-lead" className="sr-only">Buscar lead</label>
          <Entrada id="busca-lead" placeholder="Buscar por nome, segmento ou cidade" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <label htmlFor="filtro-dono" className="sr-only">Filtrar por dono</label>
          <Selecao id="filtro-dono" value={dono} onChange={(e) => setDono(e.target.value)} className="w-auto min-w-40">
            <option value="todos">Todos os sócios</option>
            {socios.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Selecao>
          <div role="group" aria-label="Visualização" className="flex rounded-md border border-areia-2 bg-white p-0.5">
            {([["quadro", LayoutGrid, "Quadro"], ["lista", List, "Lista"]] as const).map(([v, I, n]) => (
              <button key={v} type="button" aria-pressed={visao === v} onClick={() => setVisao(v)}
                className={cn("grid size-10 place-items-center rounded-[5px] text-tinta-3", visao === v && "bg-grafite text-white")}>
                <I aria-hidden className="size-4" /><span className="sr-only">{n}</span>
              </button>
            ))}
          </div>
          <Botao icone={Plus} onClick={() => setNovoAberto(true)}>Novo lead</Botao>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <Cartao>
          <EstadoVazio icone={UserRound} titulo="Nenhum lead encontrado" texto={busca || dono !== "todos" ? "Ajuste a busca ou o filtro de sócio." : "Cadastre o primeiro lead para começar o funil."}
            acao={<Botao icone={Plus} onClick={() => setNovoAberto(true)}>Novo lead</Botao>} />
        </Cartao>
      ) : visao === "quadro" ? (
        <div className="rolagem-fina -mx-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="flex gap-3">
            {ETAPAS.map((e) => {
              const cards = filtrados.filter((l) => l.etapa === e.id);
              const total = cards.reduce((a, l) => a + l.mensalidade, 0);
              return (
                <section
                  key={e.id}
                  aria-label={`Etapa ${e.nome}`}
                  onDragOver={(ev) => { ev.preventDefault(); setSobre(e.id); }}
                  onDragLeave={() => setSobre((s) => (s === e.id ? null : s))}
                  onDrop={(ev) => { ev.preventDefault(); setSobre(null); const id = ev.dataTransfer.getData("text/plain"); if (id) mover(id, e.id); }}
                  className={cn(
                    "flex w-[272px] shrink-0 flex-col rounded-lg border bg-areia/35 transition-colors",
                    sobre === e.id ? "border-azul bg-azul-suave/70" : "border-transparent",
                  )}
                >
                  <header className="flex items-center gap-2 px-3 pb-2 pt-3">
                    <span aria-hidden className="size-2 rounded-full" style={{ background: COR_ETAPA[e.id] }} />
                    <h2 className="text-[13px] font-semibold">{e.nome}</h2>
                    <span className="numeros rounded-full bg-white px-1.5 text-xs text-tinta-3 ring-1 ring-areia">{cards.length}</span>
                    {total > 0 && <span className="numeros ml-auto text-[11px] text-tinta-3">{brl(total)}/mês</span>}
                  </header>
                  <ol className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
                    {cards.map((l) => (
                      <CardLead key={l.id} lead={l} socio={socios.find((s) => s.id === l.donoId)} arrastando={arrastando === l.id}
                        aoIniciar={() => setArrastando(l.id)} aoTerminar={() => setArrastando(null)} aoMover={(et) => mover(l.id, et)} />
                    ))}
                    {cards.length === 0 && (
                      <li className="grid flex-1 place-items-center rounded-md border border-dashed border-areia-2 px-3 py-6 text-center text-xs text-tinta-3">
                        Arraste um card para cá
                      </li>
                    )}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      ) : (
        <Cartao>
          <Tabela rotulo="Lista de leads">
            <thead>
              <tr><Th>Comércio</Th><Th>Etapa</Th><Th>Dono</Th><Th>Próximo passo</Th><Th>Diagnóstico</Th><Th className="text-right">Mensalidade</Th></tr>
            </thead>
            <tbody>
              {filtrados.map((l) => {
                const s = socios.find((x) => x.id === l.donoId);
                return (
                  <Tr key={l.id}>
                    <Td><Link className="font-medium hover:text-azul" href={`/leads/${l.id}`}>{l.nome}</Link><p className="text-xs text-tinta-3">{[l.segmento, l.cidade].filter(Boolean).join(" · ")}</p></Td>
                    <Td><span className="inline-flex items-center gap-1.5 text-[13px]"><span aria-hidden className="size-2 rounded-full" style={{ background: COR_ETAPA[l.etapa] }} />{nomeEtapa(l.etapa)}</span></Td>
                    <Td>{s && <span className="inline-flex items-center gap-2"><Avatar nome={s.nome} cor={s.cor} tamanho="sm" />{s.nome}</span>}</Td>
                    <Td><p className="text-[13px]">{l.proximoPasso}</p><p className={cn("text-xs", l.proximoPassoData < hojeISO() ? "text-risco" : "text-tinta-3")}>{dataCurta(l.proximoPassoData)} · {relativo(l.proximoPassoData)}</p></Td>
                    <Td><EtiquetaVeredito v={l.veredito} /></Td>
                    <Td className="numeros text-right">{l.mensalidade ? brl(l.mensalidade) : "—"}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabela>
        </Cartao>
      )}

      <ModalNovoLead aberto={novoAberto} aoFechar={() => { setNovoAberto(false); if (abrirNovo) router.replace("/leads", { scroll: false }); }} socios={socios} socioAtualId={socioAtualId}
        aoCriar={(nome) => { avisar({ tom: "ok", texto: `Lead criado: ${nome}` }); router.refresh(); }} />
      <ModalPerda alvo={perda} aoFechar={() => setPerda(null)} aoConfirmar={(motivo) => {
        const alvo = perda!;
        setPerda(null);
        iniciar(async () => {
          moverOtimista({ id: alvo.id, etapa: "perdido" });
          const r = await acaoMoverLead({ leadId: alvo.id, etapa: "perdido", motivoPerda: motivo });
          avisar(r.ok ? { tom: "ok", texto: `${alvo.nome} marcado como Perdido` } : { tom: "risco", texto: r.mensagem });
          router.refresh();
        });
      }} />
    </>
  );
}

function CardLead({
  lead: l,
  socio,
  arrastando,
  aoIniciar,
  aoTerminar,
  aoMover,
}: {
  lead: Lead;
  socio?: Socio;
  arrastando: boolean;
  aoIniciar: () => void;
  aoTerminar: () => void;
  aoMover: (e: EtapaId) => void;
}) {
  const hoje = hojeISO();
  const parado = estaParado(l.etapa, l.etapaDesde);
  const atrasado = l.etapa !== "perdido" && l.proximoPassoData < hoje;
  return (
    <li
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", l.id); e.dataTransfer.effectAllowed = "move"; aoIniciar(); }}
      onDragEnd={aoTerminar}
      className={cn(
        "group relative cursor-grab rounded-md border bg-white p-3 shadow-cartao transition active:cursor-grabbing",
        parado ? "border-alerta/50" : "border-areia",
        arrastando ? "rotate-1 opacity-60" : "hover:-translate-y-px hover:border-azul/40 hover:shadow-flutuante",
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical aria-hidden className="mt-0.5 size-4 shrink-0 text-areia-2 group-hover:text-tinta-3" />
        <div className="min-w-0 flex-1">
          <Link href={`/leads/${l.id}`} className="block text-[13.5px] font-semibold leading-snug hover:text-azul">
            {l.nome}
          </Link>
          <p className="mt-0.5 text-xs text-tinta-3">{[l.segmento, l.cidade].filter(Boolean).join(" · ")}</p>
        </div>
        {socio && <Avatar nome={socio.nome} cor={socio.cor} tamanho="sm" />}
      </div>

      <div className="mt-2.5 rounded-[5px] bg-offwhite px-2.5 py-2">
        <p className="text-xs leading-snug text-tinta-2">{l.proximoPasso}</p>
        <p className={cn("mt-1 inline-flex items-center gap-1 text-[11px] font-medium", atrasado ? "text-risco" : "text-tinta-3")}>
          <CalendarClock aria-hidden className="size-3" /> {dataCurta(l.proximoPassoData)} · {atrasado ? `atrasado (${relativo(l.proximoPassoData)})` : relativo(l.proximoPassoData)}
        </p>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {l.etapa === "perdido" && l.motivoPerda ? (
          <Etiqueta tom="risco">{l.motivoPerda}</Etiqueta>
        ) : (
          l.pontuacao !== null && <EtiquetaVeredito v={l.veredito} />
        )}
        {l.pontuacao !== null && <span className="numeros text-[11px] text-tinta-3">{l.pontuacao} pts</span>}
        {parado && <Etiqueta tom="alerta" icone={AlertTriangle}>Parado +7 dias</Etiqueta>}
      </div>

      {/* Mover sem arrastar: essencial no celular e para teclado */}
      <label className="sr-only" htmlFor={`mover-${l.id}`}>Mover {l.nome} para</label>
      <select
        id={`mover-${l.id}`}
        value={l.etapa}
        onChange={(e) => aoMover(e.target.value as EtapaId)}
        className="mt-2.5 min-h-9 w-full rounded-[5px] border border-areia bg-white px-2 text-xs text-tinta-2 hover:border-tinta-3"
      >
        {ETAPAS.map((e) => <option key={e.id} value={e.id}>Mover para: {e.nome}</option>)}
      </select>
    </li>
  );
}

function ModalNovoLead({
  aberto,
  aoFechar,
  socios,
  socioAtualId,
  aoCriar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  socios: Socio[];
  socioAtualId: string;
  aoCriar: (nome: string) => void;
}) {
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [salvando, iniciar] = useTransition();

  function enviar(form: FormData) {
    const dados = Object.fromEntries(form.entries());
    iniciar(async () => {
      const r = await acaoCriarLead(dados);
      if (r.ok) {
        setErros({});
        setMensagem("");
        aoFechar();
        aoCriar(String(dados.nome));
      } else {
        setErros(r.erros);
        setMensagem(r.mensagem);
      }
    });
  }

  const err = (c: string) => (erros[c] ? { "aria-invalid": true, "aria-describedby": `${c}-erro` } : {});

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Novo lead" descricao="Dono, próximo passo e data são obrigatórios." largura="lg"
      rodape={<>
        <Botao type="button" variante="secundario" onClick={aoFechar}>Cancelar</Botao>
        <Botao type="submit" form="form-novo-lead" disabled={salvando}>{salvando ? "Salvando…" : "Salvar lead"}</Botao>
      </>}>
      <form id="form-novo-lead" action={enviar} className="grid grid-cols-1 gap-4 sm:grid-cols-2" noValidate>
        {mensagem && <p role="alert" className="text-sm text-risco sm:col-span-2">{mensagem}</p>}
        <Campo rotulo="Nome do comércio" id="nome" erro={erros.nome} className="sm:col-span-2">
          <Entrada id="nome" name="nome" autoComplete="off" placeholder="Ex.: Padaria Pão do Vale" {...err("nome")} />
        </Campo>
        <Campo rotulo="Segmento" id="segmento">
          <Selecao id="segmento" name="segmento" defaultValue=""><option value="">Selecione</option>{SEGMENTOS.map((s) => <option key={s}>{s}</option>)}</Selecao>
        </Campo>
        <Campo rotulo="Cidade" id="cidade"><Entrada id="cidade" name="cidade" defaultValue="Marilândia" /></Campo>
        <Campo rotulo="Nome do contato" id="contatoNome"><Entrada id="contatoNome" name="contatoNome" /></Campo>
        <Campo rotulo="Telefone" id="contatoTelefone"><Entrada id="contatoTelefone" name="contatoTelefone" inputMode="tel" placeholder="(27) 9…" /></Campo>
        <Campo rotulo="Origem do lead" id="origem">
          <Selecao id="origem" name="origem" defaultValue=""><option value="">Selecione</option>{ORIGENS.map((s) => <option key={s}>{s}</option>)}</Selecao>
        </Campo>
        <Campo rotulo="Dono" id="donoId" erro={erros.donoId}>
          <Selecao id="donoId" name="donoId" defaultValue={socioAtualId} {...err("donoId")}>
            <option value="">Selecione</option>{socios.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </Selecao>
        </Campo>
        <Campo rotulo="Próximo passo" id="proximoPasso" erro={erros.proximoPasso} className="sm:col-span-2">
          <AreaTexto id="proximoPasso" name="proximoPasso" rows={2} placeholder="Ex.: Ligar para agendar a visita" {...err("proximoPasso")} />
        </Campo>
        <Campo rotulo="Data do próximo passo" id="proximoPassoData" erro={erros.proximoPassoData}>
          <Entrada id="proximoPassoData" name="proximoPassoData" type="date" defaultValue={somarDias(hojeISO(), 2)} {...err("proximoPassoData")} />
        </Campo>
      </form>
    </Modal>
  );
}

function ModalPerda({ alvo, aoFechar, aoConfirmar }: { alvo: { id: string; nome: string } | null; aoFechar: () => void; aoConfirmar: (m: string) => void }) {
  const [motivo, setMotivo] = useState("");
  const [outro, setOutro] = useState("");
  const [erro, setErro] = useState("");
  const final = motivo === "Outro" ? outro.trim() : motivo;
  return (
    <Modal aberto={!!alvo} aoFechar={() => { setErro(""); aoFechar(); }} titulo="Marcar como Perdido" largura="sm"
      descricao={alvo ? `Por que ${alvo.nome} não fechou? O motivo alimenta a análise de perdas.` : ""}
      rodape={<>
        <Botao variante="secundario" onClick={aoFechar}>Cancelar</Botao>
        <Botao variante="perigo" onClick={() => {
          if (final.length < 3) { setErro("Escolha ou descreva o motivo."); return; }
          setErro(""); setMotivo(""); setOutro(""); aoConfirmar(final);
        }}>Marcar como Perdido</Botao>
      </>}>
      <fieldset className="space-y-2">
        <legend className="sr-only">Motivo da perda</legend>
        {[...MOTIVOS_PERDA, "Outro"].map((m) => (
          <label key={m} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm", motivo === m ? "border-azul bg-azul-suave" : "border-areia bg-white hover:border-tinta-3")}>
            <input type="radio" name="motivo" value={m} checked={motivo === m} onChange={() => setMotivo(m)} className="size-4 accent-[#3f6fd8]" />
            {m}
          </label>
        ))}
        {motivo === "Outro" && (
          <Campo rotulo="Descreva o motivo" id="motivo-outro">
            <Entrada id="motivo-outro" value={outro} onChange={(e) => setOutro(e.target.value)} autoFocus />
          </Campo>
        )}
        {erro && <p role="alert" className="text-sm text-risco">{erro}</p>}
      </fieldset>
    </Modal>
  );
}
