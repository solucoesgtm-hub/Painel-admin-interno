"use client";
// Navegação: barra lateral grafite (computador) e barra inferior + menu completo (celular).
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
import { useEffect, useState } from "react";
import { cn } from "@/components/ui/base";
import { Logo } from "./logo";

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
      { href: "/analise", nome: "Análise de leads", icone: BarChart3 },
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

const ativo = (atual: string, href: string) => (href === "/" ? atual === "/" : atual.startsWith(href));

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

function Conta({ usuario, sair }: { usuario: Usuario; sair?: () => Promise<void> }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white ring-2 ring-white/10"
        style={{ background: usuario.cor }}
      >
        {usuario.nome.slice(0, 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{usuario.nome}</p>
        <p className="truncate text-xs text-nevoa">{usuario.demo ? "Modo demonstração" : usuario.email}</p>
      </div>
      {sair && (
        <form action={sair}>
          <button
            aria-label="Sair"
            title="Sair"
            className="grid size-10 place-items-center rounded-full text-nevoa transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut aria-hidden className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}

function ListaNav({ contadores, aoNavegar }: { contadores: Record<string, number>; aoNavegar?: () => void }) {
  const atual = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col gap-7">
      {GRUPOS.map((g) => (
        <div key={g.titulo}>
          <p className="mb-2 px-3 text-[12px] font-medium text-nevoa/80">{g.titulo}</p>
          <ul className="flex flex-col gap-0.5">
            {g.itens.map((i) => {
              const sel = ativo(atual, i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={aoNavegar}
                    aria-current={sel ? "page" : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[14px] transition-[background,color] duration-150 focus-visible:outline-azul-claro",
                      sel
                        ? "bg-azul text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_8px_20px_-10px_rgb(63_111_216/0.9)]"
                        : "text-[#c3c8d8] hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <i.icone aria-hidden className={cn("size-[18px] shrink-0", sel ? "text-white" : "text-nevoa group-hover:text-white")} />
                    <span className="flex-1">{i.nome}</span>
                    <Contador n={contadores[i.href]} />
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

export function MenuLateral({
  contadores,
  usuario,
  sair,
}: {
  contadores: Record<string, number>;
  usuario: Usuario;
  sair?: () => Promise<void>;
}) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] flex-col bg-grafite lg:flex">
      <span aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-azul/25 blur-3xl" />
      <div className="relative flex h-20 items-center px-6">
        <Link href="/" aria-label="GTM Hub, início" className="rounded-lg">
          <Logo />
        </Link>
      </div>
      <div className="rolagem-escura relative flex-1 overflow-y-auto px-3 pb-6 pt-2">
        <ListaNav contadores={contadores} />
      </div>
      <div className="relative border-t border-white/[0.07] p-3">
        <Conta usuario={usuario} sair={sair} />
      </div>
    </aside>
  );
}

const PRINCIPAIS: Item[] = [
  { href: "/", nome: "Início", icone: LayoutDashboard },
  { href: "/leads", nome: "Leads", icone: Workflow },
  { href: "/diagnostico", nome: "Diagnóstico", icone: ClipboardCheck },
  { href: "/agenda", nome: "Agenda", icone: CalendarDays },
];

export function BarraInferior({
  contadores,
  usuario,
  sair,
}: {
  contadores: Record<string, number>;
  usuario: Usuario;
  sair?: () => Promise<void>;
}) {
  const atual = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [atual]);
  const emPrincipal = PRINCIPAIS.some((p) => ativo(atual, p.href));
  const pendentes = TODOS.filter((i) => !PRINCIPAIS.some((p) => p.href === i.href)).reduce(
    (a, i) => a + (contadores[i.href] ?? 0),
    0,
  );

  return (
    <>
      <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-40 bg-grafite pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul className="grid grid-cols-5 px-1.5 py-1.5">
          {PRINCIPAIS.map((p) => {
            const sel = ativo(atual, p.href);
            return (
              <li key={p.href}>
                <Link
                  href={p.href}
                  aria-current={sel ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium",
                    sel ? "bg-white/[0.08] text-white" : "text-nevoa",
                  )}
                >
                  <p.icone aria-hidden className={cn("size-5", sel && "text-azul-claro")} />
                  {p.nome}
                  <span className="absolute right-2.5 top-1.5">
                    <Contador n={contadores[p.href]} />
                  </span>
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
                "relative flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium",
                !emPrincipal ? "bg-white/[0.08] text-white" : "text-nevoa",
              )}
            >
              <Menu aria-hidden className={cn("size-5", !emPrincipal && "text-azul-claro")} />
              Mais
              {pendentes > 0 && <span aria-hidden className="absolute right-5 top-2.5 size-2 rounded-full bg-[#ff8a4c]" />}
            </button>
          </li>
        </ul>
      </nav>

      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu completo">
          <button aria-label="Fechar menu" className="absolute inset-0 bg-grafite/50" onClick={() => setAberto(false)} />
          <div className="animate-entrar-modal rolagem-escura absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-grafite px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
            <div className="mb-3 flex items-center justify-between pl-3">
              <Logo />
              <button
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="grid size-11 place-items-center rounded-full text-nevoa hover:bg-white/10 hover:text-white"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <ListaNav contadores={contadores} aoNavegar={() => setAberto(false)} />
            <div className="mt-4 border-t border-white/[0.07] pt-2">
              <Conta usuario={usuario} sair={sair} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
