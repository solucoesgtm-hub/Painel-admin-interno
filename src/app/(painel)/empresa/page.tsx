import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CalendarDays,
  CalendarX2,
  FileSignature,
  Globe,
  Info,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ReceiptText,
} from "lucide-react";
import {
  Avatar,
  Aviso,
  BotaoLink,
  CabecalhoCartao,
  CabecalhoPagina,
  Cartao,
  EstadoVazio,
  Etiqueta,
  Medidor,
} from "@/components/ui/base";
import { FATURAMENTO_MESES, MEI } from "@/lib/demo/dados";
import { brl, data, dataCurta, diaSemana, hojeISO, pct, somarDias } from "@/lib/formato";
import { camposFaltando, estadoContrato, resumoContratos } from "@/lib/regras/empresa";
import { limiteMei, situacaoMei } from "@/lib/regras/mei";
import { buscarEmpresa, listarContratos, listarEventos, listarLeads, listarSocios } from "@/lib/repositorio";
import { emailContaServico } from "@/lib/google-agenda";
import { exigirSocio } from "@/lib/sessao";
import { BotaoNovoContrato, EtiquetaContrato } from "../contratos/gestao";
import { Copiar, EditarEmpresa } from "./formularios";

export const metadata: Metadata = { title: "Nossa empresa" };

