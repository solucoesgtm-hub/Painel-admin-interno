// Exibição do relatório do lead e do plano de implementação (usado pelo painel da ficha).
import type { ReactNode } from "react";
import { Check, ShieldAlert } from "lucide-react";
import { Etiqueta } from "@/components/ui/base";
import { formatarHoras, NOME_NIVEL, type PlanoIASalvo } from "@/lib/regras/ia";

function Titulo({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 mt-6 text-sm font-semibold first:mt-0">{children}</h3>;
}
function Sub({ children }: { children: ReactNode }) {
  return <h4 className="mb-1.5 mt-3 text-[13px] font-medium text-tinta">{children}</h4>;
}
function Lista({ itens }: { itens: string[] }) {
  if (!itens.length) return <p className="text-sm text-tinta-3">—</p>;
  return (
    <ul className="space-y-1.5 text-sm text-tinta-2">
      {itens.map((i, n) => <li key={n} className="flex gap-2"><Check aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />{i}</li>)}
    </ul>
  );
}
function Numerada({ itens }: { itens: string[] }) {
  return <ol className="list-decimal space-y-1 pl-5 text-sm text-tinta-2">{itens.map((x, i) => <li key={i}>{x}</li>)}</ol>;
}
const paragrafo = "whitespace-pre-line text-sm leading-relaxed text-tinta-2";
const caixa = "rounded-md border border-areia bg-superficie p-3 text-sm";
const tomNivel = { baixa: "ok", media: "alerta", alta: "risco" } as const;

export function VerRelatorio({ p }: { p: PlanoIASalvo }) {
  const r = p.conteudo.relatorio;
  return (
    <article>
      <Titulo>1. Resumo executivo</Titulo><p className={paragrafo}>{r.resumoExecutivo}</p>
      <Titulo>2. Pontuação e veredito</Titulo><p className={paragrafo}>{r.vereditoExplicado}</p>
      <Titulo>3. Diagnóstico da situação atual</Titulo>
      <p className={paragrafo}>{r.diagnosticoAtual.contexto}</p>
      <Sub>Processos atuais</Sub><Numerada itens={r.diagnosticoAtual.processosAtuais} />
      <Sub>Gargalos</Sub>
      <ul className="grid gap-2 md:grid-cols-2">
        {r.diagnosticoAtual.gargalos.map((g, i) => (
          <li key={i} className={caixa}><p className="font-medium">{g.problema}</p><p className="mt-0.5 text-tinta-2">{g.impacto}</p></li>
        ))}
      </ul>
      <Titulo>4. Oportunidade</Titulo>
      <p className={paragrafo}>{r.oportunidade.solucaoProposta}</p>
      <Sub>Benefícios</Sub><Lista itens={r.oportunidade.beneficios} />
      <p className="mt-3 rounded-md bg-azul-suave/60 px-3 py-2 text-sm text-tinta-2">
        <span className="font-medium text-azul-escuro">Economia estimada: </span>{r.oportunidade.economiaEstimada}
      </p>
      <Titulo>5. Pontos fortes</Titulo><Lista itens={r.pontosFortes} />
      <Titulo>6. Riscos</Titulo>
      <ul className="space-y-2">
        {r.riscos.map((x, i) => (
          <li key={i} className={caixa}>
            <p className="flex items-center gap-1.5 font-medium"><ShieldAlert aria-hidden className="size-4 shrink-0 text-alerta" />{x.risco}</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Etiqueta tom={tomNivel[x.probabilidade]}>Probabilidade {NOME_NIVEL[x.probabilidade].toLowerCase()}</Etiqueta>
              <Etiqueta tom={tomNivel[x.impacto]}>Impacto {NOME_NIVEL[x.impacto].toLowerCase()}</Etiqueta>
            </div>
            <p className="mt-1.5 text-tinta-2">{x.mitigacao}</p>
          </li>
        ))}
      </ul>
      <Titulo>7. Premissas</Titulo><Lista itens={r.premissas} />
      <Titulo>8. Recomendação</Titulo><p className={paragrafo}>{r.recomendacao}</p>
      <Titulo>9. Próximos passos</Titulo><Numerada itens={r.proximosPassos} />
    </article>
  );
}

export function VerPlano({ p }: { p: PlanoIASalvo }) {
  const { prd, requisitos, fluxos, regrasNegocio, normas, arquitetura, modeloDados, telas, metodologia, passos } = p.conteudo.plano;
  const total = passos.reduce((a, x) => a + x.estimativaHoras, 0);
  return (
    <article>
      <Titulo>1. PRD</Titulo>
      <dl className="space-y-2 text-sm">
        {([["Problema", prd.problema], ["Objetivo", prd.objetivo], ["Público", prd.publico]] as const).map(([k, v]) => (
          <div key={k}><dt className="font-medium text-tinta">{k}</dt><dd className="text-tinta-2">{v}</dd></div>
        ))}
      </dl>
      <div className="mt-2 grid gap-x-4 md:grid-cols-3">
        <div><Sub>Escopo</Sub><Lista itens={prd.escopo} /></div>
        <div><Sub>Fora do escopo</Sub><Lista itens={prd.foraDoEscopo} /></div>
        <div><Sub>Métricas de sucesso</Sub><Lista itens={prd.metricasSucesso} /></div>
      </div>

      <Titulo>2. Requisitos</Titulo>
      <ul className="divide-y divide-areia rounded-md border border-areia bg-superficie text-sm">
        {requisitos.funcionais.map((x, i) => (
          <li key={i} className="flex flex-wrap items-start gap-x-3 gap-y-1 px-3 py-2">
            <span className="numeros font-mono text-xs font-semibold text-azul-escuro">{x.codigo}</span>
            <span className="min-w-0 flex-1 text-tinta-2">{x.descricao}</span>
            <Etiqueta tom={x.prioridade === "essencial" ? "info" : "neutro"}>{x.prioridade === "essencial" ? "Essencial" : "Desejável"}</Etiqueta>
          </li>
        ))}
      </ul>
      <Sub>Não funcionais</Sub><Lista itens={requisitos.naoFuncionais} />

      <Titulo>3. Fluxos</Titulo>
      <div className="grid gap-3 md:grid-cols-2">
        {fluxos.map((f, i) => (
          <div key={i} className={caixa}>
            <p className="font-medium">{f.nome}</p>
            <p className="mt-0.5 text-xs text-tinta-3">Ator: {f.ator} · Gatilho: {f.gatilho}</p>
            <div className="mt-2"><Numerada itens={f.passos} /></div>
            <p className="mt-2 text-xs text-tinta-2"><span className="font-medium">Resultado:</span> {f.resultado}</p>
          </div>
        ))}
      </div>

      <Titulo>4. Regras de negócio</Titulo>
      <ul className="divide-y divide-areia rounded-md border border-areia bg-superficie text-sm">
        {regrasNegocio.map((x, i) => (
          <li key={i} className="flex gap-3 px-3 py-2">
            <span className="numeros shrink-0 font-mono text-xs font-semibold text-azul-escuro">{x.codigo}</span>
            <div className="min-w-0"><p className="text-tinta">{x.regra}</p><p className="text-xs text-tinta-3">{x.motivo}</p></div>
          </li>
        ))}
      </ul>

      <Titulo>5. Normas e conformidade</Titulo>
      <ul className="space-y-2">
        {normas.map((x, i) => (
          <li key={i} className={caixa}><p className="font-medium">{x.norma}</p><p className="mt-0.5 text-tinta-2">{x.aplicacao}</p></li>
        ))}
      </ul>

      <Titulo>6. Arquitetura</Titulo>
      <p className={paragrafo}>{arquitetura.visaoGeral}</p>
      <ul className="mt-3 divide-y divide-areia rounded-md border border-areia bg-superficie text-sm">
        {arquitetura.stack.map((s, i) => (
          <li key={i} className="px-3 py-2"><span className="font-medium">{s.camada}:</span> {s.tecnologia} <span className="text-tinta-3">— {s.motivo}</span></li>
        ))}
      </ul>
      {arquitetura.integracoes.length > 0 && (<><Sub>Integrações</Sub><Lista itens={arquitetura.integracoes} /></>)}

      <Titulo>7. Modelo de dados</Titulo>
      <div className="grid gap-3 md:grid-cols-2">
        {modeloDados.map((e, i) => (
          <div key={i} className={caixa}>
            <p className="font-mono text-[13px] font-semibold">{e.entidade}</p>
            <ul className="mt-1.5 space-y-0.5 break-words font-mono text-xs text-tinta-2">{e.campos.map((c, j) => <li key={j}>{c}</li>)}</ul>
            {e.observacao && <p className="mt-2 text-xs text-tinta-3">{e.observacao}</p>}
          </div>
        ))}
      </div>

      <Titulo>8. Telas</Titulo>
      <div className="grid gap-3 md:grid-cols-2">
        {telas.map((t, i) => (
          <div key={i} className={caixa}>
            <p className="font-medium">{t.nome}</p><p className="text-tinta-2">{t.objetivo}</p>
            <p className="mt-1 text-xs text-tinta-3">{t.elementos.join(" · ")}</p>
          </div>
        ))}
      </div>

      <Titulo>9. Metodologia</Titulo>
      <p className={paragrafo}>{metodologia.abordagem}</p>
      <ol className="mt-3 space-y-2">
        {metodologia.fases.map((f, i) => (
          <li key={i} className={caixa}>
            <p className="font-medium">{f.nome} <span className="numeros font-normal text-tinta-3">· {f.duracaoDias} {f.duracaoDias === 1 ? "dia" : "dias"}</span></p>
            <p className="text-tinta-2">{f.objetivo}</p>
            <p className="mt-1 text-xs text-tinta-3">Entregáveis: {f.entregaveis.join(" · ")}</p>
          </li>
        ))}
      </ol>
      <Sub>Critérios de aceite</Sub><Lista itens={metodologia.criteriosAceite} />

      <Titulo>10. Passos de implementação · ≈ {formatarHoras(total)}</Titulo>
      <ol className="space-y-2 text-sm">
        {[...passos].sort((a, b) => a.ordem - b.ordem).map((x, i) => (
          <li key={i} className="flex gap-3">
            <span className="numeros grid size-7 shrink-0 place-items-center rounded-full bg-azul-suave text-xs font-semibold text-azul-escuro">{x.ordem}</span>
            <div className="min-w-0"><p className="font-medium">{x.titulo} <span className="numeros font-normal text-tinta-3">· {formatarHoras(x.estimativaHoras)}</span></p><p className="text-tinta-2">{x.descricao}</p></div>
          </li>
        ))}
      </ol>
    </article>
  );
}
