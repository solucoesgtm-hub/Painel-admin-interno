// Botão de link (adaptado do "Link button" da BoardUI): ação em texto, sem fundo nem borda,
// só o rótulo (e ícones) com sublinhado ao passar o mouse.
// Vira <Link> do Next para endereços internos, <a> para externos (abre em nova aba) e <button> sem href.
// Variantes: primario (azul) e secundario (tinta suave). Tamanhos: medio, pequeno, mini.
// O alvo de toque fica com 44 px de altura (min-h-11) sem mudar o desenho: o espaço extra é invisível.
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "./base";

type Variante = "primario" | "secundario";
type Tamanho = "medio" | "pequeno" | "mini";

type Base = {
  variante?: Variante;
  tamanho?: Tamanho;
  iconeInicio?: LucideIcon;
  iconeFim?: LucideIcon;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  /** Mantém a altura mínima de toque (44 px). Desligue só dentro de texto corrido. */
  alvo?: boolean;
};

type ComoLink = Base & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & { href: string };
type ComoBotao = Base & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & { href?: undefined };

const estilo = {
  base: "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-sm font-medium underline-offset-[3px] transition-colors duration-150 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:no-underline aria-disabled:cursor-not-allowed aria-disabled:no-underline",
  tamanho: { medio: "text-[15px]", pequeno: "text-sm", mini: "text-xs font-semibold" },
  icone: { medio: "size-5 shrink-0", pequeno: "size-[18px] shrink-0", mini: "size-3.5 shrink-0" },
  variante: {
    primario: "text-azul-escuro active:text-azul disabled:text-tinta-3 aria-disabled:text-tinta-3",
    secundario: "text-tinta-2 active:text-tinta disabled:text-tinta-3 aria-disabled:text-tinta-3",
  },
} as const;

export function BotaoTexto(props: ComoLink | ComoBotao) {
  const { variante = "primario", tamanho = "pequeno", iconeInicio: Inicio, iconeFim: Fim, children, className, disabled = false, alvo = true, ...resto } = props;
  const classes = cn(estilo.base, estilo.tamanho[tamanho], estilo.variante[variante], alvo && "min-h-11", className);
  const conteudo = (
    <>
      {Inicio && <Inicio aria-hidden className={estilo.icone[tamanho]} />}
      {children !== undefined && children !== null && <span>{children}</span>}
      {Fim && <Fim aria-hidden className={estilo.icone[tamanho]} />}
    </>
  );

  if (typeof resto.href === "string") {
    const { href, ...a } = resto as Omit<ComoLink, keyof Base>;
    if (disabled) {
      return (
        <a aria-disabled className={classes} {...a}>
          {conteudo}
        </a>
      );
    }
    const externo = /^(https?:|mailto:|tel:)/i.test(href);
    if (externo) {
      return (
        <a href={href} className={classes} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})} {...a}>
          {conteudo}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...a}>
        {conteudo}
      </Link>
    );
  }

  const { type = "button", ...b } = resto as Omit<ComoBotao, keyof Base>;
  return (
    <button type={type} disabled={disabled} className={classes} {...b}>
      {conteudo}
    </button>
  );
}
