import { SearchX } from "lucide-react";
import { BotaoLink, Cartao, EstadoVazio } from "@/components/ui/base";

export default function NaoEncontrado() {
  return (
    <Cartao>
      <EstadoVazio icone={SearchX} titulo="Não encontramos este registro" texto="Ele pode ter sido excluído ou o link está incompleto."
        acao={<BotaoLink href="/" variante="primario">Voltar ao início</BotaoLink>} />
    </Cartao>
  );
}
