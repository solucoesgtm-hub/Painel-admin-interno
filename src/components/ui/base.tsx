// Componentes base do GTM Hub. Todas as telas usam estes blocos.
import clsx, { type ClassValue } from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  Clock3,
  Flame,
  Info,
  Snowflake,
  ThermometerSun,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { iniciais } from "@/lib/formato";

export const cn = (...v: ClassValue[]) => clsx(v);

/* ---------------- Botão ---------------- */
type Variante = "primario" | "secundario" | "fantasma" | "perigo";
const estiloBotao: Record<Variante, string> = {
  primario: "bg-azul text-white hover:bg-[#4b7be6] shadow-[inset_0_1px_0_rgb(255_255_255/0.22),0_10px_30px_-10px_rgb(63_111_216/0.75)]",
  secundario: "bg-white/[0.04] text-tinta border border-areia-2 hover:border-white/25 hover:bg-white/[0.08]",
  fantasma: "text-tinta-2 hover:bg-white/[0.06] hover:text-tinta",
  perigo: "bg-[#d9473a] text-white hover:bg-[#e85a4c]",
};
const baseBotao =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[background,border,color,transform] active:translate-y-px disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

export function Botao({
  variante = "primario",
  className,
  icone: Icone,
  children,
  ...p
}: ComponentProps<"button"> & { variante?: Variante; icone?: LucideIcon }) {
  return (
    <button className={cn(baseBotao, estiloBotao[variante], className)} {...p}>
      {Icone && <Icone aria-hidden className="size-4 shrink-0" strokeWidth={2} />}
      {children}
    </button>
  );
}

export function BotaoLink({
  variante = "secundario",
  className,
  icone: Icone,
  children,
  ...p
}: ComponentProps<typeof Link> & { variante?: Variante; icone?: LucideIcon }) {
  return (
    <Link className={cn(baseBotao, estiloBotao[variante], className)} {...p}>
      {Icone && <Icone aria-hidden className="size-4 shrink-0" />}
      {children}
    </Link>
  );
}

/* ---------------- Campos ---------------- */
export function Campo({
  rotulo,
  id,
  erro,
  ajuda,
  children,
  className,
}: {
  rotulo: string;
  id: string;
  erro?: string;
  ajuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-medium text-tinta-2">
        {rotulo}
      </label>
      {children}
      {erro ? (
        <p id={`${id}-erro`} className="flex items-center gap-1 text-xs text-risco" role="alert">
          <AlertTriangle aria-hidden className="size-3.5" /> {erro}
        </p>
      ) : ajuda ? (
        <p className="text-xs text-tinta-3">{ajuda}</p>
      ) : null}
    </div>
  );
}

const baseEntrada =
  "min-h-11 w-full rounded-md border border-areia-2 bg-superficie px-3.5 text-sm text-tinta placeholder:text-tinta-3/70 transition-colors hover:border-white/25 focus:border-azul-claro focus:outline-none focus:ring-3 focus:ring-azul/30 aria-[invalid=true]:border-risco";

export const Entrada = ({ className, ...p }: ComponentProps<"input">) => (
  <input className={cn(baseEntrada, className)} {...p} />
);
export const Selecao = ({ className, ...p }: ComponentProps<"select">) => (
  <select className={cn(baseEntrada, "pr-8", className)} {...p} />
);
export const AreaTexto = ({ className, ...p }: ComponentProps<"textarea">) => (
  <textarea className={cn(baseEntrada, "py-2.5 leading-relaxed", className)} {...p} />
);

/* ---------------- Cartão ---------------- */
export function Cartao({ className, children, ...p }: ComponentProps<"section">) {
  return (
    <section className={cn("vidro relative rounded-xl border border-areia shadow-cartao", className)} {...p}>
      {children}
    </section>
  );
}

export function CabecalhoCartao({
  titulo,
  descricao,
  acao,
  className,
}: {
  titulo: string;
  descricao?: ReactNode;
  acao?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-3 border-b border-areia px-5 py-4 sm:px-6", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-tinta">{titulo}</h2>
        {descricao && <p className="mt-0.5 text-[13px] text-tinta-3">{descricao}</p>}
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </header>
  );
}

