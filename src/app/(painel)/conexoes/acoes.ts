"use server";
// Teste de uma conexão externa, a pedido de um sócio. Não grava nada e não envia nada.
import { z } from "zod";
import { IDS_CONEXAO, testarConexao } from "@/lib/conexoes";
import type { Teste } from "@/lib/conexoes/comum";
import { exigirSocio } from "@/lib/sessao";

export async function acaoTestarConexao(id: unknown): Promise<Teste> {
  await exigirSocio();
  const r = z.enum(IDS_CONEXAO).safeParse(id);
  if (!r.success) return { ok: false, detalhe: "Conexão desconhecida." };
  return testarConexao(r.data);
}
