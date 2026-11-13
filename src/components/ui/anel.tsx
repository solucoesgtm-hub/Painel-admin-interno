// Anel de progresso em SVG, com marcador opcional (ex.: alerta em 80%).
import { cn } from "./base";

export function Anel({
  valor,
  rotulo,
  tamanho = 132,
  espessura = 12,
  marca,
  claro = false,
  children,
  corValor,
}: {
  valor: number; // 0 a 1
  rotulo: string;
  tamanho?: number;
  espessura?: number;
  marca?: number;
  /** Desenhado sobre fundo grafite */
  claro?: boolean;
  corValor?: string;
  children?: React.ReactNode;
}) {
  const r = (tamanho - espessura) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, valor));
  const ang = marca !== undefined ? marca * 2 * Math.PI - Math.PI / 2 : 0;
  return (
    <div
      role="meter"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="relative grid shrink-0 place-items-center"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg aria-hidden width={tamanho} height={tamanho} className="-rotate-90">
        <circle cx={tamanho / 2} cy={tamanho / 2} r={r} fill="none" strokeWidth={espessura}
          stroke={claro ? "rgb(255 255 255 / 0.1)" : "var(--c-areia-2)"} />
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={r}
          fill="none"
          strokeWidth={espessura}
          strokeLinecap="round"
          stroke={corValor ?? (claro ? "#7fa2ff" : "var(--c-serie-1)")}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className="transition-[stroke-dashoffset] duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
      </svg>
      {marca !== undefined && (
        <span
          aria-hidden
          className={cn("absolute size-2 rounded-full ring-2", claro ? "bg-white ring-grafite" : "bg-tinta ring-papel-forte")}
          style={{
            left: tamanho / 2 + r * Math.cos(ang) - 4,
            top: tamanho / 2 + r * Math.sin(ang) - 4,
          }}
        />
      )}
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
