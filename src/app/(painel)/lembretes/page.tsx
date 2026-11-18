import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/base";
import { hojeISO } from "@/lib/formato";
import { fotoDoSocio } from "@/lib/regras/avatar";
import { listarProjetos, listarSocios, listarTodosLembretes } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { QuadroLembretes } from "./quadro";

export const metadata: Metadata = { title: "Lembretes" };

export default async function Lembretes() {
  const socio = await exigirSocio();
  const [itens, projetos, socios] = await Promise.all([listarTodosLembretes(), listarProjetos(), listarSocios()]);
  return (
    <>
      <CabecalhoPagina
        titulo="Lembretes"
        descricao="Lembretes e tarefas da empresa, soltos, por assunto ou ligados a um projeto. Marque como feito e acompanhe o que falta."
      />
      <QuadroLembretes
        itens={itens}
        projetos={projetos.filter((p) => p.situacao !== "entregue" || itens.some((l) => l.projetoId === p.id)).map((p) => ({ id: p.id, nome: p.nome }))}
        socios={socios.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor, foto: fotoDoSocio(s) }))}
        socioAtualId={socio.id}
        hoje={hojeISO()}
      />
    </>
  );
}
