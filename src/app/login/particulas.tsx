"use client";
// Partículas interativas do login (adaptado do bloco "Particles" enviado pelos sócios).
// Uma forma feita de pontos: o ponteiro empurra os pontos, que voltam por mola; um clique solta
// uma onda e os pontos se reúnem na PRÓXIMA forma (círculo → quadrado → flor → círculo).
// O laço de animação para sozinho quando tudo assenta. Com "menos movimento", fica parado.
import { useEffect, useRef } from "react";

const stillness = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const W = 480;
const H = 400;
const CX = W / 2;
const CY = H / 2;
/** Quantos pontos cada forma tem. */
const N = 720;

const FORMAS = ["Circulo", "Quadrado", "Flor"] as const;
type Forma = (typeof FORMAS)[number];

type Ponto = { hx: number; hy: number; x: number; y: number; vx: number; vy: number };

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function contorno(s: Forma): Path2D {
  const p = new Path2D();
  if (s === "Circulo") p.arc(CX, CY, 150, 0, Math.PI * 2);
  else if (s === "Quadrado") p.roundRect(CX - 140, CY - 140, 280, 280, 36);
  else {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
      const x = CX + Math.cos(a) * 104;
      const y = CY + 8 + Math.sin(a) * 104;
      p.moveTo(x + 60, y);
      p.arc(x, y, 60, 0, Math.PI * 2);
    }
    p.moveTo(CX + 58, CY + 8);
    p.arc(CX, CY + 8, 58, 0, Math.PI * 2);
  }
  return p;
}

/** N pontos espalhados por igual dentro da forma (grade hexagonal ajustada à área). */
function casas(s: Forma): [number, number][] {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const path = contorno(s);
  let area = 0;
  for (let y = 1; y < H; y += 2) for (let x = 1; x < W; x += 2) if (g.isPointInPath(path, x, y)) area += 4;
  const sp = Math.sqrt((area / N) * (2 / Math.sqrt(3)));
  const rowH = (sp * Math.sqrt(3)) / 2;
  const pts: [number, number][] = [];
  for (let y = rowH / 2, row = 0; y < H; y += rowH, row++) {
    for (let x = sp / 2 + (row % 2) * (sp / 2); x < W; x += sp) {
      if (g.isPointInPath(path, x, y)) pts.push([x, y]);
    }
  }
  const out: [number, number][] = [];
  for (let i = 0; i < N; i++) out.push(pts[Math.floor((i * pts.length) / N)]!);
  return out;
}

const angulo = (x: number, y: number) => Math.atan2(y - CY, x - CX);

export function Particulas({ alcance = 80, forca = 60, className }: { alcance?: number; forca?: number; className?: string }) {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const pontos = useRef<Ponto[]>([]);
  const atual = useRef<Forma>("Circulo");
  const mao = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  const parado = useRef(false);

  const virar = (s: Forma) => {
    atual.current = s;
    const prox = casas(s);
    const ps = pontos.current;
    if (!ps.length) {
      pontos.current = prox.map(([x, y]) => ({ hx: x, hy: y, x, y, vx: 0, vy: 0 }));
      return;
    }
    // Pareia por ângulo em volta do centro: o enxame gira para a nova forma sem se cruzar.
    const a = ps.map((d, i) => [angulo(d.x, d.y), i] as const).sort((p, q) => p[0] - q[0]);
    const b = prox.map((h, i) => [angulo(h[0], h[1]), i] as const).sort((p, q) => p[0] - q[0]);
    a.forEach(([, di], k) => {
      const h = prox[b[k]![1]]!;
      ps[di]!.hx = h[0];
      ps[di]!.hy = h[1];
      if (parado.current) {
        ps[di]!.x = h[0];
        ps[di]!.y = h[1];
      }
    });
  };

  const desenhar = () => {
    const c = cv.current;
    if (!c) return;
    const x = c.getContext("2d")!;
    const k = c.width / W;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, W, H);
    x.fillStyle = getComputedStyle(c).color;
    const r = 1.9;
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
      const R = clamp(alcance, 30, 160);
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
    virar("Circulo");
    desenhar();
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
      aria-label="Forma feita de pontos. Passe o mouse para empurrar os pontos; clique para mudar a forma."
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
        const p = onde(e);
        if (!parado.current) {
          const S = 0.4 + (clamp(forca, 0, 100) / 100) * 1.2;
          for (const d of pontos.current) {
            const dx = d.x - p.x;
            const dy = d.y - p.y;
            const dd = Math.hypot(dx, dy);
            if (dd > 200 || dd < 0.01) continue;
            const f = (1 - dd / 200) * 30 * S;
            d.vx += (dx / dd) * f;
            d.vy += (dy / dd) * f;
          }
        }
        virar(FORMAS[(FORMAS.indexOf(atual.current) + 1) % FORMAS.length]!);
        desenhar();
        rodar();
      }}
    />
  );
}
