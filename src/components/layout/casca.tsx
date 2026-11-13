"use client";
// Casca do painel: barra lateral recolhível, barra superior (busca + "Novo") e paleta de comandos (Ctrl+K).
import { ClipboardCheck, CornerDownLeft, FlaskConical, Inbox, Plus, Search, UserPlus, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/components/ui/base";
import { Logo } from "./logo";
import { BarraInferior, GRUPOS, MenuLateral, type Usuario } from "./navegacao";

export type LeadBusca = { id: string; nome: string; etapa: string; cidade: string };

const COOKIE_MENU = "gtm-menu";

const ACOES: { nome: string; href: string; icone: LucideIcon; dica: string }[] = [
  { nome: "Novo lead", href: "/leads?novo=1", icone: UserPlus, dica: "Cadastrar um comércio no funil" },
  { nome: "Novo diagnóstico", href: "/diagnostico", icone: ClipboardCheck, dica: "Checklist de visita" },
  { nome: "Caixa de aprovações", href: "/automacao", icone: Inbox, dica: "Ações dos agentes esperando decisão" },
];

const normalizar = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function Casca({
  children,
  contadores,
  usuario,
  sair,
  recolhidaInicial,
  leads,
  data,
  selo,
}: {
  children: ReactNode;
  contadores: Record<string, number>;
  usuario: Usuario;
  sair?: () => Promise<void>;
  recolhidaInicial: boolean;
  leads: LeadBusca[];
  data: string;
  selo: string;
}) {
  const [recolhida, setRecolhida] = useState(recolhidaInicial);
  const [paletaAberta, setPaletaAberta] = useState(false);

  const alternar = useCallback(() => {
    setRecolhida((r) => {
      const novo = !r;
      document.cookie = `${COOKIE_MENU}=${novo ? "recolhido" : "aberto"}; path=/; max-age=31536000; samesite=lax`;
      return novo;
    });
  }, []);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletaAberta((v) => !v);
      }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-azul focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <MenuLateral contadores={contadores} usuario={usuario} sair={sair} recolhida={recolhida} aoAlternar={alternar} />

      <div className={cn("transition-[padding] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]", recolhida ? "lg:pl-[92px]" : "lg:pl-[272px]")}>
        <BarraSuperior data={data} selo={selo} aoBuscar={() => setPaletaAberta(true)} />
        <main id="conteudo" className="mx-auto max-w-[1360px] px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-8">
          {children}
        </main>
      </div>

      <BarraInferior contadores={contadores} usuario={usuario} sair={sair} />
      <Paleta aberta={paletaAberta} aoFechar={() => setPaletaAberta(false)} leads={leads} />
    </>
  );
}

