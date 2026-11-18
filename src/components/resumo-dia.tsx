"use client";
// Resumo do dia: faixa da semana com pílula deslizante, compromissos que deslizam entre os dias
// e cabeçalho que troca os textos com desfoque. Adaptado do "Calendar Day Card" (transitions.dev),
// mantendo durações, curvas e o modo sem movimento; as cores vêm dos tokens do painel (globals.css, .rd).
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarCheck2, FileSearch, Handshake, MapPin, Users, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as EventoPonteiro } from "react";
import { Avatar, cn } from "@/components/ui/base";
import { BotaoTexto } from "@/components/ui/botao-link";

export type DiaResumo = {
  iso: string;
  /** "seg" */
  curto: string;
  /** "Segunda-feira" */
  longo: string;
  /** "17" */
  numero: string;
  /** "17 de novembro" */
  dataLonga: string;
};

export type CompromissoResumo = {
  id: string;
  titulo: string;
  data: string;
  inicio: string;
  fim: string;
  tipo: "visita" | "proximo_passo" | "edital" | "reuniao";
  pessoas: { nome: string; cor: string; foto?: string | null }[];
  cor: string;
};

const TIPO: Record<CompromissoResumo["tipo"], { nome: string; icone: LucideIcon }> = {
  visita: { nome: "Visita", icone: MapPin },
  proximo_passo: { nome: "Próximo passo", icone: Handshake },
  edital: { nome: "Prazo de edital", icone: FileSearch },
  reuniao: { nome: "Reunião", icone: Users },
};

const MAX_POR_DIA = 4;

const msVar = (el: Element, nome: string, padrao: number) => {
  const v = parseFloat(getComputedStyle(el).getPropertyValue(nome));
  return Number.isFinite(v) ? v : padrao;
};

