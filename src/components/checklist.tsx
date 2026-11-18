"use client";
// Checklist de lembretes de um projeto. Adaptado do bloco "Checklist" enviado pelos sócios,
// com o mesmo movimento: UMA mola por linha, e dela saem o preenchimento da caixa (com o
// "passar do ponto"), o traço do visto e o risco nas palavras (os dois sem passar do ponto).
// Ao marcar o último, a lista "cai" e se empilha no fundo do cartão; desmarcar um a levanta.
//
// Diferenças em relação ao original, por ser dado real:
// - salva no banco (otimista: a tela responde na hora e desfaz se o servidor recusar);
// - a pilha não se desfaz sozinha depois de 3 s: some só quando alguém reabre um lembrete;
// - linhas de 44 px (alvo de toque mínimo do painel), largura fluida e textos em pt-BR;
// - cores dos tokens do painel (globals.css, .chk).
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useConfirmar } from "@/components/ui/confirmar";
import { useAviso } from "@/components/ui/toast";
import { MAX_LEMBRETES, MAX_TEXTO_LEMBRETE, type Lembrete } from "@/lib/regras/lembretes";
import { Check, Pencil, SlidersHorizontal, Trash2 } from "lucide-react";

/* ── uma mola, para tudo que assenta (em quadros, não em ms) ── */
const springOf = (tune: number) => ({ k: 0.08 + (tune / 100) * 0.16, d: 0.62 + (tune / 100) * 0.2 });

function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);
  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= Math.pow(d, dt);
      cur.current += vel.current * dt;
      if (Math.abs(target - cur.current) < 0.02 && Math.abs(vel.current) < 0.02) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
  }, [target, tune, instant]);
  return at;
}

const stillness = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const PAD = 14;
/** 44 px: o alvo de toque mínimo do painel (o original usava 40). */
const ROW = 44;
const BOX = 18;
const BOUNCE = 50;
/** O risco segue o visto: começa um pouco depois e termina antes. */
const LAG = 0.12;
const RUN = 0.72;

const BODY = (side: number, line: number) => Math.max(side, line);
const DROP_MS = 0.46;
const REBOUND = 8;
const FALL_EASE = ["easeIn", "easeOut", "easeIn"] as const;

/** A inclinação vem do quanto uma tira passa da de baixo; satura antes de 6°. */
const MAX_LEAN = 6;
const REACH = 40;
const leanOf = (over: number) => MAX_LEAN * (1 - Math.exp(-over / REACH));
const DRIFT = [-5, 4, -2, 5, -3];
const sin = (deg: number) => Math.sin((deg * Math.PI) / 180);
/** Folga entre duas tiras inclinadas, medida onde há texto (não no fim da linha). */
const gapFor = (leans: number[], runs: number[], mid: number) =>
  1 +
  Math.max(
    0,
    ...leans.slice(1).map((below, i) => {
      const ink = Math.max(runs[i] ?? mid, runs[i + 1] ?? mid);
      return Math.max(0, (ink - mid) * (sin(leans[i]!) - sin(below)));
    }),
  );

type Item = Pick<Lembrete, "id" | "texto" | "feito">;

type Resposta = { ok: true; id?: string } | { ok: false; mensagem: string };

/** O que o checklist faz no servidor. Cada tela liga as suas ações (projeto, aba Lembretes…). */
export type AcoesChecklist = {
  criar: (texto: string) => Promise<Resposta>;
  marcar: (id: string, feito: boolean) => Promise<Resposta>;
  editar: (id: string, texto: string) => Promise<Resposta>;
  excluir: (id: string) => Promise<Resposta>;
};

