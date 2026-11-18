"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  Building2,
  ChevronDown,
  CircleDollarSign,
  ExternalLink,
  FileSearch,
  Inbox,
  Mail,
  Megaphone,
  PenLine,
  Sparkles,
  Truck,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { AreaTexto, Botao, Campo, Cartao, EstadoVazio, Etiqueta, cn, type Tom } from "@/components/ui/base";
import { useAviso } from "@/components/ui/toast";
import { dataCurta, hojeISO, hora } from "@/lib/formato";
import type { ResultadoTriagem } from "@/lib/ia/triagem-email";
import { CATEGORIAS_EMAIL, NOME_CATEGORIA, ordenarTriagem, type CategoriaEmail, type ItemTriagem } from "@/lib/regras/email";
import { acaoCriarRascunho, acaoTriarComIa } from "./acoes";
import { BotaoTexto } from "@/components/ui/botao-link";

const ICONE_CATEGORIA: Record<CategoriaEmail, LucideIcon> = {
  lead: UserPlus,
  cliente: UserRound,
  financeiro: CircleDollarSign,
  edital: FileSearch,
  fornecedor: Truck,
  promocao: Megaphone,
  outro: Mail,
};

const URGENCIA: Record<ItemTriagem["urgencia"], { tom: Tom; texto: string }> = {
  alta: { tom: "risco", texto: "Urgente" },
  media: { tom: "alerta", texto: "Responder logo" },
  baixa: { tom: "neutro", texto: "Sem pressa" },
};

const quando = (iso: string) => (hojeISO(new Date(iso)) === hojeISO() ? hora(iso) : dataCurta(iso));

export function CaixaEmail({ inicial, iaLigada, gmail }: { inicial: ResultadoTriagem; iaLigada: boolean; gmail: boolean }) {
  const avisar = useAviso();
  const [triagem, setTriagem] = useState(inicial);
  const [filtro, setFiltro] = useState<CategoriaEmail | "todos">("todos");
  const [aberto, setAberto] = useState<string | null>(null);
  const [triando, iniciarTriagem] = useTransition();

  const itens = useMemo(
    () => ordenarTriagem(triagem.itens.map((i) => ({ ...i, recebidoEm: i.email.recebidoEm }))),
    [triagem],
  );
  const contagem = useMemo(() => {
    const c = Object.fromEntries(CATEGORIAS_EMAIL.map((k) => [k, 0])) as Record<CategoriaEmail, number>;
    for (const i of itens) c[i.categoria]++;
    return c;
  }, [itens]);
  const visiveis = filtro === "todos" ? itens : itens.filter((i) => i.categoria === filtro);
  const urgentes = itens.filter((i) => i.urgencia === "alta").length;

  const triarComIa = () =>
    iniciarTriagem(async () => {
      const r = await acaoTriarComIa();
      if (!r.ok) return avisar({ tom: "risco", texto: r.mensagem });
      setTriagem(r.triagem);
      avisar(r.triagem.aviso ? { tom: "info", texto: r.triagem.aviso } : { tom: "ok", texto: "Triagem feita pela IA" });
    });

  return (
    <Cartao className="animate-surgir overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-areia p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-w-0">
          <p className="text-sm font-medium text-tinta">
            {itens.length} e-mail{itens.length === 1 ? "" : "s"} · {urgentes} urgente{urgentes === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-tinta-3">
            {triagem.fonte === "ia" ? "Separados pela IA." : "Separados por regras simples (sem custo)."}
            {!iaLigada && " Ligue a IA em Conexões para resumos e respostas melhores."}
          </p>
        </div>
        <Botao
          variante={triagem.fonte === "ia" ? "secundario" : "primario"}
          icone={Sparkles}
          onClick={triarComIa}
          disabled={!iaLigada || triando || itens.length === 0}
          title={iaLigada ? "Classifica, resume e sugere respostas com a IA" : "A IA ainda não está ligada"}
        >
          {triando ? "Analisando…" : triagem.fonte === "ia" ? "Analisar de novo" : "Analisar com IA"}
        </Botao>
      </div>

      <div role="group" aria-label="Filtrar por assunto" className="sem-rolagem flex gap-1.5 overflow-x-auto border-b border-areia px-4 py-3 sm:px-6">
        <Filtro ativo={filtro === "todos"} onClick={() => setFiltro("todos")} icone={Inbox} rotulo="Todos" total={itens.length} />
        {CATEGORIAS_EMAIL.filter((c) => contagem[c] > 0).map((c) => (
          <Filtro key={c} ativo={filtro === c} onClick={() => setFiltro(c)} icone={ICONE_CATEGORIA[c]} rotulo={NOME_CATEGORIA[c]} total={contagem[c]} />
        ))}
      </div>

      {visiveis.length === 0 ? (
        <EstadoVazio
          icone={Inbox}
          titulo={itens.length === 0 ? "Caixa vazia" : "Nada neste filtro"}
          texto={itens.length === 0 ? "Nenhum e-mail na caixa de entrada nos últimos 14 dias." : "Escolha outro assunto acima."}
        />
      ) : (
        <ul className="divide-y divide-areia">
          {visiveis.map((i) => (
            <LinhaEmail
              key={i.id}
              item={i}
              aberto={aberto === i.id}
              alternar={() => setAberto((a) => (a === i.id ? null : i.id))}
              gmail={gmail}
            />
          ))}
        </ul>
      )}
    </Cartao>
  );
}

function Filtro({ ativo, onClick, icone: Icone, rotulo, total }: { ativo: boolean; onClick: () => void; icone: LucideIcon; rotulo: string; total: number }) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ring-1 ring-inset transition-colors",
        ativo ? "bg-azul-suave text-azul-escuro ring-azul/25" : "text-tinta-2 ring-areia hover:bg-superficie-2 hover:text-tinta",
      )}
    >
      <Icone aria-hidden className="size-4" />
      {rotulo}
      <span className="numeros text-xs text-tinta-3">{total}</span>
    </button>
  );
}

