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

/** Casas calculadas uma vez por carregamento (voltar ao login não refaz a conta). */
let casasGuardadas: [number, number][] | null = null;

/**
 * Pontos espalhados por igual nas partes claras do símbolo (grade hexagonal ajustada à área).
 * O símbolo é pintado uma vez num canvas fora da tela e lido de uma vez só (getImageData):
 * antes eram centenas de milhares de isPointInPath no início, o que travava a entrada.
 */
function casasDoLogo(): [number, number][] {
  if (casasGuardadas) return casasGuardadas;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  // Coordenadas do desenho original (centro 640,640) → canvas.
  g.setTransform(ESCALA, 0, 0, ESCALA, CX - 640 * ESCALA, CY - 640 * ESCALA);
  const circulo = (r: number) => {
    const p = new Path2D();
    p.arc(640, 640, r, 0, Math.PI * 2);
    return p;
  };
  // Círculo claro; pinguim escuro recortado no círculo interno; barriga e faixas claras por cima.
  g.fillStyle = "#fff";
  g.fill(circulo(RAIO_LOGO));
  g.save();
  g.clip(circulo(RAIO_RECORTE));
  g.fillStyle = "#000";
  g.fill(new Path2D(SILHUETA));
  g.restore();
  g.save();
  g.clip(circulo(RAIO_LOGO));
  g.fillStyle = "#fff";
  for (const d of [BARRIGA, FAIXA_ESQ, FAIXA_DIR]) g.fill(new Path2D(d));
  g.restore();
  const px = g.getImageData(0, 0, W, H).data;
  const claro = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    return ix >= 0 && iy >= 0 && ix < W && iy < H && px[(iy * W + ix) * 4]! > 127;
  };
  let area = 0;
  for (let i = 0; i < px.length; i += 4) if (px[i]! > 127) area++;
  const sp = Math.sqrt((area / N) * (2 / Math.sqrt(3)));
  const rowH = (sp * Math.sqrt(3)) / 2;
  const pts: [number, number][] = [];
  for (let y = rowH / 2, row = 0; y < H; y += rowH, row++) {
    for (let x = sp / 2 + (row % 2) * (sp / 2); x < W; x += sp) if (claro(x, y)) pts.push([x, y]);
  }
  const out: [number, number][] = [];
  for (let i = 0; i < N; i++) out.push(pts[Math.floor((i * pts.length) / N)]!);
  casasGuardadas = out;
  return out;
}

export function Particulas({ alcance = 90, forca = 60, className }: { alcance?: number; forca?: number; className?: string }) {
  const cv = useRef<HTMLCanvasElement | null>(null);
  const pontos = useRef<Ponto[]>([]);
  const mao = useRef<{ x: number; y: number } | null>(null);
  const raf = useRef(0);
  const parado = useRef(false);
  const cor = useRef("#f1f0eb");

  const desenhar = () => {
    const c = cv.current;
    if (!c) return;
    const x = c.getContext("2d")!;
    const k = c.width / W;
    x.setTransform(k, 0, 0, k, 0, 0);
    x.clearRect(0, 0, W, H);
    const r = 2.4;
    // Parados: círculos num só caminho. Em movimento: um traço de ponta redonda na direção da
    // velocidade (parece um respingo) — bem mais leve que uma elipse girada por ponto.
    const parados = new Path2D();
    const andando = new Path2D();
    let algumAndando = false;
    for (const d of pontos.current) {
      const sp = Math.hypot(d.vx, d.vy);
      if (sp < 0.3) {
        parados.moveTo(d.x + r, d.y);
        parados.arc(d.x, d.y, r, 0, Math.PI * 2);
      } else {
        const meio = (r * Math.min(1.6, sp * 0.12)) / sp;
        andando.moveTo(d.x - d.vx * meio, d.y - d.vy * meio);
        andando.lineTo(d.x + d.vx * meio, d.y + d.vy * meio);
        algumAndando = true;
      }
    }
    x.fillStyle = cor.current;
    x.fill(parados);
    if (algumAndando) {
      x.strokeStyle = cor.current;
      x.lineWidth = r * 1.7;
      x.lineCap = "round";
      x.stroke(andando);
    }
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
    cor.current = getComputedStyle(c).color || cor.current;
    // Espera a tela terminar de aparecer (hidratação e primeiro desenho) antes de começar:
    // a chegada dos pontos começa num quadro livre, sem disputar com o carregamento da página.
    let inicio = requestAnimationFrame(() => {
      inicio = requestAnimationFrame(() => {
        // Chegada: cada ponto nasce num anel largo fora do logo e vem para a sua casa.
        pontos.current = casasDoLogo().map(([hx, hy]) => {
          if (parado.current) return { hx, hy, x: hx, y: hy, vx: 0, vy: 0 };
          const a = Math.random() * Math.PI * 2;
          const r = W * (0.55 + Math.random() * 0.35);
          return { hx, hy, x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r, vx: 0, vy: 0 };
        });
        desenhar();
        if (!parado.current) rodar();
      });
    });
    return () => {
      cancelAnimationFrame(inicio);
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