export default async function NossaEmpresa() {
  await exigirSocio();
  const hoje = hojeISO();
  const [empresa, socios, contratos, leads, agenda] = await Promise.all([
    buscarEmpresa(),
    listarSocios(),
    listarContratos(),
    listarLeads(),
    listarEventos(hoje, somarDias(hoje, 7)),
  ]);

  const faltando = camposFaltando(empresa);
  const resumo = resumoContratos(contratos);
  const atencao = contratos
    .map((c) => ({ c, e: estadoContrato(c) }))
    .filter(({ e }) => e.tipo !== "vigente" && e.tipo !== "encerrado")
    .slice(0, 4);

  // Financeiro: ainda vem do provedor de demonstração (ver /financeiro).
  const mes = FATURAMENTO_MESES.at(-1)!;
  const resultado = mes.entradas - mes.saidas;
  const ano = Number(hoje.slice(0, 4));
  const limite = limiteMei(ano, new Date(`${MEI.abertura}T12:00:00`));
  const mei = situacaoMei(MEI.faturadoNoAno, limite);
  const provedorDemo = (process.env.PROVEDOR_BANCARIO ?? "demo") === "demo";

  const fone = empresa.telefone.replace(/\D/g, "");
  const eventos = [...agenda.eventos].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio)).slice(0, 8);
  const nomeSocio = (id: string) => socios.find((s) => s.id === id)?.nome ?? "Agenda da GTM";
  const contaGoogle = emailContaServico();

  return (
    <>
      <CabecalhoPagina
        titulo="Nossa empresa"
        descricao="Cadastro, contratos, caixa e agenda da GTM em um só lugar."
        acoes={<EditarEmpresa empresa={empresa} />}
      />

      {faltando.length > 0 && (
        <Aviso tom="alerta" titulo="Cadastro incompleto" className="mb-4">
          Falta preencher {faltando.join(", ")}. Use “Editar dados” para completar.
        </Aviso>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Cadastro */}
        <Cartao className="animate-surgir escala-1 xl:col-span-2">
          <CabecalhoCartao
            titulo={empresa.nomeFantasia || empresa.razaoSocial || "Dados da empresa"}
            descricao={empresa.nomeFantasia && empresa.razaoSocial ? empresa.razaoSocial : "Dados de cadastro para propostas, notas e editais"}
          />
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <Linha icone={ReceiptText} rotulo="CNPJ" valor={empresa.cnpj} copiar numeros />
            <Linha icone={Mail} rotulo="E-mail" valor={empresa.email} href={empresa.email ? `mailto:${empresa.email}` : undefined} copiar />
            <Linha
              icone={Phone}
              rotulo="Telefone"
              valor={empresa.telefone}
              href={fone ? `tel:+55${fone}` : undefined}
              copiar
              numeros
              extra={
                fone ? (
                  <a
                    href={`https://wa.me/55${fone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Abrir no WhatsApp"
                    title="Abrir no WhatsApp"
                    className="grid size-11 shrink-0 place-items-center rounded-full text-tinta-3 transition-colors hover:bg-superficie-2 hover:text-ok"
                  >
                    <MessageCircle aria-hidden className="size-4" />
                  </a>
                ) : null
              }
            />
            <Linha icone={KeyRound} rotulo="Chave Pix" valor={empresa.chavePix} copiar />
            <Linha icone={MapPin} rotulo="Endereço" valor={[empresa.endereco, empresa.municipio].filter(Boolean).join(" · ")} />
            <Linha
              icone={Globe}
              rotulo="Site"
              valor={empresa.site}
              href={empresa.site ? (empresa.site.startsWith("http") ? empresa.site : `https://${empresa.site}`) : undefined}
              externo
            />
            <Linha icone={Building2} rotulo="Abertura" valor={empresa.abertura ? data(empresa.abertura) : ""} numeros />
          </dl>
        </Cartao>

        {/* Sócios */}
        <Cartao className="animate-surgir escala-2">
          <CabecalhoCartao titulo="Sócios" descricao={`${socios.length} sócios com acesso ao Hub`} />
          <ul className="divide-y divide-areia">
            {socios.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-5 py-3.5 sm:px-6">
                <Avatar nome={s.nome} cor={s.cor} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-tinta">{s.nome}</p>
                  <p className="truncate text-xs text-tinta-3">{s.area}</p>
                </div>
                <a href={`mailto:${s.email}`} className="truncate text-xs text-azul-escuro hover:underline max-sm:sr-only">{s.email}</a>
              </li>
            ))}
          </ul>
        </Cartao>

        {/* Resumo financeiro */}
        <Cartao className="animate-surgir escala-3 xl:col-span-2">
          <CabecalhoCartao
            titulo="Resumo financeiro"
            descricao={provedorDemo ? "Banco em demonstração · contratos com dados reais" : "Mês atual"}
            acao={<BotaoLink href="/financeiro" variante="fantasma" icone={ArrowRight} className="flex-row-reverse">Financeiro</BotaoLink>}
          />
          <div className="grid grid-cols-2 gap-3 p-5 sm:p-6 lg:grid-cols-4">
            <Numero rotulo="Entradas do mês" valor={brl(mes.entradas)} />
            <Numero rotulo="Saídas do mês" valor={brl(mes.saidas)} />
            <Numero rotulo="Resultado" valor={brl(resultado)} detalhe={`Margem de ${pct(resultado / mes.entradas)}`} />
            <Numero rotulo="Recorrente contratado" valor={brl(resumo.receitaMensal)} detalhe={`${resumo.vigentes} contratos vigentes`} />
          </div>
          <div className="border-t border-areia px-5 py-4 sm:px-6">
            <div className="mb-2 flex items-center justify-between gap-3 text-[13px]">
              <span className="font-medium text-tinta">Teto do MEI</span>
              <span className="numeros text-tinta-3">{brl(MEI.faturadoNoAno)} de {brl(limite)} · {pct(mei.uso)}</span>
            </div>
            <Medidor valor={mei.uso} rotulo="Uso do teto do MEI" tom={mei.nivel === "ok" ? "azul" : mei.nivel === "alerta" ? "alerta" : "risco"} marca={0.8} />
          </div>
        </Cartao>

        {/* Contratos */}
        <Cartao className="animate-surgir escala-4 flex flex-col">
          <CabecalhoCartao titulo="Contratos" descricao={`${resumo.vigentes} vigentes · ${resumo.aguardando} aguardando`} />
          <div className="grid grid-cols-3 gap-2 px-5 pt-4 sm:px-6">
            <Numero rotulo="Vigentes" valor={String(resumo.vigentes)} compacto />
            <Numero rotulo="Renovar" valor={String(resumo.renovar)} compacto />
            <Numero rotulo="Vencidos" valor={String(resumo.vencidos)} compacto />
          </div>
          {atencao.length > 0 ? (
            <ul className="mt-3 divide-y divide-areia border-t border-areia">
              {atencao.map(({ c, e }) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-tinta">{c.cliente}</span>
                    <span className="block text-xs text-tinta-3">até {data(c.fim)}</span>
                  </span>
                  <EtiquetaContrato estado={e} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-4 text-sm text-tinta-3 sm:px-6">
              {contratos.length ? "Nenhum contrato pedindo atenção." : "Nenhum contrato cadastrado ainda."}
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2 border-t border-areia px-5 py-4 sm:px-6">
            <BotaoNovoContrato leads={leads.filter((l) => l.etapa !== "perdido").map((l) => ({ id: l.id, nome: l.nome }))} />
            <BotaoLink href="/contratos" variante="secundario" icone={FileSignature}>Gerir contratos</BotaoLink>
          </div>
        </Cartao>

        {/* Agenda */}
        <Cartao className="animate-surgir escala-5 xl:col-span-3">
          <CabecalhoCartao
            titulo="Agenda dos próximos 7 dias"
            descricao={
              agenda.fonte === "google" ? (
                <span className="inline-flex items-center gap-1.5"><CalendarCheck2 aria-hidden className="size-3.5 text-ok" />Ligada ao Google Agenda da GTM</span>
              ) : (
                "Dados de demonstração — o Google Agenda ainda não está ligado"
              )
            }
            acao={<BotaoLink href="/agenda" variante="fantasma" icone={ArrowRight} className="flex-row-reverse">Agenda</BotaoLink>}
          />
          {agenda.erro && (
            <div className="px-5 pt-4 sm:px-6">
              <Aviso tom="risco" titulo="Não foi possível ler o Google Agenda">
                {agenda.erro} {contaGoogle && <>Confira se a agenda está compartilhada com <strong className="break-all">{contaGoogle}</strong>.</>}
              </Aviso>
            </div>
          )}
          {eventos.length === 0 ? (
            <EstadoVazio icone={CalendarX2} titulo="Semana livre" texto="Nenhum compromisso nos próximos 7 dias." />
          ) : (
            <ul className="grid grid-cols-1 divide-y divide-areia md:grid-cols-2 md:divide-y-0 md:gap-x-6 md:px-6 md:py-2">
              {eventos.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3 md:border-b md:border-areia md:px-0">
                  <span className="grid w-12 shrink-0 text-center">
                    <span className="text-[11px] uppercase text-tinta-3">{diaSemana(e.data).slice(0, 3)}</span>
                    <span className="numeros text-lg font-semibold leading-tight text-tinta">{dataCurta(e.data).slice(0, 2)}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-tinta">{e.titulo}</span>
                    <span className="numeros block text-xs text-tinta-3">
                      {e.fim ? `${e.inicio}–${e.fim}` : e.inicio} · {nomeSocio(e.socioId)}
                    </span>
                  </span>
                  {e.data === hoje && <Etiqueta tom="info" icone={CalendarDays}>Hoje</Etiqueta>}
                </li>
              ))}
            </ul>
          )}
          {agenda.fonte === "demo" && (
            <p className="flex items-start gap-2 border-t border-areia px-5 py-4 text-[13px] text-tinta-3 sm:px-6">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0" />
              Para ver a agenda real: crie a conta de serviço no Google Cloud, compartilhe a agenda da GTM com ela e
              cadastre GOOGLE_AGENDA_ID e GOOGLE_AGENDA_CREDENCIAIS. Passo a passo em docs/GOOGLE-AGENDA.md.
            </p>
          )}
        </Cartao>
      </div>
    </>
  );
}

function Linha({
  icone: Icone,
  rotulo,
  valor,
  href,
  externo,
  copiar,
  numeros,
  extra,
}: {
  icone: typeof Mail;
  rotulo: string;
  valor: string;
  href?: string;
  externo?: boolean;
  copiar?: boolean;
  numeros?: boolean;
  extra?: ReactNode;
}) {
  return (
    <div className="flex min-h-16 items-center gap-3 border-b border-areia px-5 py-2 sm:px-6 sm:[&:nth-last-child(-n+1)]:border-b-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-azul-suave text-azul-escuro">
        <Icone aria-hidden className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-tinta-3">{rotulo}</dt>
        <dd className={numeros ? "numeros" : undefined}>
          {!valor ? (
            <span className="text-sm text-tinta-3">Não informado</span>
          ) : href ? (
            <Link
              href={href}
              {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="block truncate text-sm font-medium text-tinta hover:text-azul-escuro hover:underline"
            >
              {valor}
            </Link>
          ) : (
            <span className="block truncate text-sm font-medium text-tinta">{valor}</span>
          )}
        </dd>
      </div>
      {extra}
      {copiar && <Copiar valor={valor} rotulo={rotulo} />}
    </div>
  );
}

function Numero({ rotulo, valor, detalhe, compacto }: { rotulo: string; valor: string; detalhe?: string; compacto?: boolean }) {
  return (
    <div className="rounded-lg bg-superficie-2 p-3.5 ring-1 ring-inset ring-areia">
      <p className="text-xs text-tinta-3">{rotulo}</p>
      <p className={`numeros mt-1 font-semibold tracking-tight text-tinta ${compacto ? "text-xl" : "text-lg sm:text-xl"}`}>{valor}</p>
      {detalhe && <p className="mt-0.5 text-[11px] text-tinta-3">{detalhe}</p>}
    </div>
  );
}
