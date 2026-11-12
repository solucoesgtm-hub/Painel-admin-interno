"use client";
// Navegação: barra superior com menu em cápsula (computador) e barra inferior em vidro (celular).
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
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Users,
  Wallet,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/base";
import { Logo } from "./logo";

type Item = { href: string; nome: string; curto?: string; icone: LucideIcon; nivel: 1 | 2 | 3 };

// nivel 1: sempre na cápsula; 2: na cápsula a partir de telas largas (xl); 3: sempre em "Mais".
export const ITENS: Item[] = [
  { href: "/", nome: "Início", icone: LayoutDashboard, nivel: 1 },
  { href: "/leads", nome: "Leads e clientes", curto: "Leads", icone: Workflow, nivel: 1 },
  { href: "/diagnostico", nome: "Diagnóstico", icone: ClipboardCheck, nivel: 1 },
  { href: "/agenda", nome: "Agenda", icone: CalendarDays, nivel: 1 },
  { href: "/financeiro", nome: "Financeiro", icone: Wallet, nivel: 2 },
  { href: "/editais", nome: "Editais", icone: FileSearch, nivel: 2 },
  { href: "/analise", nome: "Análise de leads", icone: BarChart3, nivel: 3 },
  { href: "/projetos", nome: "Projetos", icone: FolderKanban, nivel: 3 },
  { href: "/contratos", nome: "Contratos", icone: FileSignature, nivel: 3 },
  { href: "/produtos", nome: "Produtos", icone: Package, nivel: 3 },
  { href: "/automacao", nome: "Automação", icone: Bot, nivel: 3 },
  { href: "/equipe", nome: "Equipe", icone: Users, nivel: 3 },
  { href: "/historico", nome: "Histórico", icone: History, nivel: 3 },
];

const ativo = (atual: string, href: string) => (href === "/" ? atual === "/" : atual.startsWith(href));

function Contador({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="numeros grid min-w-5 place-items-center rounded-full bg-quente px-1.5 text-[10.5px] font-semibold leading-5 text-[#1a0d05]">
      {n}
      <span className="sr-only"> pendentes</span>
    </span>
  );
}

export type Usuario = { nome: string; email: string; cor: string; demo: boolean };

