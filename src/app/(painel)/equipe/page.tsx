import type { Metadata } from "next";
import { Mail, ShieldCheck } from "lucide-react";
import { Avatar, CabecalhoPagina, Cartao, Etiqueta } from "@/components/ui/base";
import { PROJETOS } from "@/lib/demo/dados";
import { listarLeads, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export const metadata: Metadata = { title: "Equipe" };

export default async function Equipe() {
  const eu = await exigirSocio();
  const [socios, leads] = await Promise.all([listarSocios(), listarLeads()]);
  return (
    <>
      <CabecalhoPagina sobretitulo="Empresa" titulo="Equipe" descricao="Os três sócios são administradores, cada um com login próprio." />
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {socios.map((s, i) => {
          const meusLeads = leads.filter((l) => l.donoId === s.id && !["perdido", "manutencao"].includes(l.etapa)).length;
          const meusProjetos = PROJETOS.filter((p) => p.donoId === s.id && p.situacao !== "entregue").length;
          return (
            <li key={s.id} className={`animate-surgir escala-${i + 1}`}>
              <Cartao className="overflow-hidden">
                <div className="h-16" style={{ background: `linear-gradient(120deg, ${s.cor}, rgb(8 10 16 / 0))` }} />
                <div className="-mt-7 px-5 pb-5">
                  <Avatar nome={s.nome} cor={s.cor} tamanho="lg" />
                  <div className="mt-3 flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{s.nome}</h2>
                    {s.id === eu.id && <Etiqueta tom="info">Você</Etiqueta>}
                  </div>
                  <p className="text-sm font-medium text-azul-claro">{s.area}</p>
                  <p className="mt-1 text-sm text-tinta-3">{s.foco}</p>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-tinta-3"><Mail aria-hidden className="size-3.5" />{s.email}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-areia pt-4">
                    <div><dt className="text-xs text-tinta-3">Leads abertos</dt><dd className="numeros text-xl font-semibold">{meusLeads}</dd></div>
                    <div><dt className="text-xs text-tinta-3">Projetos ativos</dt><dd className="numeros text-xl font-semibold">{meusProjetos}</dd></div>
                  </dl>
                  <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-ok"><ShieldCheck aria-hidden className="size-3.5" />Administrador</p>
                </div>
              </Cartao>
            </li>
          );
        })}
      </ul>
    </>
  );
}
