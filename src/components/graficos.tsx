"use client";
// Gráficos do Hub (Recharts). Paleta validada para daltonismo; marcas finas,
// grade discreta, dica ao passar o mouse e rótulos diretos quando ajudam.
import {
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

// Validadas no fundo escuro: faixa de luminosidade, daltonismo (CVD) e contraste >= 3:1.
export const SERIES = ["#5b82ec", "#e0662e", "#1fa87c", "#b8861f"];
const TINTA_3 = "#8d93ab";
const GRADE = "rgba(255,255,255,0.07)";

type Formato = "brl" | "num" | "dias" | "pct";
const fmt = (f: Formato, v: number) =>
  f === "brl" ? brl(v) : f === "dias" ? `${num(v)} dias` : f === "pct" ? `${Math.round(v)}%` : num(v);
const fmtEixo = (f: Formato, v: number) => (f === "brl" ? brlCurto(v) : f === "pct" ? `${v}%` : num(v));

function Dica({ active, payload, label, formato }: TooltipContentProps<number, string> & { formato: Formato }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-areia-2 bg-superficie-2 px-3.5 py-2.5 text-xs shadow-flutuante">
      <p className="mb-1 font-medium text-white">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-tinta-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="numeros font-medium text-white">{fmt(formato, Number(p.value))}</span>
        </p>
      ))}
    </div>
  );
}

const eixo = { fontSize: 12, fill: TINTA_3, fontFamily: "var(--font-lexend)" };

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
          <Tooltip cursor={{ fill: "rgba(143,176,255,0.06)" }} content={(p) => <Dica {...(p as TooltipContentProps<number, string>)} formato={formato} />} />
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
                dados.map((_, j) => <Cell key={j} fill={j === dados.length - 1 ? "#5b82ec" : "#2c3b63"} />)}
              {rotuloTopo && (
                <LabelList dataKey={s.chave} position="top" formatter={(v) => fmtEixo(formato, Number(v))} style={{ ...eixo, fill: "#b8bdd1", fontSize: 11 }} />
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
          <Tooltip cursor={{ fill: "rgba(143,176,255,0.06)" }} content={(p) => <Dica {...(p as TooltipContentProps<number, string>)} formato={formato} />} />
          <Bar dataKey={valor} name={nome} fill={cor} radius={[0, 4, 4, 0]} maxBarSize={20}>
            <LabelList dataKey={valor} position="right" formatter={(v) => fmt(formato, Number(v))} style={{ ...eixo, fill: "#eef0f8", fontWeight: 500 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
