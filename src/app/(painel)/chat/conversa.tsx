"use client";
// Chat interno dos sócios: lista com separador por dia, envio otimista e atualização periódica.
import { ArrowDown, MessagesSquare, RotateCcw, SendHorizontal, Trash2 } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar, Cartao, EstadoVazio, cn } from "@/components/ui/base";
import { useAviso } from "@/components/ui/toast";
import { hojeISO, hora, somarDias } from "@/lib/formato";
import { continuaBloco, partesComLinks, podeApagar, TAMANHO_MAX_MENSAGEM, type Mensagem } from "@/lib/regras/chat";
import { acaoApagarMensagem, acaoAtualizarChat, acaoEnviarMensagem } from "./acoes";

type SocioChat = { id: string; nome: string; cor: string };
type Local = Mensagem & { estado?: "enviando" | "falhou" };

const INTERVALO_MS = 4000;
const diaDe = (iso: string) => hojeISO(new Date(iso));

function rotuloDia(dia: string) {
  const hoje = hojeISO();
  if (dia === hoje) return "Hoje";
  if (dia === somarDias(hoje, -1)) return "Ontem";
  return new Date(`${dia}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export function Conversa({ iniciais, socios, socioAtualId }: { iniciais: Mensagem[]; socios: SocioChat[]; socioAtualId: string }) {
  const avisar = useAviso();
  const [mensagens, setMensagens] = useState<Local[]>(iniciais);
  const [texto, setTexto] = useState("");
  const [novasAbaixo, setNovasAbaixo] = useState(false);
  const [, setRelogio] = useState(0); // refaz a tela para esconder o "apagar" quando o prazo passa
  const lista = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const noFim = useRef(true);
  const socio = (id: string) => socios.find((s) => s.id === id);

  const irParaFim = useCallback((suave = false) => {
    const el = lista.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
    setNovasAbaixo(false);
  }, []);

  // Começa no fim da conversa; repete quando fontes e animações de entrada mudam a altura.
  useLayoutEffect(() => {
    irParaFim();
    const quadro = requestAnimationFrame(() => irParaFim());
    const tempo = setTimeout(() => noFim.current && irParaFim(), 600);
    document.fonts?.ready.then(() => noFim.current && irParaFim());
    return () => {
      cancelAnimationFrame(quadro);
      clearTimeout(tempo);
    };
  }, [irParaFim]);

  // Atualiza enquanto a aba está visível; ao voltar para a aba, atualiza na hora.
  useEffect(() => {
    let ativo = true;
    const atualizar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const servidor = await acaoAtualizarChat();
        if (!ativo) return;
        setMensagens((atuais) => {
          const pendentes = atuais.filter((m) => m.estado);
          const chegouNova = servidor.length > 0 && servidor.at(-1)!.id !== atuais.filter((m) => !m.estado).at(-1)?.id;
          if (chegouNova && !noFim.current) setNovasAbaixo(true);
          return [...servidor, ...pendentes];
        });
      } catch {
        // Sem rede: tenta de novo no próximo ciclo.
      }
    };
    const id = setInterval(atualizar, INTERVALO_MS);
    const relogio = setInterval(() => setRelogio((n) => n + 1), 30_000);
    document.addEventListener("visibilitychange", atualizar);
    return () => {
      ativo = false;
      clearInterval(id);
      clearInterval(relogio);
      document.removeEventListener("visibilitychange", atualizar);
    };
  }, []);

  // Mantém no fim quando chegam mensagens e o sócio já estava no fim.
  useEffect(() => {
    if (noFim.current) irParaFim(true);
  }, [mensagens.length, irParaFim]);

  const aoRolar = () => {
    const el = lista.current;
    if (!el) return;
    noFim.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (noFim.current) setNovasAbaixo(false);
  };

  const enviar = async (conteudo: string, idTemp = `temp-${crypto.randomUUID()}`) => {
    const limpo = conteudo.trim();
    if (!limpo) return;
    const pendente: Local = { id: idTemp, autorId: socioAtualId, texto: limpo, apagada: false, em: new Date().toISOString(), estado: "enviando" };
    noFim.current = true;
    setMensagens((m) => [...m.filter((x) => x.id !== idTemp), pendente]);
    const r = await acaoEnviarMensagem({ texto: limpo }).catch(() => ({ ok: false as const, mensagem: "Sem conexão. Tente de novo." }));
    setMensagens((m) =>
      r.ok
        ? [...m.filter((x) => x.id !== idTemp && x.id !== r.mensagem.id), r.mensagem]
        : m.map((x) => (x.id === idTemp ? { ...x, estado: "falhou" } : x)),
    );
    if (!r.ok) avisar({ tom: "risco", texto: r.mensagem });
  };

  const aoEnviar = () => {
    if (!texto.trim() || texto.length > TAMANHO_MAX_MENSAGEM) return;
    void enviar(texto);
    setTexto("");
    if (campo.current) campo.current.style.height = "auto";
    campo.current?.focus();
  };

  const apagar = async (m: Local) => {
    if (!window.confirm("Apagar esta mensagem para todos?")) return;
    const r = await acaoApagarMensagem(m.id);
    if (r.ok) setMensagens((lista) => lista.map((x) => (x.id === m.id ? { ...x, texto: "", apagada: true } : x)));
    else avisar({ tom: "risco", texto: r.mensagem ?? "Não foi possível apagar." });
  };

  const sobra = TAMANHO_MAX_MENSAGEM - texto.length;

  return (
    <Cartao className="animate-surgir flex h-[calc(100dvh-13.5rem)] min-h-[420px] flex-col overflow-hidden lg:h-[calc(100dvh-14rem)] xl:h-[calc(100dvh-10.5rem)]">
      <header className="flex items-center gap-3 border-b border-areia px-4 py-3 sm:px-6">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-azul-suave text-azul-escuro">
          <MessagesSquare aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold tracking-tight text-tinta">Chat dos sócios</h1>
          <p className="truncate text-xs text-tinta-3">Só {socios.map((s) => s.nome).join(", ").replace(/, ([^,]*)$/, " e $1")} veem esta conversa</p>
        </div>
        <div className="flex -space-x-2" aria-hidden>
          {socios.map((s) => <Avatar key={s.id} nome={s.nome} cor={s.cor} />)}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={lista}
          onScroll={aoRolar}
          role="log"
          aria-label="Mensagens"
          aria-live="polite"
          tabIndex={0}
          className="rolagem-fina h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-6"
        >
          {mensagens.length === 0 ? (
            <EstadoVazio icone={MessagesSquare} titulo="Nenhuma mensagem ainda" texto="Escreva a primeira mensagem para os outros sócios." />
          ) : (
            <ol className="mx-auto flex max-w-3xl flex-col">
              {mensagens.map((m, i) => {
                const anterior = mensagens[i - 1];
                const novoDia = !anterior || diaDe(anterior.em) !== diaDe(m.em);
                const junto = !novoDia && continuaBloco(anterior, m);
                const minha = m.autorId === socioAtualId;
                const autor = socio(m.autorId);
                return (
                  <li key={m.id} className={cn("flex flex-col", junto ? "mt-1" : "mt-4 first:mt-0")}>
                    {novoDia && (
                      <p className="mx-auto mb-4 rounded-full bg-superficie-2 px-3 py-1 text-[11px] font-medium text-tinta-3 first-letter:uppercase">
                        {rotuloDia(diaDe(m.em))}
                      </p>
                    )}
                    <div className={cn("animate-mensagem flex max-w-[88%] items-end gap-2 sm:max-w-[75%]", minha ? "flex-row-reverse self-end" : "self-start")}>
                      {!minha && <span className={cn("shrink-0", junto && "invisible")}><Avatar nome={autor?.nome ?? "?"} cor={autor?.cor} /></span>}
                      <div className={cn("min-w-0", minha && "text-right")}>
                        {!junto && !minha && <p className="mb-1 flex items-center gap-1.5 px-1 text-xs font-semibold text-tinta-2"><span aria-hidden className="size-1.5 rounded-full" style={{ background: autor?.cor }} />{autor?.nome ?? "Sócio removido"}</p>}
                        <div
                          className={cn(
                            "inline-block max-w-full rounded-[18px] px-3.5 py-2 text-left text-[15px] leading-relaxed",
                            m.apagada
                              ? "border border-dashed border-areia-2 italic text-tinta-3"
                              : minha
                                ? "rounded-br-md bg-azul text-white"
                                : "rounded-bl-md bg-superficie text-tinta ring-1 ring-inset ring-areia",
                            m.estado === "enviando" && "opacity-70",
                            m.estado === "falhou" && "bg-risco-suave! text-risco! ring-1 ring-inset ring-risco/30",
                          )}
                        >
                          {m.apagada ? (
                            "Mensagem apagada"
                          ) : (
                            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                              {partesComLinks(m.texto).map((p, k) =>
                                p.tipo === "link" ? (
                                  <a key={k} href={p.valor} target="_blank" rel="noopener noreferrer nofollow" className="underline underline-offset-2">
                                    {p.valor}
                                  </a>
                                ) : (
                                  p.valor
                                ),
                              )}
                            </p>
                          )}
                        </div>
                        <p className={cn("numeros mt-0.5 flex items-center gap-1 px-1 text-[11px] text-tinta-3", minha && "justify-end")}>
                          {m.estado === "enviando" ? "Enviando…" : m.estado === "falhou" ? "Não enviada" : hora(m.em)}
                          {m.estado === "falhou" && (
                            <button type="button" onClick={() => void enviar(m.texto, m.id)} className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 font-medium text-risco hover:bg-risco-suave">
                              <RotateCcw aria-hidden className="size-3" /> Tentar de novo
                            </button>
                          )}
                          {!m.estado && podeApagar(m, socioAtualId) && (
                            <button type="button" onClick={() => void apagar(m)} aria-label="Apagar mensagem" title="Apagar (até 15 min depois de enviar)"
                              className="grid size-9 place-items-center rounded-full text-tinta-3 hover:bg-risco-suave hover:text-risco">
                              <Trash2 aria-hidden className="size-3.5" />
                            </button>
                          )}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        {novasAbaixo && (
          <button type="button" onClick={() => irParaFim(true)}
            className="animate-entrar-modal absolute bottom-3 left-1/2 inline-flex min-h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-tinta px-4 text-sm font-medium text-offwhite shadow-flutuante">
            <ArrowDown aria-hidden className="size-4" /> Novas mensagens
          </button>
        )}
      </div>

      <div className="border-t border-areia p-3 sm:px-6">
      <form onSubmit={(e) => { e.preventDefault(); aoEnviar(); }} className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="chat-texto" className="sr-only">Mensagem</label>
          <textarea
            ref={campo}
            id="chat-texto"
            value={texto}
            rows={1}
            maxLength={TAMANHO_MAX_MENSAGEM + 200}
            placeholder="Escreva uma mensagem…"
            enterKeyHint="send"
            aria-describedby="chat-ajuda"
            onChange={(e) => {
              setTexto(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
            }}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha. Em celular (teclado virtual), Enter quebra a linha.
              const toque = window.matchMedia("(pointer: coarse)").matches;
              if (e.key === "Enter" && !e.shiftKey && !toque && !e.nativeEvent.isComposing) {
                e.preventDefault();
                aoEnviar();
              }
            }}
            className="rolagem-fina block max-h-40 min-h-11 w-full resize-none rounded-[22px] border border-areia-2 bg-superficie px-4 py-2.5 text-base leading-snug text-tinta placeholder:text-tinta-3/70 focus:border-azul focus:outline-none focus:ring-3 focus:ring-azul/20 sm:text-[15px]"
          />
        </div>
        <button
          type="submit"
          disabled={!texto.trim() || sobra < 0}
          aria-label="Enviar mensagem"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-azul text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_10px_24px_-10px_rgb(63_111_216/0.8)] transition-[background,transform,opacity] hover:bg-[#3461c9] active:scale-95 disabled:opacity-40"
        >
          <SendHorizontal aria-hidden className="size-[18px]" />
        </button>
      </form>
      <p id="chat-ajuda" className={cn("mt-1 px-2 text-[11px]", sobra < 0 ? "text-risco" : "text-tinta-3", sobra > 200 && "max-lg:hidden")}>
        {sobra < 0 ? `${-sobra} caracteres a mais que o limite.` : sobra <= 200 ? `Restam ${sobra} caracteres.` : "Enter envia · Shift + Enter quebra a linha"}
      </p>
      </div>
    </Cartao>
  );
}