function LinhaEmail({
  item,
  aberto,
  alternar,
  gmail,
}: {
  item: ItemTriagem & { email: ResultadoTriagem["itens"][number]["email"] };
  aberto: boolean;
  alternar: () => void;
  gmail: boolean;
}) {
  const e = item.email;
  const Icone = ICONE_CATEGORIA[item.categoria];
  const u = URGENCIA[item.urgencia];
  const painel = `email-${item.id}`;
  return (
    <li className={cn(aberto && "bg-superficie-2/60")}>
      <button
        type="button"
        onClick={alternar}
        aria-expanded={aberto}
        aria-controls={painel}
        className="flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-superficie-2/70 sm:px-6"
      >
        <span className="relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-azul-suave text-azul-escuro">
          <Icone aria-hidden className="size-[18px]" />
          {!e.lido && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-azul ring-2 ring-papel-forte" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className={cn("truncate text-sm text-tinta", !e.lido ? "font-semibold" : "font-medium")}>
              {e.nomeDe || e.de}
              {!e.lido && <span className="sr-only"> (não lido)</span>}
            </span>
            <span className="numeros shrink-0 text-xs text-tinta-3">{quando(e.recebidoEm)}</span>
          </span>
          <span className="mt-0.5 block truncate text-[13px] text-tinta-2">{e.assunto}</span>
          <span className="mt-0.5 block truncate text-xs text-tinta-3">{item.resumo}</span>
          <span className="mt-2 flex flex-wrap items-center gap-1.5">
            <Etiqueta tom={u.tom}>{u.texto}</Etiqueta>
            <Etiqueta icone={Icone}>{NOME_CATEGORIA[item.categoria]}</Etiqueta>
            <span className="text-xs text-tinta-3">→ {item.acaoSugerida}</span>
          </span>
        </span>
        <ChevronDown aria-hidden className={cn("mt-2 size-4 shrink-0 text-tinta-3 transition-transform", aberto && "rotate-180")} />
      </button>
      {aberto && <Detalhe id={painel} item={item} gmail={gmail} />}
    </li>
  );
}

function Detalhe({ id, item, gmail }: { id: string; item: ItemTriagem & { email: ResultadoTriagem["itens"][number]["email"] }; gmail: boolean }) {
  const avisar = useAviso();
  const e = item.email;
  const [texto, setTexto] = useState(item.respostaSugerida ?? "");
  const [erro, setErro] = useState<string>();
  const [salvando, iniciar] = useTransition();
  const [criado, setCriado] = useState(false);

  const criar = () =>
    iniciar(async () => {
      setErro(undefined);
      const r = await acaoCriarRascunho({ emailId: e.id, corpo: texto });
      if (!r.ok) {
        setErro(r.mensagem);
        return;
      }
      setCriado(true);
      avisar({ tom: "ok", texto: r.demo ? "Rascunho simulado (demonstração)" : "Rascunho criado no Gmail" });
    });

  return (
    <div id={id} className="animate-aparecer flex flex-col gap-4 px-4 pb-5 sm:pl-[76px] sm:pr-6">
      <div className="rounded-xl bg-superficie px-4 py-3 ring-1 ring-inset ring-areia">
        <p className="text-xs text-tinta-3">
          De <span className="break-all text-tinta-2">{e.nomeDe ? `${e.nomeDe} <${e.de}>` : e.de}</span>
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-tinta-2">{e.trecho || "Sem prévia do conteúdo."}</p>
      </div>
      <Campo
        rotulo="Resposta"
        id={`resposta-${e.id}`}
        erro={erro}
        ajuda={item.respostaSugerida ? "Sugestão para revisar. Vira rascunho na conversa; o envio é no Gmail." : "Escreva a resposta. Vira rascunho na conversa; o envio é no Gmail."}
      >
        <AreaTexto
          id={`resposta-${e.id}`}
          rows={6}
          value={texto}
          onChange={(ev) => setTexto(ev.target.value)}
          aria-invalid={!!erro}
          placeholder="Olá! Obrigado pelo contato…"
        />
      </Campo>
      <div className="flex flex-wrap items-center gap-2">
        <Botao icone={PenLine} onClick={criar} disabled={salvando || !texto.trim() || criado}>
          {criado ? "Rascunho criado" : salvando ? "Criando…" : "Criar rascunho"}
        </Botao>
        {gmail && (
          <BotaoTexto href={`https://mail.google.com/mail/u/0/#all/${e.conversaId}`} iconeFim={ExternalLink} className="px-2">
            Abrir no Gmail
          </BotaoTexto>
        )}
        {item.categoria === "lead" && (
          <BotaoTexto href="/leads?novo=1" iconeInicio={Building2} className="px-2">
            Cadastrar lead
          </BotaoTexto>
        )}
      </div>
    </div>
  );
}