/* ---------------- Métrica (cartão de número) ---------------- */
export function Metrica({
  rotulo,
  valor,
  detalhe,
  icone: Icone,
  tom = "neutro",
  className,
  children,
}: {
  rotulo: string;
  valor: ReactNode;
  detalhe?: ReactNode;
  icone?: LucideIcon;
  tom?: "neutro" | "azul" | "alerta" | "risco" | "ok";
  className?: string;
  children?: ReactNode;
}) {
  const tons = {
    neutro: "bg-white/[0.06] text-tinta-2",
    azul: "bg-azul-suave text-azul-claro",
    alerta: "bg-alerta-suave text-alerta",
    risco: "bg-risco-suave text-risco",
    ok: "bg-ok-suave text-ok",
  };
  return (
    <Cartao className={cn("flex flex-col gap-4 overflow-hidden p-5 sm:p-6", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-tinta-3">{rotulo}</p>
        {Icone && (
          <span className={cn("grid size-9 place-items-center rounded-full", tons[tom])}>
            <Icone aria-hidden className="size-4" />
          </span>
        )}
      </div>
      <p className="numeros text-[32px] font-semibold leading-none tracking-[-0.03em] text-white sm:text-[38px]">{valor}</p>
      {detalhe && <div className="text-[13px] text-tinta-3">{detalhe}</div>}
      {children}
    </Cartao>
  );
}

/* ---------------- Etiqueta de situação (cor + ícone + texto, nunca só cor) ---------------- */
export type Tom = "ok" | "alerta" | "risco" | "info" | "neutro";
const tomEtiqueta: Record<Tom, string> = {
  ok: "bg-ok-suave text-ok ring-ok/20",
  alerta: "bg-alerta-suave text-alerta ring-alerta/25",
  risco: "bg-risco-suave text-risco ring-risco/20",
  info: "bg-info-suave text-info ring-info/20",
  neutro: "bg-neutro-suave text-neutro ring-neutro/20",
};
const iconeTom: Record<Tom, LucideIcon> = {
  ok: CheckCircle2,
  alerta: Clock3,
  risco: XCircle,
  info: Info,
  neutro: CircleDashed,
};

export function Etiqueta({
  tom = "neutro",
  icone,
  children,
  className,
}: {
  tom?: Tom;
  icone?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  const Icone = icone ?? iconeTom[tom];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tomEtiqueta[tom],
        className,
      )}
    >
      <Icone aria-hidden className="size-3.5" strokeWidth={2.25} />
      {children}
    </span>
  );
}

export function EtiquetaVeredito({ v }: { v: "quente" | "morno" | "frio" | null }) {
  if (!v) return <Etiqueta tom="neutro" icone={CircleSlash}>Sem diagnóstico</Etiqueta>;
  if (v === "quente") return <Etiqueta tom="risco" icone={Flame}>Quente</Etiqueta>;
  if (v === "morno") return <Etiqueta tom="alerta" icone={ThermometerSun}>Morno</Etiqueta>;
  return <Etiqueta tom="info" icone={Snowflake}>Frio</Etiqueta>;
}

/* ---------------- Avatar ---------------- */
export function Avatar({ nome, cor, tamanho = "md" }: { nome: string; cor?: string; tamanho?: "sm" | "md" | "lg" }) {
  const t = { sm: "size-6 text-[10px]", md: "size-8 text-xs", lg: "size-12 text-base" }[tamanho];
  return (
    <span
      title={nome}
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white ring-2 ring-offwhite", t)}
      style={{ background: cor ?? "#2a3046" }}
    >
      {iniciais(nome)}
    </span>
  );
}

