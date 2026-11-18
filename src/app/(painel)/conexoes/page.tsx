import type { Metadata } from "next";
import { Bot, CalendarDays, Database, Landmark, Mail, MessageCircle, Bell, type LucideIcon } from "lucide-react";
import { Aviso, CabecalhoPagina, Cartao, Etiqueta, type Tom } from "@/components/ui/base";
import { estadoConexoes, type EstadoConexao, type IdConexao } from "@/lib/conexoes";
import { exigirSocio } from "@/lib/sessao";
import { TestarConexao } from "./testar";

export const metadata: Metadata = { title: "Conexões" };

const ICONE: Record<IdConexao, LucideIcon> = {
  neon: Database,
  claude: Bot,
  gmail: Mail,
  banco: Landmark,
  whatsapp: MessageCircle,
  agenda: CalendarDays,
  push: Bell,
};

const SITUACAO: Record<EstadoConexao["situacao"], { tom: Tom; texto: string }> = {
  ligada: { tom: "ok", texto: "Ligada" },
  incompleta: { tom: "alerta", texto: "Configuração incompleta" },
  demonstracao: { tom: "neutro", texto: "Em demonstração" },
};

export default async function Conexoes() {
  await exigirSocio();
  const conexoes = estadoConexoes();
  const ligadas = conexoes.filter((c) => c.situacao === "ligada").length;

  return (
    <>
      <CabecalhoPagina
        titulo="Conexões"
        descricao={`${ligadas} de ${conexoes.length} ligadas. Cada conexão funciona em demonstração até as chaves serem cadastradas na Vercel; depois, é só apertar Testar.`}
      />
      <Aviso tom="info" titulo="Como ligar uma conexão" className="mb-4">
        Cadastre as variáveis listadas em Vercel → Settings → Environment Variables (e no .env.local para testar no computador), faça um novo deploy e
        aperte Testar. O passo a passo de cada uma está em docs/CONEXOES.md. Os valores nunca aparecem nesta tela.
      </Aviso>
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {conexoes.map((c, i) => {
          const Icone = ICONE[c.id];
          const s = SITUACAO[c.situacao];
          return (
            <li key={c.id}>
              <Cartao className="animate-surgir flex h-full flex-col gap-4 p-5 sm:p-6" style={{ animationDelay: `${i * 40}ms` }} aria-labelledby={`conexao-${c.id}`}>
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-azul-suave text-azul-escuro">
                    <Icone aria-hidden className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id={`conexao-${c.id}`} className="text-base font-semibold text-tinta">{c.nome}</h2>
                      <Etiqueta tom={s.tom}>{s.texto}</Etiqueta>
                    </div>
                    <p className="mt-1 text-sm text-tinta-3">{c.para}</p>
                    {c.detalhe && <p className="mt-1 text-xs text-tinta-3">{c.detalhe}</p>}
                  </div>
                </div>
                {c.faltando.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-tinta-2">Falta cadastrar</p>
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.faltando.map((v) => (
                        <li key={v}>
                          <code className="rounded-md bg-superficie-2 px-1.5 py-0.5 text-xs text-tinta-2 ring-1 ring-inset ring-areia">{v}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-auto">
                  <TestarConexao id={c.id} nome={c.nome} />
                </div>
              </Cartao>
            </li>
          );
        })}
      </ul>
    </>
  );
}
