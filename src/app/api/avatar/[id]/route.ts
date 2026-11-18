// Foto do avatar de um sócio. Só para quem está logado; o endereço leva a versão (?v=),
// então o navegador guarda a imagem e só baixa de novo quando a foto muda.
import { lerFotoSocio } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/** Data URL → tipo e bytes (para a rota servir a imagem). */
function decodificarFoto(dataUrl: string): { tipo: string; bytes: Buffer } | null {
  const m = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  return { tipo: m[1]!, bytes: Buffer.from(m[2]!, "base64") };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await exigirSocio();
  const { id } = await params;
  const foto = await lerFotoSocio(id);
  const img = foto ? decodificarFoto(foto) : null;
  if (!img) return new Response("Sem foto.", { status: 404 });
  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.tipo,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