/* ---------------- Tabela ---------------- */
export function Tabela({ children, className, rotulo }: { children: ReactNode; className?: string; rotulo: string }) {
  return (
    <div className={cn("rolagem-fina overflow-x-auto", className)}>
      <table aria-label={rotulo} className="w-full min-w-[640px] border-collapse text-left text-sm">
        {children}
      </table>
    </div>
  );
}
export const Th = ({ className, ...p }: ComponentProps<"th">) => (
  <th
    scope="col"
    className={cn(
      "border-b border-areia bg-white/[0.02] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.12em] text-tinta-3 first:pl-6 last:pr-6",
      className,
    )}
    {...p}
  />
);
export const Td = ({ className, ...p }: ComponentProps<"td">) => (
  <td className={cn("border-b border-areia px-4 py-3.5 align-middle text-tinta first:pl-6 last:pr-6", className)} {...p} />
);
export const Tr = ({ className, ...p }: ComponentProps<"tr">) => (
  <tr className={cn("transition-colors last:[&>td]:border-0 hover:bg-white/[0.03]", className)} {...p} />
);

/* ---------------- Estados ---------------- */
export function EstadoVazio({
  icone: Icone = CircleDashed,
  titulo,
  texto,
  acao,
}: {
  icone?: LucideIcon;
  titulo: string;
  texto: string;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full border border-dashed border-areia-2 bg-white/[0.03] text-tinta-3">
        <Icone aria-hidden className="size-5" />
      </span>
      <div>
        <p className="font-medium text-tinta">{titulo}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-tinta-3">{texto}</p>
      </div>
      {acao}
    </div>
  );
}

export function EstadoErro({ titulo = "Não foi possível carregar", texto, acao }: { titulo?: string; texto: string; acao?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-risco-suave text-risco">
        <AlertTriangle aria-hidden className="size-5" />
      </span>
      <div>
        <p className="font-medium text-tinta">{titulo}</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-tinta-3">{texto}</p>
      </div>
      {acao}
    </div>
  );
}

export function Esqueleto({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-white/[0.06]", className)} />;
}

/* ---------------- Aviso em linha ---------------- */
export function Aviso({
  tom = "info",
  titulo,
  children,
  className,
}: {
  tom?: Tom;
  titulo?: string;
  children: ReactNode;
  className?: string;
}) {
  const Icone = tom === "risco" || tom === "alerta" ? AlertTriangle : Info;
  return (
    <div role="note" className={cn("flex gap-3 rounded-md px-4 py-3 text-sm ring-1 ring-inset", tomEtiqueta[tom], className)}>
      <Icone aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="text-tinta-2">
        {titulo && <p className="font-medium text-tinta">{titulo}</p>}
        {children}
      </div>
    </div>
  );
}

/* ---------------- Cabeçalho de página ---------------- */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
  sobretitulo,
}: {
  titulo: string;
  descricao?: ReactNode;
  acoes?: ReactNode;
  sobretitulo?: string;
}) {
  return (
    <header className="animate-surgir flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {sobretitulo && (
          <p className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.18em] text-azul-claro">
            <span aria-hidden className="h-px w-6 bg-azul-claro/60" />
            {sobretitulo}
          </p>
        )}
        <h1 className="text-[32px] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-[46px]">{titulo}</h1>
        {descricao && <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-tinta-3">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </header>
  );
}

/* ---------------- Barra de progresso (medidor) ---------------- */
export function Medidor({
  valor,
  rotulo,
  tom = "azul",
  marca,
}: {
  valor: number; // 0 a 1
  rotulo: string;
  tom?: "azul" | "alerta" | "risco" | "ok";
  marca?: number; // posição de um marcador (ex.: 0.8)
}) {
  const cor = {
    azul: "bg-gradient-to-r from-azul to-azul-claro",
    alerta: "bg-alerta",
    risco: "bg-risco",
    ok: "bg-ok",
  }[tom];
  const v = Math.max(0, Math.min(1, valor));
  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="relative h-2 w-full overflow-visible rounded-full bg-white/[0.08]"
    >
      <div className={cn("h-full rounded-full transition-[width] duration-700", cor)} style={{ width: `${v * 100}%` }} />
      {marca !== undefined && (
        <span aria-hidden className="absolute -top-1 h-4 w-0.5 rounded bg-white/60" style={{ left: `${marca * 100}%` }} />
      )}
    </div>
  );
}
