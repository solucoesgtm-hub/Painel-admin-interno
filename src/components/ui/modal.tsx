"use client";
// Modal acessível usando <dialog> nativo: foco preso, Esc fecha, fundo inerte.
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./base";

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  rodape,
  largura = "md",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: ReactNode;
  rodape?: ReactNode;
  largura?: "sm" | "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      onClose={aoFechar}
      onClick={(e) => e.target === ref.current && aoFechar()}
      aria-labelledby="modal-titulo"
      className={cn(
        "m-auto w-[calc(100%-24px)] rounded-xl border border-areia bg-papel p-0 text-tinta shadow-flutuante backdrop:bg-grafite/50 backdrop:backdrop-blur-[2px] open:animate-entrar-modal",
        { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[largura],
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-areia px-6 py-5">
        <div>
          <h2 id="modal-titulo" className="text-lg font-semibold tracking-tight">
            {titulo}
          </h2>
          {descricao && <p className="mt-1 text-sm text-tinta-3">{descricao}</p>}
        </div>
        <button
          type="button"
          onClick={aoFechar}
          aria-label="Fechar"
          className="grid size-11 shrink-0 place-items-center rounded-md text-tinta-3 hover:bg-areia/60 hover:text-tinta"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <div className="max-h-[70dvh] overflow-y-auto px-6 py-5">{children}</div>
      {rodape && (
        <div className="flex flex-col-reverse gap-2 border-t border-areia bg-offwhite/50 px-6 py-4 sm:flex-row sm:justify-end">
          {rodape}
        </div>
      )}
    </dialog>
  );
}
