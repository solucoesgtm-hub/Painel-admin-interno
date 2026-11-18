"use client";
import { useState, useTransition } from "react";
import { PlugZap } from "lucide-react";
import { Botao, Etiqueta } from "@/components/ui/base";
import type { Teste } from "@/lib/conexoes/comum";
import type { IdConexao } from "@/lib/conexoes";
import { acaoTestarConexao } from "./acoes";

export function TestarConexao({ id, nome }: { id: IdConexao; nome: string }) {
  const [resultado, setResultado] = useState<Teste | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-col items-start gap-2">
      <Botao
        variante="secundario"
        icone={PlugZap}
        disabled={pendente}
        aria-label={`Testar conexão: ${nome}`}
        onClick={() =>
          iniciar(async () => {
            setResultado(await acaoTestarConexao(id).catch(() => ({ ok: false, detalhe: "Falha ao testar." })));
          })
        }
      >
        {pendente ? "Testando…" : "Testar"}
      </Botao>
      <p aria-live="polite" className="text-xs text-tinta-3">
        {resultado && (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Etiqueta tom={resultado.ok ? "ok" : "risco"}>{resultado.ok ? "Funcionando" : "Com problema"}</Etiqueta>
            {resultado.detalhe}
          </span>
        )}
      </p>
    </div>
  );
}
