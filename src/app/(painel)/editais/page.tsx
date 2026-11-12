import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, FileUp, Link2, Radar, ShieldCheck } from "lucide-react";
import { Botao, CabecalhoCartao, CabecalhoPagina, Cartao, Etiqueta, Tabela, Td, Th, Tr } from "@/components/ui/base";
import { EtiquetaVereditoEdital, SITUACAO_EDITAL } from "./comum";
import { EDITAIS, PERFIL_GTM } from "@/lib/demo/dados";
import { brl, data, diasEntre, hojeISO } from "@/lib/formato";
import { vereditoEdital } from "@/lib/regras/editais";
import { exigirSocio } from "@/lib/sessao";

export const metadata: Metadata = { title: "Editais" };

export default async function Editais() {
  await exigirSocio();
  const hoje = hojeISO();
  const ordenados = [...EDITAIS].sort((a, b) => a.prazo.localeCompare(b.prazo));

  return (
    <>
      <CabecalhoPagina sobretitulo="Captação" titulo="Triagem de editais"
        descricao="Cada requisito é comparado ao Perfil GTM com página e trecho do edital. Sem página citada, fica como Verificar."
        acoes={<>
          <Botao variante="secundario" icone={Link2} disabled title="Disponível na Fase 3">Por link</Botao>
          <Botao icone={FileUp} disabled title="Disponível na Fase 3">Enviar PDF</Botao>
        </>} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <Cartao className="animate-surgir">
          <CabecalhoCartao titulo="Editais" descricao={`${EDITAIS.length} na lista · ordenados pelo prazo`} />
          <Tabela rotulo="Lista de editais">
            <thead><tr><Th>Edital</Th><Th>Situação</Th><Th>Veredito</Th><Th>Prazo</Th><Th className="text-right">Valor</Th></tr></thead>
            <tbody>
              {ordenados.map((e) => {
                const dias = diasEntre(hoje, e.prazo);
                return (
                  <Tr key={e.id}>
                    <Td className="max-w-sm">
                      <Link href={`/editais/${e.id}`} className="font-medium hover:text-azul">{e.numero}</Link>
                      <p className="line-clamp-1 text-xs text-tinta-3">{e.orgao}</p>
                      {e.origem === "radar" && <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-azul"><Radar aria-hidden className="size-3" />Encontrado pelo radar</span>}
                    </Td>
                    <Td><Etiqueta tom={SITUACAO_EDITAL[e.situacao].tom}>{SITUACAO_EDITAL[e.situacao].nome}</Etiqueta></Td>
                    <Td><EtiquetaVereditoEdital v={vereditoEdital(e.requisitos)} /></Td>
                    <Td>
                      <p className="numeros text-[13px]">{data(e.prazo)}</p>
                      <p className={`text-xs ${dias < 0 ? "text-tinta-3" : dias <= 7 ? "font-medium text-risco" : "text-tinta-3"}`}>{dias < 0 ? "Encerrado" : `faltam ${dias} dias`}</p>
                    </Td>
                    <Td className="numeros text-right">{brl(e.valor)}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Tabela>
        </Cartao>

        <div className="space-y-4">
          <Cartao className="animate-surgir escala-2">
            <CabecalhoCartao titulo="Perfil GTM" descricao="Base da comparação de requisitos" />
            <dl className="space-y-3 p-5 text-sm">
              <div><dt className="text-xs text-tinta-3">Tipo de empresa</dt><dd>{PERFIL_GTM.tipo}</dd></div>
              <div className="flex gap-6">
                <div><dt className="text-xs text-tinta-3">Abertura</dt><dd>{data(PERFIL_GTM.abertura)}</dd></div>
                <div><dt className="text-xs text-tinta-3">Município</dt><dd>{PERFIL_GTM.municipio}</dd></div>
              </div>
              <div>
                <dt className="mb-1.5 text-xs text-tinta-3">Certidões</dt>
                <dd>
                  <ul className="space-y-1.5">
                    {PERFIL_GTM.certidoes.map((c) => {
                      const dias = diasEntre(hoje, c.validade);
                      return (
                        <li key={c.nome} className="flex items-center justify-between gap-2">
                          <span className="text-[13px]">{c.nome}</span>
                          <Etiqueta tom={dias < 0 ? "risco" : dias <= 15 ? "alerta" : "ok"}>{dias < 0 ? "Vencida" : `até ${data(c.validade).slice(0, 5)}`}</Etiqueta>
                        </li>
                      );
                    })}
                  </ul>
                </dd>
              </div>
            </dl>
          </Cartao>
          <Cartao className="animate-surgir escala-3 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold"><Radar aria-hidden className="size-4 text-azul" />Radar semanal</p>
            <p className="mt-1 text-sm text-tinta-3">Verifica a lista de páginas de editais toda segunda às 06:00 e envia os novos para a Caixa de aprovações.</p>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-tinta-2"><CalendarClock aria-hidden className="size-3.5" />Última execução há 2 dias · 2 novos</p>
          </Cartao>
          <p className="flex gap-2 px-1 text-xs text-tinta-3"><ShieldCheck aria-hidden className="size-4 shrink-0 text-ok" />A leitura com IA nunca envia nada ao órgão: toda inscrição é feita por um sócio.</p>
        </div>
      </div>
    </>
  );
}
