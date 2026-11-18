"use client";
// Confirmação de ação destrutiva (AlertDialog), no lugar do window.confirm.
// Uso: const confirmar = useConfirmar();
//      confirmar({ titulo, descricao, rotulo: "Excluir projeto", pendente: "Excluindo…", acao: () => excluir(id) })
// A ação pode ser assíncrona: o diálogo fica aberto, com o botão em "Excluindo…", até ela terminar.
// Se ela lançar erro, a mensagem aparece no próprio diálogo e nada é fechado.
// Devolve true quando a ação terminou bem, false quando a pessoa cancelou.
import { AlertTriangle, Trash2, type LucideIcon } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Botao, cn } from "./base";

export type PedidoConfirmacao = {
  titulo: string;
  descricao: ReactNode;
  /** Texto do botão de confirmar, ex.: "Excluir projeto". */
  rotulo: string;
  /** Texto enquanto a ação roda, ex.: "Excluindo…". */
  pendente?: string;
  /** Destrutivo (vermelho, ícone de lixeira). Padrão: true. */
  perigo?: boolean;
  icone?: LucideIcon;
  acao?: () => unknown | Promise<unknown>;
};

type Estado = PedidoConfirmacao & { resolver: (ok: boolean) => void };

const Ctx = createContext<(p: PedidoConfirmacao) => Promise<boolean>>(async () => false);

export const useConfirmar = () => useContext(Ctx);

export function ProvedorConfirmacao({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Estado | null>(null);
  const confirmar = useCallback(
    (p: PedidoConfirmacao) =>
      new Promise<boolean>((resolver) => {
        setPedido({ ...p, resolver });
      }),
    [],
  );
  return (
    <Ctx.Provider value={confirmar}>
      {children}
      {pedido && <DialogoConfirmacao key={pedido.titulo + String(pedido.rotulo)} pedido={pedido} aoTerminar={() => setPedido(null)} />}
    </Ctx.Provider>
  );
}

function DialogoConfirmacao({ pedido, aoTerminar }: { pedido: Estado; aoTerminar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelar = useRef<HTMLButtonElement>(null);
  const [rodando, setRodando] = useState(false);
  const [erro, setErro] = useState("");
  const perigo = pedido.perigo ?? true;
  const Icone = pedido.icone ?? (perigo ? Trash2 : AlertTriangle);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    // Foco no "Cancelar": Enter por engano não apaga nada.
    requestAnimationFrame(() => cancelar.current?.focus());
  }, []);

  const fechar = (ok: boolean) => {
    if (rodando) return;
    ref.current?.close();
    pedido.resolver(ok);
    aoTerminar();
  };

  const confirmar = async () => {
    setErro("");
    setRodando(true);
    try {
      await pedido.acao?.();
      ref.current?.close();
      pedido.resolver(true);
      aoTerminar();
    } catch (e) {
      setErro(e instanceof Error && e.message ? e.message : "Não foi possível concluir. Tente de novo.");
      setRodando(false);
    }
  };

  return (
    <dialog
      ref={ref}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirmar-titulo"
      aria-describedby="confirmar-descricao"
      onCancel={(e) => {
        e.preventDefault();
        fechar(false);
      }}
      onClick={(e) => e.target === ref.current && fechar(false)}
      className="vidro-forte m-auto w-[calc(100%-24px)] max-w-md rounded-2xl p-0 text-tinta backdrop:bg-grafite/45 backdrop:backdrop-blur-[3px] open:animate-entrar-modal max-sm:mb-0 max-sm:w-full max-sm:max-w-none max-sm:rounded-b-none max-sm:open:animate-subir-folha"
    >
      <div className="flex gap-4 px-6 pb-2 pt-6">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", perigo ? "bg-risco-suave text-risco" : "bg-alerta-suave text-alerta")}>
          <Icone aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 pt-0.5">
          <h2 id="confirmar-titulo" className="text-lg font-semibold tracking-tight">
            {pedido.titulo}
          </h2>
          <div id="confirmar-descricao" className="mt-1.5 text-sm leading-relaxed text-tinta-3">
            {pedido.descricao}
          </div>
          {erro && (
            <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-risco">
              <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
              {erro}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 px-6 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 sm:flex-row sm:justify-end sm:pb-6">
        <Botao ref={cancelar} type="button" variante="secundario" onClick={() => fechar(false)} disabled={rodando}>
          Cancelar
        </Botao>
        <Botao type="button" variante={perigo ? "perigo" : "primario"} icone={perigo ? Trash2 : undefined} onClick={confirmar} disabled={rodando} aria-busy={rodando}>
          {rodando ? (pedido.pendente ?? "Aguarde…") : pedido.rotulo}
        </Botao>
      </div>
    </dialog>
  );
}
