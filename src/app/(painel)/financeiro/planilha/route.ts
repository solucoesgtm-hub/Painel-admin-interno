// Planilha do contador: extrato do mês em CSV (";" e vírgula decimal, abre no Excel em português).
import { lerBanco } from "@/lib/conexoes/banco";
import { hojeISO } from "@/lib/formato";
import { categoriaSaida, conciliar, mensalidadesDoMes, planilhaContador } from "@/lib/regras/financeiro";
import { listarContratos } from "@/lib/repositorio";
import { exigirSocio } from "@/lib/sessao";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await exigirSocio();
  const pedido = new URL(req.url).searchParams.get("mes") ?? "";
  const mes = /^\d{4}-(0[1-9]|1[0-2])$/.test(pedido) ? pedido : hojeISO().slice(0, 7);
  const [a, m] = mes.split("-").map(Number) as [number, number];
  const ultimo = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
  const hoje = hojeISO();
  const ate = ultimo < hoje ? ultimo : hoje;
  try {
    const [{ extrato }, contratos] = await Promise.all([lerBanco(`${mes}-01`, ate), listarContratos()]);
    const doMes = extrato
      .filter((l) => l.data.startsWith(mes))
      .map((l) => (l.tipo === "saida" ? { ...l, categoria: l.categoria ?? categoriaSaida(l.descricao) } : l));
    const { lancamentos } = conciliar(doMes, mensalidadesDoMes(contratos, `${mes}-15`));
    // BOM no início para o Excel reconhecer os acentos.
    return new Response(`﻿${planilhaContador(lancamentos)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="gtm-extrato-${mes}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Não foi possível ler o banco.", { status: 502 });
  }
}
