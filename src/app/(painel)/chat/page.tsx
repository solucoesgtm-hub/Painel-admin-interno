import type { Metadata } from "next";
import { listarMensagens, listarSocios, marcarChatLido } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";
import { ProvedorPresenca } from "@/components/presenca";
import { chavePublicaPush } from "@/lib/push";
import { Conversa } from "./conversa";

export const metadata: Metadata = { title: "Chat" };

export default async function Chat() {
  const socio = await exigirSocio();
  const [mensagens, socios] = await Promise.all([listarMensagens(), listarSocios(), marcarChatLido(socio)]);
  return (
    <ProvedorPresenca inicial={socios} agoraServidor={new Date().toISOString()}>
    <Conversa
      iniciais={mensagens}
      socios={socios.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }))}
      socioAtualId={socio.id}
      cursorInicial={new Date().toISOString()}
      chavePush={chavePublicaPush()}
    />
    </ProvedorPresenca>
  );
}
