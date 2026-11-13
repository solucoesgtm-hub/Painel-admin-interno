"use client";
// Gráficos do Hub (Recharts). Paleta validada para daltonismo; marcas finas,
// grade discreta, dica ao passar o mouse e rótulos diretos quando ajudam.
import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import { brl, brlCurto, num } from "@/lib/formato";

// Validadas no fundo claro: daltonismo (CVD) e visão normal; tons claros levam rótulo direto.
export const SERIES = ["var(--c-serie-1)", "var(--c-serie-2)", "var(--c-serie-3)", "var(--c-serie-4)"];
const TINTA_3 = "var(--c-tinta-3)";
const GRADE = "var(--c-areia)";

type Formato = "brl" | "num" | "dias" | "pct";
const fmt = (f: Formato, v: number) =>
  f === "brl" ? brl(v) : f === "dias" ? `${num(v)} dias` : f === "pct" ? `${Math.round(v)}%` : num(v);
const fmtEixo = (f: Formato, v: number) => (f === "brl" ? brlCurto(v) : f === "pct" ? `${v}%` : num(v));

function Dica({ active, payload, label, formato }: TooltipContentProps<number, string> & { formato: Formato }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="vidro-forte rounded-2xl px-3.5 py-2.5 text-xs">
      <p className="mb-1 font-medium text-tinta">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-tinta-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="numeros font-medium text-tinta">{fmt(formato, Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

const eixo = { fontSize: 12, fill: TINTA_3, fontFamily: "var(--font-urbanist)" };

/** Barras verticais de uma ou mais séries (mesma escala). */
export function GraficoColunas({
  dados,
  x,
  series,
  formato = "num",
  altura = 260,
  rotuloTopo = false,
  destaqueUltimo = false,
}: {
  dados: Record<string, string | number>[];
  x: string;
  series: { chave: string; nome: string; cor?: string }[];
  formato?: Formato;
  altura?: number;
  rotuloTopo?: boolean;
  destaqueUltimo?: boolean;
}) {
  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: rotuloTopo ? 22 : 8, right: 4, left: 0, bottom: 0 }} barGap={2} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke={GRADE} strokeDasharray="0" />
          <XAxis dataKey={x} tickLine={false} axisLine={{ stroke: GRADE }} tick={eixo} />
          <YAxis tickLine={false} axisLine={false} tick={eixo} width={formato === "brl" ? 64 : 36} tickFormatter={(v) => fmtEixo(formato, v)} />
          <Tooltip cursor={{ fill: "rgb(127 162 255 / 0.1)" }} content={(p) => <Dica {...(p as TooltipContentProps<number, string>)} formato={formato} />} />
          {series.length > 1 && (
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: TINTA_3, paddingBottom: 8 }}
            />
          )}
          {series.map((s, i) => (
            <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor ?? SERIES[i]} radius={[4, 4, 0, 0]} maxBarSize={36}>
              {destaqueUltimo && series.length === 1 &&
                dados.map((_, j) => <Cell key={j} fill={j === dados.length - 1 ? "var(--c-serie-1)" : "var(--c-serie-suave)"} />)}
              {rotuloTopo && (
                <LabelList dataKey={s.chave} position="top" formatter={(v) => fmtEixo(formato, Number(v))} style={{ ...eixo, fill: "var(--c-tinta-2)", fontSize: 11 }} />
              )}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontais com rótulo direto do valor — boa para categorias com nomes longos. */
export function GraficoBarrasH({
  dados,
  rotulo,
  valor,
  nome,
  formato = "num",
  cor = SERIES[0],
  larguraRotulo = 150,
}: {
  dados: Record<string, string | number>[];
  rotulo: string;
  valor: string;
  nome: string;
  formato?: Formato;
  cor?: string;
  larguraRotulo?: number;
}) {
  const altura = dados.length * 40 + 16;
  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap="30%">
          <XAxis type="number" hide />
          <YAxis type="category" dataKey={rotulo} tickLine={false} axisLine={false} tick={eixo} width={larguraRotulo} />
          <Tooltip cursor={{ fill: "rgb(127 162 255 / 0.1)" }} content={(p) => <Dica {...(p as TooltipContentProps<number, string>)} formato={formato} />} />
          <Bar dataKey={valor} name={nome} fill={cor} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList dataKey={valor} position="right" formatter={(v) => fmt(formato, Number(v))} style={{ ...eixo, fill: "var(--c-tinta)", fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Área com gradiente para uma série principal e linha tracejada para a comparação, na mesma escala. */
export function GraficoArea({
  dados,
  x,
  principal,
  comparacao,
  formato = "brl",
  altura = 240,
}: {
  dados: Record<string, string | number>[];
  x: string;
  principal: { chave: string; nome: string };
  comparacao?: { chave: string; nome: string };
  formato?: Formato;
  altura?: number;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES[0]} stopOpacity={0.32} />
              <stop offset="100%" stopColor={SERIES[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRADE} />
          <XAxis dataKey={x} tickLine={false} axisLine={false} tick={eixo} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={eixo} width={formato === "brl" ? 64 : 36} tickFormatter={(v) => fmtEixo(formato, v)} />
          <Tooltip
            cursor={{ stroke: "var(--c-serie-1)", strokeWidth: 1, strokeDasharray: "3 3" }}
            content={(p) => <Dica {...(p as TooltipContentProps<number, string>)} formato={formato} />}
          />
          {comparacao && (
            <Area type="monotone" dataKey={comparacao.chave} name={comparacao.nome} stroke={SERIES[1]} strokeWidth={2}
              strokeDasharray="5 5" fill="none" dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--c-offwhite)" }} />
          )}
          <Area type="monotone" dataKey={principal.chave} name={principal.nome} stroke={SERIES[0]} strokeWidth={2.5}
            fill={`url(#area-${id})`} dot={false} activeDot={{ r: 6, strokeWidth: 2, stroke: "var(--c-offwhite)" }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Abas em cápsula (ex.: 3, 6, 12 meses). */
export function AbasPeriodo<T extends string>({
  opcoes,
  valor,
  aoMudar,
  rotulo,
}: {
  opcoes: { id: T; nome: string }[];
  valor: T;
  aoMudar: (v: T) => void;
  rotulo: string;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex rounded-full bg-superficie-2 p-1 ring-1 ring-inset ring-areia">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          onClick={() => aoMudar(o.id)}
          className={
            "min-h-9 rounded-full px-3.5 text-[13px] font-medium transition-[background,color,box-shadow] duration-200 " +
            (valor === o.id ? "bg-tinta text-offwhite shadow-[0_6px_16px_-8px_rgb(18_21_31/0.6)]" : "text-tinta-3 hover:text-tinta")
          }
        >
          {o.nome}
        </button>
      ))}
    </div>
  );
}

const PERIODOS = [
  { id: "3", nome: "3 meses" },
  { id: "6", nome: "6 meses" },
  { id: "12", nome: "12 meses" },
] as const;
type Periodo = (typeof PERIODOS)[number]["id"];

/** Cartão de entradas x saídas com escolha de período, total do período e variação. */
export function PainelEntradas({
  dados,
  titulo = "Entradas e saídas",
  inicial = "6",
}: {
  dados: { mes: string; entradas: number; saidas: number }[];
  titulo?: string;
  inicial?: Periodo;
}) {
  const [periodo, setPeriodo] = useState<Periodo>(inicial);
  const corte = dados.slice(-Number(periodo));
  const total = corte.reduce((a, d) => a + d.entradas, 0);
  const primeiro = corte[0]?.entradas ?? 0;
  const ultimo = corte.at(-1)?.entradas ?? 0;
  const crescimento = primeiro ? (ultimo - primeiro) / primeiro : 0;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-tinta">{titulo}</h2>
          <p className="mt-1 text-[13px] text-tinta-3">
            <span className="numeros font-semibold text-tinta">{brl(total)}</span> de entradas no período ·{" "}
            <span className={crescimento >= 0 ? "text-ok" : "text-risco"}>
              {crescimento >= 0 ? "▲" : "▼"} {Math.abs(Math.round(crescimento * 100))}%
            </span>{" "}
            do primeiro ao último mês
          </p>
        </div>
        <AbasPeriodo opcoes={[...PERIODOS]} valor={periodo} aoMudar={setPeriodo} rotulo="Período do gráfico" />
      </div>
      <div className="flex flex-wrap gap-4 px-5 pt-4 text-xs text-tinta-2 sm:px-6">
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-0.5 w-4 rounded bg-serie-1" />Entradas</span>
        <span className="inline-flex items-center gap-1.5"><span aria-hidden className="h-0 w-4 border-t-2 border-dashed border-serie-2" />Saídas</span>
      </div>
      <div className="px-2 pb-4 pt-2 sm:px-4">
        <GraficoArea dados={corte} x="mes" principal={{ chave: "entradas", nome: "Entradas" }} comparacao={{ chave: "saidas", nome: "Saídas" }} />
      </div>
    </div>
  );
}
