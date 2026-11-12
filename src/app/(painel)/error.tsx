"use client";
import { RotateCcw } from "lucide-react";
import { Botao, Cartao, EstadoErro } from "@/components/ui/base";

export default function Erro({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Cartao>
      <EstadoErro
        texto={`Algo falhou ao montar esta tela. Tente de novo; se continuar, avise o Gabriel com o código ${error.digest ?? "sem código"}.`}
        acao={<Botao icone={RotateCcw} onClick={reset}>Tentar de novo</Botao>}
      />
    </Cartao>
  );
}