export function ResumoDia({ dias, hoje, compromissos }: { dias: DiaResumo[]; hoje: string; compromissos: CompromissoResumo[] }) {
  const inicial = Math.max(0, dias.findIndex((d) => d.iso === hoje));
  const [ativo, setAtivo] = useState(inicial);
  const raiz = useRef<HTMLDivElement>(null);
  const faixa = useRef<HTMLDivElement>(null);
  const pilula = useRef<HTMLSpanElement>(null);
  const abas = useRef<(HTMLButtonElement | null)[]>([]);

  const doDia = (iso: string) => compromissos.filter((c) => c.data === iso).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const dia = dias[ativo]!;
  const total = doDia(dia.iso).length;

  // Pílula: acompanha a aba ativa; sem animação na primeira medida e ao redimensionar.
  const moverPilula = useCallback(
    (animar: boolean) => {
      const p = pilula.current;
      const aba = abas.current[ativo];
      if (!p || !aba) return;
      if (!animar) p.style.transition = "none";
      p.style.transform = `translateX(${aba.offsetLeft}px)`;
      p.style.width = `${aba.offsetWidth}px`;
      if (!animar) {
        void p.offsetWidth;
        p.style.removeProperty("transition");
      }
    },
    [ativo],
  );
  const medido = useRef(false);
  useLayoutEffect(() => {
    moverPilula(medido.current);
    medido.current = true;
  }, [moverPilula]);
  useEffect(() => {
    const ajustar = () => moverPilula(false);
    window.addEventListener("resize", ajustar);
    document.fonts?.ready.then(ajustar).catch(() => {});
    const obs = typeof ResizeObserver !== "undefined" && faixa.current ? new ResizeObserver(ajustar) : null;
    if (obs && faixa.current) obs.observe(faixa.current);
    return () => {
      window.removeEventListener("resize", ajustar);
      obs?.disconnect();
    };
  }, [moverPilula]);

  const escolher = (i: number) => setAtivo(i);
  const teclado = (e: React.KeyboardEvent, i: number) => {
    let j: number | null = null;
    if (e.key === "ArrowRight") j = (i + 1) % dias.length;
    if (e.key === "ArrowLeft") j = (i - 1 + dias.length) % dias.length;
    if (e.key === "Home") j = 0;
    if (e.key === "End") j = dias.length - 1;
    if (j === null) return;
    e.preventDefault();
    abas.current[j]?.focus();
    escolher(j);
  };

  // Toque: mantém o "apertado" visível por pelo menos --press-dur, mesmo num toque rápido.
  const apertar = (e: EventoPonteiro<HTMLButtonElement>) => {
    if (e.pointerType === "mouse") return;
    const el = e.currentTarget as HTMLButtonElement & { _solta?: number };
    const t0 = performance.now();
    const minimo = msVar(raiz.current ?? el, "--press-dur", 150);
    window.clearTimeout(el._solta);
    el.classList.add("is-pressed");
    const soltar = () => {
      document.removeEventListener("pointerup", soltar, true);
      document.removeEventListener("pointercancel", soltar, true);
      el._solta = window.setTimeout(() => el.classList.remove("is-pressed"), Math.max(0, minimo - (performance.now() - t0)));
    };
    document.addEventListener("pointerup", soltar, true);
    document.addEventListener("pointercancel", soltar, true);
  };

  const semanaRotulo = `Semana de ${dias[0]!.dataLonga} a ${dias.at(-1)!.dataLonga}`;

  return (
    <div ref={raiz} className="rd flex flex-col gap-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[28px] font-medium leading-[34px] tracking-[-0.02em] text-tinta">
            <TextoSuave texto={dia.longo} />
          </h2>
          <p className="flex whitespace-pre text-xs leading-4 text-tinta-3" aria-live="polite">
            <TextoSuave texto={dia.iso === hoje ? `Hoje, ${dia.dataLonga}` : dia.dataLonga} />
            <span> · </span>
            <TextoSuave texto={String(total)} className="numeros" />
            <span> </span>
            <TextoSuave texto={total === 1 ? "compromisso" : "compromissos"} />
          </p>
        </div>
        <Link
          href="/agenda"
          aria-label="Abrir agenda"
          title="Abrir agenda"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-areia text-tinta-2 transition-colors hover:border-areia-2 hover:text-tinta"
        >
          <ArrowUpRight aria-hidden className="size-[18px]" />
        </Link>
      </header>

      <div ref={faixa} className="rd-abas" role="tablist" aria-label={semanaRotulo}>
        <span ref={pilula} className="rd-pilula" aria-hidden />
        {dias.map((d, i) => {
          const selecionado = i === ativo;
          const n = doDia(d.iso).length;
          return (
            <button
              key={d.iso}
              ref={(el) => {
                abas.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`rd-aba-${d.iso}`}
              aria-selected={selecionado}
              aria-controls={`rd-dia-${d.iso}`}
              aria-label={`${d.longo}, ${d.dataLonga}${d.iso === hoje ? " (hoje)" : ""}, ${n} ${n === 1 ? "compromisso" : "compromissos"}`}
              tabIndex={selecionado ? 0 : -1}
              onClick={() => escolher(i)}
              onKeyDown={(e) => teclado(e, i)}
              onPointerDown={apertar}
              className="rd-aba"
            >
              <span className="rd-dds">{d.curto}</span>
              <span className={cn("rd-num numeros", d.iso === hoje && "font-semibold text-azul-escuro")}>{d.numero}</span>
              <span aria-hidden className={cn("rd-marca", n > 0 && "rd-marca-cheia")} />
            </button>
          );
        })}
      </div>

      <div className="rd-paginas">
        {dias.map((d, i) => {
          const lista = doDia(d.iso);
          const visivel = i === ativo;
          return (
            <section
              key={d.iso}
              id={`rd-dia-${d.iso}`}
              role="tabpanel"
              aria-labelledby={`rd-aba-${d.iso}`}
              aria-hidden={!visivel}
              inert={!visivel}
              data-ativo={visivel}
              className="rd-pagina"
              style={{ "--rd-de-x": i < ativo ? "calc(var(--page-slide-distance) * -1)" : "var(--page-slide-distance)" } as React.CSSProperties}
            >
              {lista.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-superficie-2 px-3 py-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ok-suave text-ok">
                    <CalendarCheck2 aria-hidden className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-5 text-tinta">Dia livre</span>
                    <span className="block text-xs leading-4 text-tinta-3">Nenhum compromisso na agenda.</span>
                  </span>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {lista.slice(0, MAX_POR_DIA).map((c) => {
                    const tipo = TIPO[c.tipo];
                    return (
                      <li key={c.id} className="rd-item" style={{ "--c": c.cor } as React.CSSProperties}>
                        <span className="rd-barra" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium leading-5 text-tinta">{c.titulo}</p>
                          <p className="flex items-center gap-1 truncate text-xs leading-4 text-tinta-3">
                            <span className="numeros">
                              {c.inicio} – {c.fim}
                            </span>
                            <span aria-hidden>·</span>
                            <tipo.icone aria-hidden className="size-3 shrink-0" />
                            <span className="truncate">{tipo.nome}</span>
                          </p>
                        </div>
                        {c.pessoas.length > 0 && <GrupoAvatares pessoas={c.pessoas} />}
                      </li>
                    );
                  })}
                  {lista.length > MAX_POR_DIA && (
                    <li>
                      <BotaoTexto href="/agenda" tamanho="mini" iconeFim={ArrowRight} className="px-3">
                        e mais {lista.length - MAX_POR_DIA} na agenda
                      </BotaoTexto>
                    </li>
                  )}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Texto que troca com desfoque cruzado e largura animada ---------- */
function TextoSuave({ texto, className }: { texto: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [par, setPar] = useState<{ velho: string | null; atual: string }>({ velho: null, atual: texto });
  const largura = useRef(0);
  const timer = useRef<number | undefined>(undefined);

  // 1) O texto mudou: guarda a largura atual e monta as duas camadas (sai a velha, entra a nova).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || texto === par.atual) return;
    largura.current = el.getBoundingClientRect().width;
    window.clearTimeout(timer.current);
    el.classList.remove("trocando");
    setPar((p) => ({ velho: p.atual, atual: texto }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  // 2) Com as duas camadas no lugar: anima a largura e cruza as opacidades; no fim, volta ao texto simples.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (par.velho === null) {
      el.classList.remove("trocando");
      el.style.removeProperty("width");
      return;
    }
    const novo = el.querySelector<HTMLElement>(".novo");
    const w1 = novo?.getBoundingClientRect().width ?? 0;
    el.style.width = `${largura.current}px`;
    void el.offsetWidth;
    el.classList.add("trocando");
    el.style.width = `${w1}px`;
    const dur = Math.max(msVar(el, "--text-soft-dur", 200), msVar(el, "--text-soft-resize-dur", 240)) + 40;
    timer.current = window.setTimeout(() => setPar((p) => ({ velho: null, atual: p.atual })), dur);
  }, [par]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <span ref={ref} className={cn("rd-suave", className)}>
      {par.velho !== null && (
        <span key={`v-${par.velho}`} className="velho" aria-hidden>
          {par.velho}
        </span>
      )}
      <span key={`n-${par.atual}`} className={par.velho !== null ? "novo" : undefined}>
        {par.atual}
      </span>
    </span>
  );
}

/* ---------- Avatares que sobem no hover, com queda suave para os vizinhos ---------- */
function GrupoAvatares({ pessoas }: { pessoas: { nome: string; cor: string; foto?: string | null }[] }) {
  const raiz = useRef<HTMLDivElement>(null);

  const deslocar = (ativo: number | null, fase: "entra" | "sai") => {
    const r = raiz.current;
    if (!r) return;
    const itens = [...r.querySelectorAll<HTMLElement>(".rd-avatar")];
    const cs = getComputedStyle(r);
    const lift = msVar(r, "--avatar-lift", -4);
    const queda = msVar(r, "--avatar-falloff", 0.45);
    const escala = msVar(r, "--avatar-scale", 1.05);
    const curva =
      (fase === "sai" ? cs.getPropertyValue("--avatar-ease-out") : cs.getPropertyValue("--avatar-ease-in")).trim() ||
      "cubic-bezier(0.22, 1, 0.36, 1)";
    const desloc = itens.map((_, i) => (ativo === null ? 0 : lift * Math.pow(queda, Math.abs(i - ativo))));
    itens.forEach((el, i) => {
      el.style.transitionTimingFunction = curva;
      el.style.setProperty("--shift", `${desloc[i]!.toFixed(3)}px`);
      el.style.setProperty("--scale-active", i === ativo ? String(escala) : "1");
      el.style.setProperty("--cut-dy", `${(i < itens.length - 1 ? desloc[i + 1]! - desloc[i]! : 0).toFixed(3)}px`);
    });
  };

  const nomes = pessoas.map((p) => p.nome).join(", ");
  return (
    <div
      ref={raiz}
      role="group"
      aria-label={`Responsável: ${nomes}`}
      className="rd-avatares"
      onMouseLeave={() => deslocar(null, "sai")}
    >
      {pessoas.map((p, i) => (
        <span key={p.nome} className="rd-avatar" onMouseEnter={() => deslocar(i, "entra")}>
          <Avatar nome={p.nome} cor={p.cor} foto={p.foto} tamanho="sm" />
        </span>
      ))}
    </div>
  );
}