function BarraSuperior({ data, selo, aoBuscar }: { data: string; selo: string; aoBuscar: () => void }) {
  const [novoAberto, setNovoAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const atual = usePathname();
  useEffect(() => setNovoAberto(false), [atual]);
  useEffect(() => {
    const fora = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setNovoAberto(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setNovoAberto(false);
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-offwhite/75 backdrop-blur-xl [mask-image:linear-gradient(to_bottom,black_85%,transparent)]">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center gap-3 px-4 sm:px-6 lg:px-10">
        <span className="shrink-0 lg:hidden">
          <Logo escuro compacto />
        </span>

        <button
          type="button"
          onClick={aoBuscar}
          className="group flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-full border border-areia-2 bg-papel px-4 text-left text-sm text-tinta-3 shadow-[0_1px_2px_rgb(18_21_31/0.04)] transition-colors hover:border-tinta-3/50 lg:max-w-md"
        >
          <Search aria-hidden className="size-4 shrink-0 text-tinta-3 group-hover:text-tinta" />
          <span className="truncate">Buscar lead, tela ou ação</span>
          <kbd className="ml-auto hidden shrink-0 rounded-md border border-areia bg-superficie-2 px-1.5 py-0.5 font-sans text-[11px] text-tinta-3 sm:inline">
            Ctrl K
          </kbd>
        </button>

        <p className="ml-auto hidden text-sm text-tinta-3 xl:block">
          <span className="inline-block first-letter:uppercase">{data}</span>
        </p>
        <span
          title={selo === "Demonstração" ? "Tudo em dados fictícios." : "Algumas telas ainda mostram dados fictícios."}
          className="hidden shrink-0 items-center gap-1.5 rounded-full bg-alerta-suave px-3 py-1.5 text-xs font-medium text-alerta ring-1 ring-inset ring-alerta/20 md:inline-flex"
        >
          <FlaskConical aria-hidden className="size-3.5" />
          {selo}
        </span>

        <div ref={ref} className="relative shrink-0 lg:ml-0">
          <button
            type="button"
            aria-expanded={novoAberto}
            aria-haspopup="menu"
            onClick={() => setNovoAberto((v) => !v)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-azul px-4 text-sm font-medium text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2),0_6px_16px_-6px_rgb(63_111_216/0.6)] transition-colors hover:bg-azul-escuro"
          >
            <Plus aria-hidden className="size-4" />
            <span className="hidden sm:inline">Novo</span>
            <span className="sr-only sm:hidden">Novo</span>
          </button>
          {novoAberto && (
            <div
              role="menu"
              className="animate-entrar-modal absolute right-0 top-13 z-40 w-72 rounded-xl border border-areia bg-papel p-1.5 shadow-flutuante"
            >
              {ACOES.slice(0, 2).map((a) => (
                <Link
                  key={a.href}
                  role="menuitem"
                  href={a.href}
                  className="flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-superficie-2"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-azul-suave text-azul-escuro">
                    <a.icone aria-hidden className="size-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-tinta">{a.nome}</span>
                    <span className="block text-xs text-tinta-3">{a.dica}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

type Opcao = { id: string; grupo: "Ações" | "Leads" | "Telas"; nome: string; detalhe?: string; href: string; icone: LucideIcon };

function Paleta({ aberta, aoFechar, leads }: { aberta: boolean; aoFechar: () => void; leads: LeadBusca[] }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const [busca, setBusca] = useState("");
  const [marcado, setMarcado] = useState(0);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberta && !d.open) {
      setBusca("");
      setMarcado(0);
      d.showModal();
      requestAnimationFrame(() => entrada.current?.focus());
    }
    if (!aberta && d.open) d.close();
  }, [aberta]);

  const opcoes = useMemo<Opcao[]>(() => {
    const q = normalizar(busca.trim());
    const bate = (...t: string[]) => !q || t.some((x) => normalizar(x).includes(q));
    const acoes: Opcao[] = ACOES.filter((a) => bate(a.nome, a.dica)).map((a) => ({
      id: `a${a.href}`, grupo: "Ações", nome: a.nome, detalhe: a.dica, href: a.href, icone: a.icone,
    }));
    const doFunil: Opcao[] = leads
      .filter((l) => q && bate(l.nome, l.cidade))
      .slice(0, 6)
      .map((l) => ({ id: `l${l.id}`, grupo: "Leads", nome: l.nome, detalhe: [l.etapa, l.cidade].filter(Boolean).join(" · "), href: `/leads/${l.id}`, icone: UserPlus }));
    const telas: Opcao[] = GRUPOS.flatMap((g) => g.itens.map((i) => ({ ...i, grupo: g.titulo })))
      .filter((i) => bate(i.nome, i.grupo))
      .map((i) => ({ id: `t${i.href}`, grupo: "Telas", nome: i.nome, detalhe: i.grupo, href: i.href, icone: i.icone }));
    return [...doFunil, ...acoes, ...telas];
  }, [busca, leads]);

  const ir = (o: Opcao | undefined) => {
    if (!o) return;
    aoFechar();
    router.push(o.href);
  };

  const teclado = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setMarcado((m) => Math.min(m + 1, opcoes.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setMarcado((m) => Math.max(m - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); ir(opcoes[marcado]); }
  };

  useEffect(() => {
    document.getElementById(`opcao-${marcado}`)?.scrollIntoView({ block: "nearest" });
  }, [marcado]);

  let ultimoGrupo = "";
  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      aria-label="Buscar no GTM Hub"
      className="mx-auto mt-[12vh] w-[calc(100%-24px)] max-w-xl rounded-2xl border border-areia bg-papel p-0 text-tinta shadow-flutuante backdrop:bg-grafite/40 backdrop:backdrop-blur-[2px] open:animate-entrar-modal"
    >
      <div className="flex items-center gap-3 border-b border-areia px-4">
        <Search aria-hidden className="size-5 shrink-0 text-tinta-3" />
        <label htmlFor="busca-global" className="sr-only">Buscar lead, tela ou ação</label>
        <input
          ref={entrada}
          id="busca-global"
          role="combobox"
          aria-expanded="true"
          aria-controls="opcoes-busca"
          aria-activedescendant={opcoes.length ? `opcao-${marcado}` : undefined}
          autoComplete="off"
          value={busca}
          onChange={(e) => { setBusca(e.target.value); setMarcado(0); }}
          onKeyDown={teclado}
          placeholder="Buscar lead, tela ou ação…"
          className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-tinta placeholder:text-tinta-3 focus:outline-none"
        />
        <button type="button" onClick={aoFechar} aria-label="Fechar busca" className="grid size-10 place-items-center rounded-full text-tinta-3 hover:bg-superficie-2 hover:text-tinta">
          <X aria-hidden className="size-4" />
        </button>
      </div>

      <ul id="opcoes-busca" role="listbox" aria-label="Resultados" className="rolagem-fina max-h-[min(60vh,440px)] overflow-y-auto p-2">
        {opcoes.length === 0 && (
          <li className="px-3 py-10 text-center text-sm text-tinta-3">Nada encontrado para “{busca}”. Tente o nome do comércio ou da tela.</li>
        )}
        {opcoes.map((o, i) => {
          const titulo = o.grupo !== ultimoGrupo ? o.grupo : null;
          ultimoGrupo = o.grupo;
          return (
            <li key={o.id} role="presentation">
              {titulo && <p className="px-3 pb-1 pt-3 text-xs font-medium text-tinta-3 first:pt-1">{titulo}</p>}
              <div
                id={`opcao-${i}`}
                role="option"
                aria-selected={i === marcado}
                onMouseMove={() => setMarcado(i)}
                onClick={() => ir(o)}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-3",
                  i === marcado ? "bg-azul-suave" : "",
                )}
              >
                <o.icone aria-hidden className={cn("size-4 shrink-0", i === marcado ? "text-azul-escuro" : "text-tinta-3")} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-tinta">{o.nome}</span>
                  {o.detalhe && <span className="block truncate text-xs text-tinta-3">{o.detalhe}</span>}
                </span>
                {i === marcado && <CornerDownLeft aria-hidden className="size-4 shrink-0 text-azul-escuro" />}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="hidden border-t border-areia px-4 py-2.5 text-xs text-tinta-3 sm:block">
        ↑ ↓ para escolher · Enter para abrir · Esc para fechar
      </p>
    </dialog>
  );
}
