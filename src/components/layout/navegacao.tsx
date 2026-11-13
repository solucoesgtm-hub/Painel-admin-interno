"use client";
// Navegação: abas em cápsula no topo (computador), dock de atalhos à esquerda (computador)
// e dock inferior + menu completo em folha (celular).
import {
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  FileSignature,
  FileSearch,
  FolderKanban,
  History,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Search,
  UserPlus,
  Users,
  Wallet,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/components/ui/base";
import { Logo } from "./logo";
import { BotaoTema, Dica, LinhaTema } from "./tema";

type Item = { href: string; nome: string; curto?: string; icone: LucideIcon };
type Grupo = { titulo: string; itens: Item[] };

export const GRUPOS: Grupo[] = [
  {
    titulo: "Dia a dia",
    itens: [
      { href: "/", nome: "Início", icone: LayoutDashboard },
      { href: "/agenda", nome: "Agenda", icone: CalendarDays },
    ],
  },
  {
    titulo: "Comercial",
    itens: [
      { href: "/leads", nome: "Leads e clientes", curto: "Leads", icone: Workflow },
      { href: "/diagnostico", nome: "Diagnóstico", icone: ClipboardCheck },
      { href: "/analise", nome: "Análise de leads", curto: "Análise", icone: BarChart3 },
    ],
  },
  {
    titulo: "Entrega",
    itens: [
      { href: "/projetos", nome: "Projetos", icone: FolderKanban },
      { href: "/contratos", nome: "Contratos", icone: FileSignature },
      { href: "/produtos", nome: "Produtos", icone: Package },
    ],
  },
  {
    titulo: "Gestão",
    itens: [
      { href: "/financeiro", nome: "Financeiro", icone: Wallet },
      { href: "/editais", nome: "Editais", icone: FileSearch },
      { href: "/automacao", nome: "Automação", icone: Bot },
    ],
  },
  {
    titulo: "Empresa",
    itens: [
      { href: "/equipe", nome: "Equipe", icone: Users },
      { href: "/historico", nome: "Histórico", icone: History },
    ],
  },
];
const TODOS = GRUPOS.flatMap((g) => g.itens);

/** Telas que ganham aba própria no topo; as demais ficam em "Mais". */
const ABAS = ["/", "/agenda", "/leads", "/diagnostico", "/projetos", "/financeiro"];

const ativo = (atual: string, href: string) => (href === "/" ? atual === "/" : atual.startsWith(href));

/** Fecha um popover com clique fora, Esc e troca de rota. */
function usePopover<T extends HTMLElement = HTMLDivElement>() {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<T>(null);
  const atual = usePathname();
  useEffect(() => setAberto(false), [atual]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, [aberto]);
  return { aberto, setAberto, ref };
}

function Contador({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="numeros grid min-w-5 place-items-center rounded-full bg-quente px-1.5 text-[11px] font-semibold leading-5 text-white">
      {n}
      <span className="sr-only"> pendentes</span>
    </span>
  );
}

export type Usuario = { nome: string; email: string; cor: string; demo: boolean };

/* ---------------- Abas em cápsula (≥ 1280 px) ---------------- */
export function AbasTopo({ contadores }: { contadores: Record<string, number> }) {
  const atual = usePathname();
  const lista = useRef<HTMLUListElement>(null);
  const [pilula, setPilula] = useState<{ x: number; w: number } | null>(null);
  const mais = usePopover<HTMLLIElement>();
  const extras = GRUPOS.map((g) => ({ ...g, itens: g.itens.filter((i) => !ABAS.includes(i.href)) })).filter((g) => g.itens.length);
  const emMais = extras.some((g) => g.itens.some((i) => ativo(atual, i.href)));
  const pendentesMais = extras.flatMap((g) => g.itens).reduce((a, i) => a + (contadores[i.href] ?? 0), 0);

  // A pílula escura desliza até a aba ativa (medida no DOM).
  const medir = useCallback(() => {
    const el = lista.current?.querySelector<HTMLElement>("[data-ativo='true']");
    setPilula(el ? { x: el.offsetLeft, w: el.offsetWidth } : null);
  }, []);
  useLayoutEffect(() => {
    medir();
  }, [atual, medir]);
  useEffect(() => {
    const ro = new ResizeObserver(medir);
    if (lista.current) ro.observe(lista.current);
    document.fonts?.ready.then(medir);
    return () => ro.disconnect();
  }, [medir]);

  return (
    <nav aria-label="Principal" className="vidro relative rounded-full p-1">
      <ul ref={lista} className="relative flex items-center">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 rounded-full bg-tinta shadow-[0_8px_20px_-10px_rgb(18_21_31/0.6)] transition-[transform,width,opacity] duration-[420ms] ease-suave",
            !pilula && "opacity-0",
          )}
          style={pilula ? { transform: `translateX(${pilula.x}px)`, width: pilula.w } : undefined}
        />
        {ABAS.map((href) => {
          const i = TODOS.find((t) => t.href === href)!;
          const sel = ativo(atual, href);
          const n = contadores[href];
          return (
            <li key={href} data-ativo={sel} className="relative">
              <Link
                href={href}
                aria-current={sel ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] font-medium transition-colors duration-300",
                  sel ? "text-offwhite" : "text-tinta-2 hover:text-tinta",
                  sel && !pilula && "bg-tinta",
                )}
              >
                {i.curto ?? i.nome}
                <Contador n={n} />
              </Link>
            </li>
          );
        })}
        <li data-ativo={emMais} className="relative" ref={mais.ref}>
          <button
            type="button"
            aria-expanded={mais.aberto}
            aria-haspopup="menu"
            onClick={() => mais.setAberto((v) => !v)}
            className={cn(
              "flex min-h-11 items-center gap-1.5 rounded-full px-4 text-[14px] font-medium transition-colors duration-300",
              emMais ? "text-offwhite" : "text-tinta-2 hover:text-tinta",
              emMais && !pilula && "bg-tinta",
            )}
          >
            {emMais ? TODOS.find((i) => ativo(atual, i.href))?.curto ?? TODOS.find((i) => ativo(atual, i.href))?.nome : "Mais"}
            {pendentesMais > 0 && !emMais && <span aria-hidden className="size-2 rounded-full bg-quente" />}
            <ChevronDown aria-hidden className={cn("size-4 transition-transform", mais.aberto && "rotate-180")} />
          </button>
          {mais.aberto && (
            <div role="menu" className="vidro-forte animate-entrar-modal absolute right-0 top-[calc(100%+10px)] z-40 grid w-[440px] grid-cols-2 gap-x-2 gap-y-3 rounded-2xl p-3">
              {extras.map((g) => (
                <div key={g.titulo}>
                  <p className="px-3 pb-1 text-xs font-medium text-tinta-3">{g.titulo}</p>
                  {g.itens.map((i) => (
                    <ItemMenu key={i.href} item={i} sel={ativo(atual, i.href)} n={contadores[i.href]} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </li>
      </ul>
    </nav>
  );
}

function ItemMenu({ item: i, sel, n, aoNavegar }: { item: Item; sel: boolean; n?: number; aoNavegar?: () => void }) {
  return (
    <Link
      role="menuitem"
      href={i.href}
      onClick={aoNavegar}
      aria-current={sel ? "page" : undefined}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
        sel ? "bg-tinta font-medium text-offwhite" : "text-tinta-2 hover:bg-superficie-2 hover:text-tinta",
      )}
    >
      <i.icone aria-hidden className={cn("size-[18px] shrink-0", sel ? "text-offwhite" : "text-tinta-3")} />
      <span className="flex-1">{i.nome}</span>
      <Contador n={n} />
    </Link>
  );
}

/* ---------------- Faixa de abas rolável (1024–1279 px) ---------------- */
export function AbasFaixa({ contadores }: { contadores: Record<string, number> }) {
  const atual = usePathname();
  const lista = useRef<HTMLUListElement>(null);
  useEffect(() => {
    lista.current?.querySelector("[aria-current='page']")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [atual]);
  return (
    <nav aria-label="Principal" className="vidro rounded-full p-1">
      <ul ref={lista} className="sem-rolagem flex items-center gap-0.5 overflow-x-auto">
        {TODOS.map((i) => {
          const sel = ativo(atual, i.href);
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={sel ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors",
                  sel ? "bg-tinta text-offwhite" : "text-tinta-2 hover:text-tinta",
                )}
              >
                {i.curto ?? i.nome}
                <Contador n={contadores[i.href]} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/* ---------------- Dock de atalhos à esquerda (≥ 1024 px) ---------------- */
const estiloDock =
  "group relative grid size-11 place-items-center rounded-full text-tinta-2 transition-colors hover:bg-superficie-2 hover:text-tinta aria-[current=page]:bg-tinta aria-[current=page]:text-offwhite";

export function Dock({ aoBuscar, contadores }: { aoBuscar: () => void; contadores: Record<string, number> }) {
  const atual = usePathname();
  const atalhos: { nome: string; href: string; icone: LucideIcon; n?: number }[] = [
    { nome: "Novo lead", href: "/leads?novo=1", icone: UserPlus },
    { nome: "Novo diagnóstico", href: "/diagnostico", icone: ClipboardCheck },
    { nome: "Agenda de hoje", href: "/agenda", icone: CalendarDays },
    { nome: "Caixa de aprovações", href: "/automacao", icone: Inbox, n: contadores["/automacao"] },
    { nome: "Histórico", href: "/historico", icone: History },
  ];
  return (
    <nav aria-label="Atalhos" className="fixed left-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block">
      <ul className="vidro flex w-[60px] flex-col items-center gap-1 rounded-full py-2">
        <li>
          <button type="button" onClick={aoBuscar} aria-label="Buscar (Ctrl K)" className={estiloDock}>
            <Search aria-hidden className="size-[18px]" />
            <Dica>Buscar · Ctrl K</Dica>
          </button>
        </li>
        <li aria-hidden className="my-1 h-px w-6 bg-areia-2" />
        {atalhos.map((a) => (
          <li key={a.nome}>
            <Link
              href={a.href}
              aria-label={a.n ? `${a.nome}, ${a.n} pendentes` : a.nome}
              aria-current={!a.href.includes("?") && ativo(atual, a.href) ? "page" : undefined}
              className={estiloDock}
            >
              <a.icone aria-hidden className="size-[18px]" />
              {a.n ? <span aria-hidden className="absolute right-2 top-2 size-2 rounded-full bg-quente ring-2 ring-offwhite" /> : null}
              <Dica>{a.nome}</Dica>
            </Link>
          </li>
        ))}
        <li aria-hidden className="my-1 h-px w-6 bg-areia-2" />
        <li>
          <BotaoTema comDica className={estiloDock} />
        </li>
      </ul>
    </nav>
  );
}

/* ---------------- Menu da conta (topo, todas as larguras) ---------------- */
export function MenuConta({
  usuario,
  sair,
  data,
  selo,
}: {
  usuario: Usuario;
  sair?: () => Promise<void>;
  data: string;
  selo: string;
}) {
  const p = usePopover();
  return (
    <div ref={p.ref} className="relative shrink-0">
      <button
        type="button"
        aria-expanded={p.aberto}
        aria-haspopup="menu"
        aria-label={`Conta de ${usuario.nome}`}
        onClick={() => p.setAberto((v) => !v)}
        className="grid size-11 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-papel transition-transform hover:scale-105"
        style={{ background: usuario.cor }}
      >
        {usuario.nome.slice(0, 1)}
      </button>
      {p.aberto && (
        <div role="menu" className="vidro-forte animate-entrar-modal absolute right-0 top-[calc(100%+10px)] z-40 w-72 rounded-2xl p-2">
          <div className="px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-tinta">{usuario.nome}</p>
            <p className="truncate text-xs text-tinta-3">{usuario.demo ? "Modo demonstração" : usuario.email}</p>
            <p className="mt-2 text-xs text-tinta-3 first-letter:uppercase">{data}</p>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-alerta-suave px-2.5 py-1 text-xs font-medium text-alerta">
              <span aria-hidden className="size-1.5 rounded-full bg-alerta" />
              {selo}
            </p>
          </div>
          <div className="border-t border-areia pt-1">
            <LinhaTema className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-tinta-2 hover:bg-superficie-2 hover:text-tinta" />
            {sair && (
              <form action={sair}>
                <button className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-tinta-2 hover:bg-superficie-2 hover:text-tinta">
                  <LogOut aria-hidden className="size-[18px] text-tinta-3" />
                  Sair
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Celular: dock inferior + menu completo ---------------- */
const PRINCIPAIS: Item[] = [
  { href: "/", nome: "Início", icone: LayoutDashboard },
  { href: "/leads", nome: "Leads", icone: Workflow },
  { href: "/diagnostico", nome: "Diagnóstico", icone: ClipboardCheck },
  { href: "/agenda", nome: "Agenda", icone: CalendarDays },
];

export function BarraInferior({ contadores }: { contadores: Record<string, number> }) {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);
  useEffect(() => {
    if (!aberto) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [aberto]);
  const emPrincipal = PRINCIPAIS.some((p) => ativo(atual, p.href));
  const pendentes = TODOS.filter((i) => !PRINCIPAIS.some((p) => p.href === i.href)).reduce(
    (a, i) => a + (contadores[i.href] ?? 0),
    0,
  );
  const estilo = (sel: boolean) =>
    cn(
      "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors",
      sel ? "bg-tinta text-offwhite" : "text-tinta-2",
    );

  return (
    <>
      <nav aria-label="Atalhos" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-40 lg:hidden">
        <ul className="vidro-forte mx-auto grid max-w-md grid-cols-5 gap-0.5 rounded-full p-1.5">
          {PRINCIPAIS.map((p) => {
            const sel = ativo(atual, p.href);
            return (
              <li key={p.href}>
                <Link href={p.href} aria-current={sel ? "page" : undefined} className={estilo(sel)}>
                  <p.icone aria-hidden className="size-5" />
                  {p.nome}
                  <span className="absolute right-1 top-1">
                    <Contador n={contadores[p.href]} />
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setAberto(true)} aria-expanded={aberto} className={estilo(!emPrincipal)}>
              <Menu aria-hidden className="size-5" />
              Mais
              {pendentes > 0 && <span aria-hidden className="absolute right-4 top-2.5 size-2 rounded-full bg-quente" />}
            </button>
          </li>
        </ul>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu completo">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-grafite/40 backdrop-blur-[2px]" onClick={() => setAberto(false)} />
          <div className="vidro-forte animate-subir-folha rolagem-fina absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[26px] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
            <div className="mb-2 flex items-center justify-between pl-3">
              <Logo escuro />
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="grid size-11 place-items-center rounded-full text-tinta-3 hover:bg-superficie-2 hover:text-tinta"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <nav aria-label="Todas as telas" className="flex flex-col gap-4">
              {GRUPOS.map((g) => (
                <div key={g.titulo}>
                  <p className="mb-1 px-3 text-xs font-medium text-tinta-3">{g.titulo}</p>
                  {g.itens.map((i) => (
                    <ItemMenu key={i.href} item={i} sel={ativo(atual, i.href)} n={contadores[i.href]} aoNavegar={() => setAberto(false)} />
                  ))}
                </div>
              ))}
            </nav>
            <div className="mt-3 border-t border-areia pt-2">
              <LinhaTema className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-[14px] text-tinta-2 hover:bg-superficie-2" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
