"use client";
// Trocar ou remover a própria foto. O navegador corta no centro e reduz para 256 px
// antes de enviar, então a foto fica leve (poucos KB) e nunca sai do tamanho certo.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Camera, Trash2 } from "lucide-react";
import { BotaoTexto } from "@/components/ui/botao-link";
import { useConfirmar } from "@/components/ui/confirmar";
import { useAviso } from "@/components/ui/toast";
import { MAX_FOTO } from "@/lib/regras/avatar";
import { acaoSalvarFoto } from "./acoes";

const LADO = 256;

async function reduzir(arquivo: File): Promise<string> {
  const img = await createImageBitmap(arquivo);
  const lado = Math.min(img.width, img.height);
  const c = document.createElement("canvas");
  c.width = LADO;
  c.height = LADO;
  const g = c.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
  img.close();
  // WebP quando o navegador sabe gerar; senão JPEG (Safari antigo).
  const webp = c.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : c.toDataURL("image/jpeg", 0.85);
}

export function TrocarFoto({ temFoto }: { temFoto: boolean }) {
  const router = useRouter();
  const avisar = useAviso();
  const confirmar = useConfirmar();
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    if (!arquivo.type.startsWith("image/")) return avisar({ tom: "risco", texto: "Escolha um arquivo de imagem." });
    setEnviando(true);
    try {
      const foto = await reduzir(arquivo);
      if (foto.length > MAX_FOTO) throw new Error("A imagem ficou grande demais. Tente outra.");
      const r = await acaoSalvarFoto(foto);
      if (!r.ok) throw new Error(r.mensagem);
      avisar({ tom: "ok", texto: "Foto atualizada" });
      router.refresh();
    } catch (e) {
      avisar({ tom: "risco", texto: e instanceof Error ? e.message : "Não foi possível usar essa imagem." });
    } finally {
      setEnviando(false);
      if (entrada.current) entrada.current.value = "";
    }
  };

  const remover = async () => {
    const ok = await confirmar({
      titulo: "Remover sua foto?",
      descricao: "Seu avatar volta a mostrar as iniciais em todo o painel. Você pode enviar outra foto quando quiser.",
      rotulo: "Remover foto",
      pendente: "Removendo…",
      acao: async () => {
        const r = await acaoSalvarFoto(null);
        if (!r.ok) throw new Error(r.mensagem);
      },
    });
    if (!ok) return;
    avisar({ tom: "ok", texto: "Foto removida" });
    router.refresh();
  };

  return (
    <div id="minha-foto" className="mt-2 flex flex-wrap items-center gap-x-4">
      <input ref={entrada} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => escolher(e.target.files?.[0])} />
      <BotaoTexto iconeInicio={Camera} tamanho="mini" onClick={() => entrada.current?.click()} disabled={enviando}>
        {enviando ? "Enviando…" : temFoto ? "Trocar foto" : "Adicionar foto"}
      </BotaoTexto>
      {temFoto && (
        <BotaoTexto variante="secundario" iconeInicio={Trash2} tamanho="mini" onClick={remover} disabled={enviando}>
          Remover
        </BotaoTexto>
      )}
    </div>
  );
}
