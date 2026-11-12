import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/base";
import { listarHistorico } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { ListaHistorico } from "./lista";

export const metadata: Metadata = { title: "Histórico" };

export default async function Historico() {
  await exigirSocio();
  const eventos = await listarHistorico();
  return (
    <>
      <CabecalhoPagina titulo="Histórico de alterações"
        descricao="Toda criação, edição e exclusão: quem fez (sócio ou agente), o quê e quando. Nunca é editado nem apagado." />
      <ListaHistorico eventos={eventos} />
    </>
  );
}
