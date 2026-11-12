"use client";
import { useState } from "react";
import { Bot, Check, Inbox, PencilLine, X } from "lucide-react";
import { AreaTexto, Botao, CabecalhoCartao, Cartao, EstadoVazio } from "@/components/ui/base";
import { useAviso } from "@/components/ui/toast";
import type { Aprovacao } from "@/lib/demo/dados";
import { dataHora } from "@/lib/formato";

// Na demonstração as decisões ficam só nesta tela. Na Fase 7 gravam no banco com o histórico.
export function CaixaAprovacoes({ iniciais, socioNome }: { iniciais: Aprovacao[]; socioNome: string }) {
  const [itens, setItens] = useState(iniciais);
  const [editando, setEditando] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const avisar = useAviso();

  const decidir = (a: Aprovacao, decisao: "aprovou" | "recusou") => {
    setItens((l) => l.filter((x) => x.id !== a.id));
    setEditando(null);
    avisar({ tom: decisao === "aprovou" ? "ok" : "info", texto: `${socioNome} ${decisao}: ${a.titulo}` });
  };

  return (
    <Cartao className="animate-surgir">
      <CabecalhoCartao titulo="Caixa de aprovações" descricao={itens.length ? `${itens.length} aguardando decisão` : "Tudo decidido"} />
      {itens.length === 0 ? (
        <EstadoVazio icone={Inbox} titulo="Caixa vazia" texto="Quando um agente preparar uma ação, ela aparece aqui para um sócio decidir." />
      ) : (
        <ul className="divide-y divide-areia">
          {itens.map((a) => (
            <li key={a.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1.5 text-xs text-tinta-3"><Bot aria-hidden className="size-3.5 text-azul" />{a.agente} · {dataHora(a.criadaEm)}</p>
                  <h3 className="mt-1 font-semibold">{a.titulo}</h3>
                  <p className="text-xs text-tinta-3">{a.contexto}</p>
                  {editando === a.id ? (
                    <div className="mt-3">
                      <label htmlFor={`txt-${a.id}`} className="sr-only">Editar conteúdo</label>
                      <AreaTexto id={`txt-${a.id}`} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} />
                    </div>
                  ) : (
                    <p className="mt-3 rounded-md border-l-2 border-azul/40 bg-offwhite px-3 py-2.5 text-sm leading-relaxed text-tinta-2">{a.conteudo}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2 lg:flex-col">
                  <Botao icone={Check} onClick={() => decidir(a, "aprovou")}>{editando === a.id ? "Aprovar editado" : "Aprovar"}</Botao>
                  {editando !== a.id && (
                    <Botao variante="secundario" icone={PencilLine} onClick={() => { setEditando(a.id); setTexto(a.conteudo); }}>Editar</Botao>
                  )}
                  <Botao variante="fantasma" icone={X} onClick={() => decidir(a, "recusou")}>Recusar</Botao>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Cartao>
  );
}
