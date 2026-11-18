"use client";
// Partículas interativas do login: os pontos formam o símbolo da GTM (o pinguim dentro do círculo).
// Os pontos ficam nas partes claras do símbolo, então o pinguim aparece como o vazio no meio.
// Ao abrir, os pontos chegam espalhados e se juntam no logo. O ponteiro empurra os pontos, que
// voltam por mola; um clique solta uma onda e eles se reúnem de novo. O laço para quando tudo
// assenta. Com "menos movimento", o logo aparece pronto e parado.
import { useEffect, useRef } from "react";
import { BARRIGA, FAIXA_DIR, FAIXA_ESQ, RAIO_RECORTE, SILHUETA } from "@/lib/marca";

const stillness = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Espaço interno do desenho (o canvas escala para o tamanho na tela). */
const W = 800;
const H = 800;
const CX = W / 2;
const CY = H / 2;
/** Raio do círculo do símbolo no desenho original (viewBox centrado em 640,640). */
const RAIO_LOGO = 366;
const ESCALA = (W * 0.47) / RAIO_LOGO;
/** Quantos pontos formam o logo. */
const N = 2600;

type Ponto = { hx: number; hy: number; x: number; y: number; vx: number; vy: number };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Pontos espalhados por igual nas partes claras do símbolo (grade hexagonal ajustada à área). */
function casasDoLogo(): [number, number][] {
  const g = document.createElement("canvas").getContext("2d")!;
  const silhueta = new Path2D(SILHUETA);
  const claros = [new Path2D(BARRIGA), new Path2D(FAIXA_ESQ), new Path2D(FAIXA_DIR)];
  // (x, y) no canvas → coordenadas do desenho original.
  const claro = (x: number, y: number) => {
    const lx = 640 + (x - CX) / ESCALA;
    const ly = 640 + (y - CY) / ESCALA;
    const r = Math.hypot(lx - 640, ly - 640);
    if (r > RAIO_LOGO) return false;
    const recortado = r <= RAIO_RECORTE && g.isPointInPath(silhueta, lx, ly);
    return !recortado || claros.some((p) => g.isPointInPath(p, lx, ly));
  };
  let area = 0;
  for (let y = 1; y < H; y += 3) for (let x = 1; x < W; x += 3) if (claro(x, y)) area += 9;
  const sp = Math.sqrt((area / N) * (2 / Math.sqrt(3)));
  const rowH = (sp * Math.sqrt(3)) / 2;
  const pts: [number, number][] = [];
  for (let y = rowH / 2, row = 0; y < H; y += rowH, row++) {
    for (let x = sp / 2 + (row % 2) * (sp / 2); x < W; x += sp) if (claro(x, y)) pts.push([x, y]);
  }
  const out: [number, number][] = [];
  for (let i = 0; i < N; i++) out.push(pts[Math.floor((i * pts.length) / N)]!);
  return out;
}

export function Particulas({ alcance = 90, forca = 60, className }: { alcance?: number; forca?: number; className?: string }) {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const pontos = useRef<Ponto[]>([]);
  const mao = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  const parado = useRef(false);

  const desenhar = () => {
    const c = cv.current;
    if (!c) return;
    const x = c.getContext("2d")!;
    const k = c.width / W;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, W, H);
    x.fillStyle = getComputedStyle(c).color;
    const r = 2.4;
    x.beginPath();
    for (const d of pontos.current) {
      const sp = Math.hypot(d.vx, d.vy);
      if (sp < 0.3) {
        x.moveTo(d.x + r, d.y);
        x.arc(d.x, d.y, r, 0, Math.PI * 2);
      } else {
        // Esticado na direção do movimento: a onda parece um respingo.
        const s = Math.min(2.6, 1 + sp * 0.12);
        const rot = Math.atan2(d.vy, d.vx);
        x.moveTo(d.x + Math.cos(rot) * r * s, d.y + Math.sin(rot) * r * s);
        x.ellipse(d.x, d.y, r * s, r / Math.sqrt(s), rot, 0, Math.PI * 2);
      }
    }
    x.fill();
  };

  const rodar = () => {
    if (raf.current) return;
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      const h = mao.current;
      const R = clamp(alcance, 30, 180);
      const S = (clamp(forca, 0, 100) / 100) * 11;
      let ocupado = !!h;
      for (const d of pontos.current) {
        if (h) {
          const dx = d.x - h.x;
          const dy = d.y - h.y;
          const dd = Math.hypot(dx, dy);
          if (dd < R && dd > 0.01) {
            const f = Math.pow(1 - dd / R, 2) * S;
            d.vx += (dx / dd) * f * dt;
            d.vy += (dy / dd) * f * dt;
          }
        }
        d.vx = (d.vx + (d.hx - d.x) * 0.05 * dt) * Math.pow(0.84, dt);
        d.vy = (d.vy + (d.hy - d.y) * 0.05 * dt) * Math.pow(0.84, dt);
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (Math.abs(d.hx - d.x) < 0.05 && Math.abs(d.hy - d.y) < 0.05 && Math.abs(d.vx) < 0.02 && Math.abs(d.vy) < 0.02) {
          d.x = d.hx;
          d.y = d.hy;
          d.vx = 0;
          d.vy = 0;
        } else ocupado = true;
      }
      desenhar();
      raf.current = ocupado ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    parado.current = stillness();
    const c = cv.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(W * dpr);
    c.height = Math.round(H * dpr);
    // Chegada: cada ponto nasce num anel largo fora do logo e vem para a sua casa.
    pontos.current = casasDoLogo().map(([hx, hy]) => {
      if (parado.current) return { hx, hy, x: hx, y: hy, vx: 0, vy: 0 };
      const a = Math.random() * Math.PI * 2;
      const r = W * (0.55 + Math.random() * 0.35);
      return { hx, hy, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, vx: 0, vy: 0 };
    });
    desenhar();
    if (!parado.current) rodar();
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onde = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = r.width / W;
    return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k };
  };

  return (
    <canvas
      ref={cv}
      className={className}
      style={{ aspectRatio: `${W} / ${H}`, touchAction: "none" }}
      role="img"
      aria-label="Símbolo da GTM feito de pontos. Passe o mouse para empurrar os pontos; clique para espalhar."
      onPointerMove={(e) => {
        if (parado.current) return;
        mao.current = onde(e);
        rodar();
      }}
      onPointerLeave={() => {
        mao.current = null;
        rodar();
      }}
      onPointerDown={(e) => {
        if (parado.current) return;
        // Onda de choque a partir do clique; a mola traz tudo de volta para o logo.
        const p = onde(e);
        const S = 0.4 + (clamp(forca, 0, 100) / 100) * 1.2;
        for (const d of pontos.current) {
          const dx = d.x - p.x;
          const dy = d.y - p.y;
          const dd = Math.hypot(dx, dy);
          if (dd > 260 || dd < 0.01) continue;
          const f = (1 - dd / 260) * 30 * S;
          d.vx += (dx / dd) * f;
          d.vy += (dy / dd) * f;
        }
        rodar();
      }}
    />
  );
}
