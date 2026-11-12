"use client";
// Menu lateral escuro (computador) e barra inferior (celular).
import {
  BarChart3,
  Bot,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  FileSearch,
  FolderKanban,
  History,
  LayoutDashboard,
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
import { useEffect, useState } from "react";
import { cn } from "@/components/ui/base";
import { Logo } from "./logo";

type Item = { href: string; nome: string; icone: LucideIcon; contador?: number };
export type GrupoNav = { titulo: string; itens: Item[] };

export const GRUPOS: GrupoNav[] = [
  { titulo: "Visão geral", itens: [
    { href: "/", nome: "Início", icone: LayoutDashboard },
    { href: "/agenda", nome: "Agenda", icone: CalendarDays },
  ] },
  { titulo: "Comercial", itens: [
    { href: "/leads", nome: "Leads e clientes", icone: Workflow },
    { href: "/diagnostico", nome: "Diagnóstico", icone: ClipboardCheck },
    { href: "/analise", nome: "Análise de leads", icone: BarChart3 },
  ] },
  { titulo: "Entrega", itens: [
    { href: "/projetos", nome: "Projetos", icone: FolderKanban },
    { href: "/contratos", nome: "Contratos", icone: FileSignature },
    { href: "/produtos", nome: "Produtos", icone: Package },
  ] },
  { titulo: "Captação e gestão", itens: [
    { href: "/editais", nome: "Editais", icone: FileSearch },
    { href: "/financeiro", nome: "Financeiro", icone: Wallet },
    { href: "/automacao", nome: "Automação", icone: Bot },
  ] },
  { titulo: "Empresa", itens: [
    { href: "/equipe", nome: "Equipe", icone: Users },
    { href: "/historico", nome: "Histórico", icone: History },
  ] },
];

const ativo = (atual: string, href: string) => (href === "/" ? atual === "/" : atual.startsWith(href));

function ListaNav({ contadores, aoNavegar }: { contadores: Record<string, number>; aoNavegar?: () => void }) {
  const atual = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col gap-6">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-[0.14em] text-[#8b90a6]">{g.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {g.itens.map((i) => {
              const sel = ativo(atual, i.href);
              const c = contadores[i.href];
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={aoNavegar}
                    aria-current={sel ? "page" : undefined}
                    className={cn(
                      "group relative flex min-h-10 items-center gap-3 rounded-md px-3 text-[14px] transition-colors focus-visible:outline-azul-claro",
                      sel ? "bg-grafite-3 text-white" : "text-[#b9bdd0] hover:bg-grafite-2 hover:text-white",
                    )}
                  >
                    {sel && <span aria-hidden className="absolute -left-3 top-2 bottom-2 w-[3px] rounded-r bg-azul-claro" />}
                    <i.icone aria-hidden className={cn("size-[18px] shrink-0", sel ? "text-azul-claro" : "text-[#8b90a6] group-hover:text-[#cfd3e3]")} />
                    <span className="flex-1">{i.nome}</span>
                    {c ? (
                      <span className="numeros rounded-full bg-azul px-1.5 py-px text-[11px] font-semibold text-white">
                        {c}
                        <span className="sr-only"> pendentes</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function MenuLateral({ contadores, rodape }: { contadores: Record<string, number>; rodape: React.ReactNode }) {
  return (
    <aside className="textura-grade fixed inset-y-0 left-0 z-30 hidden w-[260px] flex-col bg-grafite lg:flex">
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>
      <div className="rolagem-fina flex-1 overflow-y-auto px-3 pb-6 pt-2">
        <ListaNav contadores={contadores} />
      </div>
      <div className="border-t border-white/8 p-3">{rodape}</div>
    </aside>
  );
}

const PRINCIPAIS = [
  { href: "/", nome: "Início", icone: LayoutDashboard },
  { href: "/leads", nome: "Leads", icone: Workflow },
  { href: "/diagnostico", nome: "Diagnóstico", icone: ClipboardCheck },
  { href: "/agenda", nome: "Agenda", icone: CalendarDays },
];

export function BarraInferior({ contadores, rodape }: { contadores: Record<string, number>; rodape: React.ReactNode }) {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);
  const emPrincipal = PRINCIPAIS.some((p) => ativo(atual, p.href));

  return (
    <>
      <nav
        aria-label="Atalhos"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-grafite pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {PRINCIPAIS.map((p) => {
            const sel = ativo(atual, p.href);
            return (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={sel ? "page" : undefined}
                  className={cn("flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]", sel ? "text-white" : "text-[#9a9fb5]")}
                >
                  <p.icone aria-hidden className={cn("size-5", sel && "text-azul-claro")} />
                  {p.nome}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              onClick={() => setAberto(true)}
              aria-expanded={aberto}
              className={cn("flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[11px]", !emPrincipal ? "text-white" : "text-[#9a9fb5]")}
            >
              <Menu aria-hidden className={cn("size-5", !emPrincipal && "text-azul-claro")} />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu completo">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-grafite/60" onClick={() => setAberto(false)} />
          <div className="textura-grade animate-entrar-modal absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-2xl bg-grafite px-3 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
            <div className="mb-3 flex items-center justify-between px-3">
              <Logo />
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="grid size-11 place-items-center rounded-md text-[#b9bdd0] hover:bg-grafite-2"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <ListaNav contadores={contadores} aoNavegar={() => setAberto(false)} />
            <div className="mt-4 border-t border-white/8 pt-3">{rodape}</div>
          </div>
        </div>
      )}
    </>
  );
}
