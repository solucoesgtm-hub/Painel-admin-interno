"use client";
// Avisos temporários (toasts). Use: const avisar = useAviso(); avisar({ tom: "ok", texto: "Salvo" })
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { cn } from "./base";

type Toast = { id: number; tom: "ok" | "risco" | "info"; texto: string };
const Ctx = createContext<(t: Omit<Toast, "id">) => void>(() => {});

export function ProvedorAvisos({ children }: { children: ReactNode }) {
  const [lista, setLista] = useState<Toast[]>([]);
  const avisar = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setLista((l) => [...l, { ...t, id }]);
    setTimeout(() => setLista((l) => l.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <Ctx.Provider value={avisar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-24 z-50 flex flex-col items-center gap-2 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      >
        {lista.map((t) => {
          const Icone = t.tom === "ok" ? CheckCircle2 : t.tom === "risco" ? XCircle : Info;
          return (
            <div
              key={t.id}
              role="status"
              className="animate-entrar-modal pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg bg-grafite px-4 py-3 text-sm text-offwhite shadow-flutuante"
            >
              <Icone
                aria-hidden
                className={cn("size-4 shrink-0", t.tom === "ok" ? "text-[#5fd08a]" : t.tom === "risco" ? "text-[#ff8f7a]" : "text-azul-claro")}
              />
              {t.texto}
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
}

export const useAviso = () => useContext(Ctx);
