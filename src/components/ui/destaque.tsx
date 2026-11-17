"use client";
// Destaque deslizante: um fundo que desliza até a linha ativa de uma lista (busca, menus).
// Fica dentro do elemento que rola, com o pai em `position: relative`, e as linhas por cima (z-10).
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "./base";

export function Destaque({ alvoId, className }: { alvoId: string | null; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [caixa, setCaixa] = useState<{ y: number; h: number } | null>(null);
  const primeira = useRef(true);

  useLayoutEffect(() => {
    const alvo = alvoId ? document.getElementById(alvoId) : null;
    if (!alvo) {
      setCaixa(null);
      primeira.current = true;
      return;
    }
    setCaixa({ y: alvo.offsetTop, h: alvo.offsetHeight });
  }, [alvoId]);

  // Na primeira aparição o destaque surge no lugar, sem deslizar desde o topo.
  useLayoutEffect(() => {
    if (!caixa || !primeira.current) return;
    const el = ref.current;
    if (!el) return;
    el.style.transition = "none";
    void el.offsetHeight;
    el.style.removeProperty("transition");
    primeira.current = false;
  }, [caixa]);

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        "destaque pointer-events-none absolute inset-x-0 top-0 z-0",
        caixa ? "opacity-100" : "opacity-0",
        className,
      )}
      style={caixa ? { transform: `translateY(${caixa.y}px)`, height: caixa.h } : undefined}
    />
  );
}
