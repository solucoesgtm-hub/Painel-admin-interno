"use client";
// Número que conta até o valor final ao aparecer. O valor final já vem no HTML do servidor
// (leitores de tela e quem prefere menos movimento veem só o número certo).
import { useEffect, useRef, useState } from "react";

type Formato = "brl" | "num" | "pct";
const fmt = (f: Formato, v: number) =>
  f === "brl"
    ? v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    : f === "pct"
      ? `${Math.round(v * 100)}%`
      : Math.round(v).toLocaleString("pt-BR");

export function Contagem({ valor, formato = "num", duracao = 900 }: { valor: number; formato?: Formato; duracao?: number }) {
  const [atual, setAtual] = useState(valor);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let quadro = 0;
    const animar = () => {
      const inicio = performance.now();
      const passo = (t: number) => {
        const p = Math.min(1, (t - inicio) / duracao);
        const suave = 1 - Math.pow(1 - p, 4); // desacelera no fim
        setAtual(valor * suave);
        if (p < 1) quadro = requestAnimationFrame(passo);
      };
      setAtual(0);
      quadro = requestAnimationFrame(passo);
    };
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        animar();
        obs.disconnect();
      }
    });
    obs.observe(el);
    return () => {
      obs.disconnect();
      cancelAnimationFrame(quadro);
    };
  }, [valor, duracao]);

  return (
    <span ref={ref} className="numeros" aria-label={fmt(formato, valor)}>
      <span aria-hidden>{fmt(formato, atual)}</span>
    </span>
  );
}
