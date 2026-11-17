"use client";
// Último momento em que o sócio mexeu no painel (mouse, teclado, toque, rolagem, foco).
// Serve para pausar consultas periódicas quando a tela fica esquecida aberta,
// o que deixa o banco "dormir" e economiza a cota mensal do Neon.
import { useEffect } from "react";

let ultimoUso = Date.now();
const aoVoltar = new Set<() => void>();
let instalado = false;
let pausado = false;

function marcarUso() {
  const voltou = pausado;
  ultimoUso = Date.now();
  pausado = false;
  if (voltou) for (const f of aoVoltar) f();
}

function instalar() {
  if (instalado || typeof window === "undefined") return;
  instalado = true;
  const opcoes = { passive: true, capture: true } as const;
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll", "focus"]) {
    window.addEventListener(ev, marcarUso, opcoes);
  }
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && marcarUso());
}

export const ultimoUsoEm = () => ultimoUso;

/** Avise que as consultas foram pausadas: o próximo movimento chama os `aoVoltar`. */
export const marcarPausado = () => {
  pausado = true;
};

/** Registra uma função chamada quando o sócio volta a mexer depois de uma pausa. */
export function useUsoDoPainel(voltou?: () => void) {
  useEffect(() => {
    instalar();
    if (!voltou) return;
    aoVoltar.add(voltou);
    return () => {
      aoVoltar.delete(voltou);
    };
  }, [voltou]);
}
