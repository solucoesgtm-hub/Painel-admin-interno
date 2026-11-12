import type { Metadata } from "next";
import { Package, Users } from "lucide-react";
import { CabecalhoPagina, Cartao } from "@/components/ui/base";
import { PRODUTOS } from "@/lib/demo/dados";
import { brl } from "@/lib/formato";
import { exigirSocio } from "@/lib/sessao";

export const metadata: Metadata = { title: "Produtos" };

export default async function Produtos() {
  await exigirSocio();
  const receita = PRODUTOS.reduce((a, p) => a + p.mensalidade * p.clientesAtivos, 0);
  return (
    <>
      <CabecalhoPagina sobretitulo="Entrega" titulo="Produtos"
        descricao={`Catálogo do que a GTM vende. Receita recorrente do catálogo: ${brl(receita)} por mês.`} />
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PRODUTOS.map((p, i) => (
          <li key={p.id} className={`animate-surgir escala-${i + 1}`}>
            <Cartao className="flex h-full flex-col overflow-hidden">
              <div className="textura-grade flex items-center justify-between bg-gradient-to-br from-azul/25 to-transparent px-5 py-4">
                <span className="grid size-10 place-items-center rounded-md bg-azul/20 text-azul-claro"><Package aria-hidden className="size-5" /></span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white">
                  <Users aria-hidden className="size-3.5" /><span className="numeros">{p.clientesAtivos}</span> {p.clientesAtivos === 1 ? "cliente" : "clientes"}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-base font-semibold tracking-tight">{p.nome}</h2>
                <p className="mt-1 flex-1 text-sm text-tinta-3">{p.descricao}</p>
                <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-areia pt-4">
                  <div><dt className="text-xs text-tinta-3">Implantação</dt><dd className="numeros text-lg font-semibold">{brl(p.implantacao)}</dd></div>
                  <div><dt className="text-xs text-tinta-3">Mensalidade</dt><dd className="numeros text-lg font-semibold text-azul-claro">{brl(p.mensalidade)}</dd></div>
                </dl>
              </div>
            </Cartao>
          </li>
        ))}
      </ul>
    </>
  );
}