export function Checklist({
  nome,
  iniciais,
  acoes,
  aoMudar,
  max = MAX_LEMBRETES,
  detalhes,
  aoAbrirDetalhes,
  placeholder = "Novo lembrete",
  rotuloNovo = "Adicionar lembrete",
}: {
  /** Nome do grupo (projeto, assunto…), usado nos rótulos e na confirmação de exclusão. */
  nome: string;
  iniciais: Item[];
  acoes: AcoesChecklist;
  /** Avisa quem está fora (ex.: o medidor do cartão) a cada mudança. */
  aoMudar?: (itens: Item[]) => void;
  max?: number;
  /** Informação extra à direita de cada linha (prazo, responsável…), por id. */
  detalhes?: Record<string, ReactNode>;
  /** Quando presente, o modo de edição ganha o botão "Detalhes" (prazo, responsável, vínculo…). */
  aoAbrirDetalhes?: (id: string) => void;
  placeholder?: string;
  rotuloNovo?: string;
}) {
  const projetoNome = nome;
  const avisar = useAviso();
  const [items, setItemsBruto] = useState<Item[]>(iniciais);
  const setItems = useCallback(
    (f: (v: Item[]) => Item[]) =>
      setItemsBruto((v) => {
        const n = f(v);
        queueMicrotask(() => aoMudar?.(n));
        return n;
      }),
    [aoMudar],
  );
  const [adding, setAdding] = useState(false);
  /** Lembrete em edição (lápis): o texto vira campo, com Excluir ao lado. */
  const [editando, setEditando] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [runs, setRuns] = useState<number[]>([]);
  const [line, setLine] = useState(20);
  const measure = useCallback((i: number, px: number, tall: number) => {
    setRuns((v) => (v[i] === px ? v : Object.assign([...v], { [i]: px })));
    setLine((v) => (v === tall ? v : tall));
  }, []);

  // Largura real do cartão (fluida), para a folga entre tiras inclinadas.
  const caixa = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(300);
  useLayoutEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => setLargura(el.clientWidth);
    medir();
    const obs = new ResizeObserver(medir);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const [still, setStill] = useState(false);
  useEffect(() => setStill(stillness()), []);

  const side = BOX;
  const fell = items.length > 0 && items.every((t) => t.feito);
  const spare = items.length < max;

  const slack = (ROW - side) / 2;
  const padV = Math.max(0, PAD - slack);
  const body = BODY(side, line);
  const inset = (ROW - body) / 2;
  const slots = items.length + (spare ? 1 : 0);
  const floor = padV + ROW * slots;

  const leans = items.map(() => 0);
  for (let i = items.length - 2; i >= 0; i--) {
    const over = Math.max(0, (runs[i] ?? 0) - (runs[i + 1] ?? 0));
    leans[i] = clamp(leans[i + 1]! + leanOf(over), 0, MAX_LEAN);
  }
  const mid = (largura - PAD * 2) / 2;
  const touch = gapFor(leans, runs, mid);
  const seat = floor - inset - body;
  const restTop = (i: number) => padV + i * ROW;
  const pileTop = (i: number) => seat - (items.length - 1 - i) * (body + touch);
  const drops = items.map((_, i) => Math.max(0, pileTop(i) - restTop(i)));
  const longest = Math.max(...drops, 1);

  const alternar = (i: number) => {
    const alvo = items[i];
    if (!alvo || alvo.id.startsWith("tmp-")) return;
    const feito = !alvo.feito;
    setItems((v) => v.map((t, k) => (k === i ? { ...t, feito } : t)));
    acoes.marcar(alvo.id, feito).then((r) => {
      if (r.ok) return;
      setItems((v) => v.map((t) => (t.id === alvo.id ? { ...t, feito: !feito } : t)));
      avisar({ tom: "risco", texto: r.mensagem });
    });
  };

  const salvarEdicao = (id: string, novo: string) => {
    setEditando(null);
    const texto = novo.trim().slice(0, MAX_TEXTO_LEMBRETE);
    const antes = items.find((t) => t.id === id);
    if (!antes || texto.length < 2 || texto === antes.texto) return;
    setItems((v) => v.map((t) => (t.id === id ? { ...t, texto } : t)));
    acoes.editar(id, texto).then((r) => {
      if (r.ok) return;
      setItems((v) => v.map((t) => (t.id === id ? { ...t, texto: antes.texto } : t)));
      avisar({ tom: "risco", texto: r.mensagem });
    });
  };

  const confirmar = useConfirmar();
  const excluir = async (id: string) => {
    const alvo = items.find((t) => t.id === id);
    if (!alvo) return;
    setEditando(null);
    const ok = await confirmar({
      titulo: "Excluir lembrete?",
      descricao: (
        <>
          <strong className="font-medium text-tinta">{alvo.texto}</strong> sai de {projetoNome}. Não dá para desfazer.
        </>
      ),
      rotulo: "Excluir lembrete",
      pendente: "Excluindo…",
      acao: async () => {
        const r = await acoes.excluir(id);
        if (!r.ok) throw new Error(r.mensagem);
      },
    });
    if (!ok) return;
    setItems((v) => v.filter((t) => t.id !== id));
    avisar({ tom: "ok", texto: "Lembrete excluído" });
  };

  const add = () => {
    const texto = draft.trim().slice(0, MAX_TEXTO_LEMBRETE);
    setAdding(false);
    setDraft("");
    if (texto.length < 2 || items.length >= max) return;
    const tmp = `tmp-${Date.now()}`;
    setItems((v) => [...v, { id: tmp, texto, feito: false }]);
    acoes.criar(texto).then((r) => {
      if (r.ok && r.id) return setItems((v) => v.map((t) => (t.id === tmp ? { ...t, id: r.id! } : t)));
      setItems((v) => v.filter((t) => t.id !== tmp));
      avisar({ tom: "risco", texto: r.ok ? "Não foi possível salvar o lembrete." : r.mensagem });
    });
  };

  return (
    <div
      ref={caixa}
      className="chk"
      role="group"
      aria-label={`Lembretes de ${projetoNome}`}
      style={{ height: padV * 2 + ROW * slots, padding: `${padV}px ${PAD}px` }}
    >
      <AnimatePresence initial={false}>
        {items.map((task, i) => (
          <Row
            key={task.id}
            label={task.texto}
            on={task.feito}
            side={side}
            bounce={BOUNCE}
            still={still}
            fell={fell}
            drop={drops[i]!}
            secs={DROP_MS * Math.sqrt(drops[i]! / longest)}
            inset={inset}
            drift={DRIFT[i % DRIFT.length]!}
            tilt={leans[i]!}
            index={i}
            onRun={measure}
            layer={fell ? items.length - i : undefined}
            onToggle={() => alternar(i)}
            editando={editando === task.id}
            podeEditar={!task.id.startsWith("tmp-")}
            onEditar={() => setEditando(task.id)}
            onSalvar={(t) => salvarEdicao(task.id, t)}
            onCancelar={() => setEditando(null)}
            onExcluir={() => excluir(task.id)}
            onDetalhes={aoAbrirDetalhes ? () => {
              setEditando(null);
              aoAbrirDetalhes(task.id);
            } : undefined}
            detalhe={detalhes?.[task.id]}
          />
        ))}
      </AnimatePresence>

      {spare && (
        <div className="chk-add" data-hide={fell || undefined} style={{ height: ROW }}>
          <span className="chk-ghost" aria-hidden="true" style={{ width: side, height: side, borderRadius: side * 0.32 }} />
          {adding ? (
            <input
              className="chk-field"
              autoFocus
              value={draft}
              placeholder={placeholder}
              aria-label={`${placeholder} em ${projetoNome}`}
              maxLength={MAX_TEXTO_LEMBRETE}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setAdding(false);
                  setDraft("");
                }
              }}
              onBlur={add}
            />
          ) : (
            <button type="button" className="chk-new" onClick={() => setAdding(true)} tabIndex={fell ? -1 : 0}>
              {rotuloNovo}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  on,
  side,
  bounce,
  still,
  fell,
  drop,
  secs,
  inset,
  drift,
  tilt,
  layer,
  index,
  onRun,
  onToggle,
  editando,
  podeEditar,
  onEditar,
  onSalvar,
  onCancelar,
  onExcluir,
  detalhe,
  onDetalhes,
}: {
  detalhe?: ReactNode;
  onDetalhes?: () => void;
  editando: boolean;
  podeEditar: boolean;
  onEditar: () => void;
  onSalvar: (texto: string) => void;
  onCancelar: () => void;
  onExcluir: () => void;
  label: string;
  on: boolean;
  side: number;
  bounce: number;
  still: boolean;
  fell: boolean;
  drop: number;
  secs: number;
  inset: number;
  drift: number;
  tilt: number;
  layer?: number;
  index: number;
  onRun: (i: number, px: number, tall: number) => void;
  onToggle: () => void;
}) {
  const say = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    const el = say.current;
    if (el) onRun(index, el.offsetLeft + el.offsetWidth, el.offsetHeight);
  }, [label, side, index, onRun]);

  const t = useSpring(on ? 1 : 0, clamp(bounce, 0, 100), still);
  const held = clamp(t, 0, 1);
  const cut = clamp((held - LAG) / RUN, 0, 1);

  const run = still ? 0 : secs;
  const up = Math.min(REBOUND, drop * 0.22);
  const land = { duration: run, times: [0, 0.66, 0.84, 1], ease: [...FALL_EASE] };
  const lean = { duration: run, ease: "easeIn" as const };
  const [rascunho, setRascunho] = useState(label);
  // Enter e o blur que vem logo depois não podem salvar duas vezes.
  const encerrado = useRef(false);
  useEffect(() => {
    if (editando) {
      setRascunho(label);
      encerrado.current = false;
    }
  }, [editando, label]);
  const fechar = (salvar: boolean) => {
    if (encerrado.current) return;
    encerrado.current = true;
    if (salvar) onSalvar(rascunho);
    else onCancelar();
  };

  return (
    <motion.div
      className="chk-row"
      data-fell={fell || undefined}
      data-editando={editando || undefined}
      style={{ height: ROW, zIndex: layer, "--slip": `${inset}px` } as React.CSSProperties}
      initial={false}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      animate={fell ? { y: [0, drop, drop - up, drop], x: drift, rotate: tilt } : { y: 0, x: 0, rotate: 0 }}
      transition={fell ? { y: land, x: lean, rotate: lean } : { type: "spring", stiffness: 380, damping: 34, mass: 0.9 }}
    >
      <button type="button" className="chk-alvo" role="checkbox" aria-checked={on} onClick={onToggle} disabled={editando} tabIndex={editando ? -1 : 0}>
        <span className="chk-box" style={{ width: side, height: side, borderRadius: side * 0.32 }}>
          <span className="chk-fill" style={{ borderRadius: side * 0.32, transform: `scale(${t.toFixed(4)})` }} />
          <svg className="chk-tick" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 12.4 L10.3 16.7 L18 7.6" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - held} />
          </svg>
        </span>
        {!editando && (
          <span className="chk-say" ref={say}>
            <span className="chk-word" style={{ opacity: mix(1, 0.42, held) }}>
              {label}
            </span>
            <span className="chk-rule" aria-hidden="true" style={{ transform: `scaleX(${cut.toFixed(4)})` }} />
          </span>
        )}
        {!editando && detalhe && (
          <span className="chk-meta" style={{ opacity: mix(1, 0.55, held) }}>
            {detalhe}
          </span>
        )}
      </button>
      {editando ? (
        <>
          <input
            className="chk-field chk-editar-campo"
            autoFocus
            value={rascunho}
            maxLength={MAX_TEXTO_LEMBRETE}
            aria-label={`Editar lembrete: ${label}`}
            onChange={(e) => setRascunho(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                fechar(true);
              }
              if (e.key === "Escape") {
                e.stopPropagation();
                fechar(false);
              }
            }}
            onBlur={() => fechar(true)}
          />
          {onDetalhes && (
            <button
              type="button"
              className="chk-acao"
              aria-label={`Prazo, responsável e vínculo: ${label}`}
              title="Prazo, responsável e vínculo"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                encerrado.current = true;
                onDetalhes();
              }}
            >
              <SlidersHorizontal aria-hidden className="size-4" />
            </button>
          )}
          <button
            type="button"
            className="chk-acao chk-acao-perigo"
            aria-label={`Excluir lembrete: ${label}`}
            title="Excluir"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              encerrado.current = true;
              onExcluir();
            }}
          >
            <Trash2 aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            className="chk-acao"
            aria-label="Concluir edição"
            title="Concluir"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => fechar(true)}
          >
            <Check aria-hidden className="size-4" />
          </button>
        </>
      ) : (
        !fell &&
        podeEditar && (
          <button type="button" className="chk-acao chk-acao-discreta" aria-label={`Editar ou excluir: ${label}`} title="Editar ou excluir" onClick={onEditar}>
            <Pencil aria-hidden className="size-3.5" />
          </button>
        )
      )}
    </motion.div>
  );
}