export function BarraTopo({
  contadores,
  usuario,
  selo,
  sair,
}: {
  contadores: Record<string, number>;
  usuario: Usuario;
  selo?: ReactNode;
  sair?: () => Promise<void>;
}) {
  const atual = usePathname();
  const [maisAberto, setMaisAberto] = useState(false);
  const [contaAberta, setContaAberta] = useState(false);
  const refMais = useRef<HTMLLIElement>(null);
  const refConta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMaisAberto(false);
    setContaAberta(false);
  }, [atual]);

  useEffect(() => {
    const fora = (e: MouseEvent) => {
      if (refMais.current && !refMais.current.contains(e.target as Node)) setMaisAberto(false);
      if (refConta.current && !refConta.current.contains(e.target as Node)) setContaAberta(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (setMaisAberto(false), setContaAberta(false));
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  const emMais = ITENS.filter((i) => i.nivel >= 2);
  const maisAtivo = ITENS.some((i) => i.nivel === 3 && ativo(atual, i.href));
  const pendentesMais = ITENS.filter((i) => i.nivel === 3).reduce((a, i) => a + (contadores[i.href] ?? 0), 0);

  return (
    <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5">
      <div className="vidro mx-auto flex h-16 max-w-[1440px] items-center gap-3 rounded-full border border-areia pl-3 pr-2 shadow-cartao sm:pl-4">
        <Link href="/" aria-label="GTM Hub, início" className="shrink-0 rounded-full">
          <Logo />
        </Link>

        <nav aria-label="Principal" className="mx-auto hidden lg:block">
          <ul className="flex items-center gap-0.5 rounded-full border border-areia bg-black/25 p-1">
            {ITENS.filter((i) => i.nivel <= 2).map((i) => {
              const sel = ativo(atual, i.href);
              return (
                <li key={i.href} className={i.nivel === 2 ? "hidden xl:block" : undefined}>
                  <Link
                    href={i.href}
                    aria-current={sel ? "page" : undefined}
                    className={cn(
                      "flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-medium transition-[background,color,box-shadow] duration-200",
                      sel
                        ? "bg-azul text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_8px_20px_-8px_rgb(63_111_216/0.9)]"
                        : "text-tinta-2 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <i.icone aria-hidden className="size-4" />
                    {i.curto ?? i.nome}
                    <Contador n={contadores[i.href]} />
                  </Link>
                </li>
              );
            })}
            <li ref={refMais} className="relative">
              <button
                type="button"
                aria-expanded={maisAberto}
                aria-haspopup="menu"
                onClick={() => setMaisAberto((v) => !v)}
                className={cn(
                  "flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium transition-colors",
                  maisAtivo ? "bg-white/[0.1] text-white" : "text-tinta-2 hover:bg-white/[0.06] hover:text-white",
                )}
              >
                Mais
                <Contador n={pendentesMais} />
                <ChevronDown aria-hidden className={cn("size-4 transition-transform", maisAberto && "rotate-180")} />
              </button>
              {maisAberto && (
                <div
                  role="menu"
                  className="animate-entrar-modal absolute right-0 top-12 z-40 w-64 rounded-xl border border-areia-2 bg-superficie p-1.5 shadow-flutuante"
                >
                  {emMais.map((i) => {
                    const sel = ativo(atual, i.href);
                    return (
                      <Link
                        key={i.href}
                        role="menuitem"
                        href={i.href}
                        aria-current={sel ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm",
                          i.nivel === 2 && "xl:hidden",
                          sel ? "bg-azul-suave text-white" : "text-tinta-2 hover:bg-white/[0.06] hover:text-white",
                        )}
                      >
                        <i.icone aria-hidden className={cn("size-4", sel ? "text-azul-claro" : "text-tinta-3")} />
                        <span className="flex-1">{i.nome}</span>
                        <Contador n={contadores[i.href]} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </li>
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {selo}
          <div ref={refConta} className="relative">
            <button
              type="button"
              aria-expanded={contaAberta}
              aria-haspopup="menu"
              aria-label={`Conta de ${usuario.nome}`}
              onClick={() => setContaAberta((v) => !v)}
              className="flex h-12 items-center gap-2 rounded-full p-1 pr-1 hover:bg-white/[0.06] sm:pr-3"
            >
              <span
                className="grid size-10 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-white/10"
                style={{ background: usuario.cor }}
              >
                {usuario.nome.slice(0, 1)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-medium leading-tight text-white">{usuario.nome}</span>
                <span className="block text-[11px] leading-tight text-tinta-3">{usuario.demo ? "Demonstração" : "Sócio"}</span>
              </span>
            </button>
            {contaAberta && (
              <div role="menu" className="animate-entrar-modal absolute right-0 top-14 z-40 w-64 rounded-xl border border-areia-2 bg-superficie p-1.5 shadow-flutuante">
                <div className="px-3 py-2.5">
                  <p className="text-sm font-medium text-white">{usuario.nome}</p>
                  <p className="truncate text-xs text-tinta-3">{usuario.demo ? "Modo demonstração" : usuario.email}</p>
                </div>
                <Link role="menuitem" href="/equipe" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-tinta-2 hover:bg-white/[0.06] hover:text-white">
                  <Users aria-hidden className="size-4 text-tinta-3" /> Equipe
                </Link>
                {sair && (
                  <form action={sair}>
                    <button role="menuitem" className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm text-tinta-2 hover:bg-risco-suave hover:text-risco">
                      <LogOut aria-hidden className="size-4" /> Sair
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

const PRINCIPAIS = ITENS.filter((i) => i.nivel === 1);

export function BarraInferior({ contadores }: { contadores: Record<string, number> }) {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);
  const emPrincipal = PRINCIPAIS.some((p) => ativo(atual, p.href));
  const pendentes = ITENS.filter((i) => i.nivel > 1).reduce((a, i) => a + (contadores[i.href] ?? 0), 0);

  return (
    <>
      <nav aria-label="Atalhos" className="fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="vidro grid grid-cols-5 rounded-full border border-areia-2 p-1.5 shadow-flutuante">
          {PRINCIPAIS.map((p) => {
            const sel = ativo(atual, p.href);
            return (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={sel ? "page" : undefined}
                  className={cn(
                    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-medium transition-colors",
                    sel ? "bg-azul text-white" : "text-tinta-3",
                  )}
                >
                  <p.icone aria-hidden className="size-5" />
                  {p.curto ?? p.nome}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setAberto(true)}
              aria-expanded={aberto}
              className={cn(
                "relative flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-medium",
                !emPrincipal ? "bg-white/[0.1] text-white" : "text-tinta-3",
              )}
            >
              <Menu aria-hidden className="size-5" />
              Mais
              {pendentes > 0 && <span aria-hidden className="absolute right-4 top-2.5 size-2 rounded-full bg-quente" />}
            </button>
          </li>
        </ul>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu completo">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAberto(false)} />
          <div className="animate-entrar-modal absolute inset-x-3 bottom-3 max-h-[85dvh] overflow-y-auto rounded-3xl border border-areia-2 bg-superficie p-3 pb-[calc(env(safe-area-inset-bottom)+12px)] shadow-flutuante">
            <div className="mb-2 flex items-center justify-between pl-2">
              <Logo />
              <button onClick={() => setAberto(false)} aria-label="Fechar" className="grid size-11 place-items-center rounded-full text-tinta-2 hover:bg-white/[0.08]">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <ul className="grid grid-cols-2 gap-1.5">
              {ITENS.map((i) => {
                const sel = ativo(atual, i.href);
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={sel ? "page" : undefined}
                      className={cn(
                        "flex min-h-14 items-center gap-2.5 rounded-2xl border px-3 text-sm",
                        sel ? "border-azul/50 bg-azul-suave text-white" : "border-areia bg-white/[0.03] text-tinta-2",
                      )}
                    >
                      <i.icone aria-hidden className={cn("size-[18px] shrink-0", sel ? "text-azul-claro" : "text-tinta-3")} />
                      <span className="flex-1 leading-tight">{i.nome}</span>
                      <Contador n={contadores[i.href]} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
