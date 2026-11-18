import type { Metadata } from "next";
import { CabecalhoPagina } from "@/components/ui/base";
import { fotoDoSocio } from "@/lib/regras/avatar";
import { listarIdeias, listarSocios } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { MuralIdeias } from "./mural";

export const metadata: Metadata = { title: "Ideias" };

export default async function Ideias() {
  const socio = await exigirSocio();
  const [ideias, socios] = await Promise.all([listarIdeias(), listarSocios()]);
  return (
    <>
      <CabecalhoPagina
        titulo="Ideias"
        descricao="O mural dos sócios: publique uma ideia, veja o que os outros acharam e finalize quando ela sair do papel."
      />
      <MuralIdeias ideias={ideias} socios={socios.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor, foto: fotoDoSocio(s) }))} socioAtualId={socio.id} />
    </>
  );
}
