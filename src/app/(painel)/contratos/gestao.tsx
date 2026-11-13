"use client";
// Lista de contratos com cadastro, edição e encerramento.
import { BellRing, FilePlus2, FileSignature, Pencil } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Botao, BotaoIcone, CabecalhoCartao, Cartao, EstadoVazio, Etiqueta, Tabela, Td, Th, Tr } from "@/components/ui/base";
import { brl, data } from "@/lib/formato";
import { estadoContrato, type ContratoCliente, type EstadoContrato } from "@/lib/regras/empresa";
import { ModalContrato, type OpcaoLead } from "../empresa/formularios";

export function EtiquetaContrato({ estado }: { estado: EstadoContrato }) {
  switch (estado.tipo) {
    case "aguardando":
      return <Etiqueta tom="alerta">Aguardando assinatura</Etiqueta>;
    case "renovar":
      return <Etiqueta tom="alerta" icone={BellRing}>Renovar em {estado.dias} {estado.dias === 1 ? "dia" : "dias"}</Etiqueta>;
    case "vencido":
      return <Etiqueta tom="risco">Vencido há {estado.dias} {estado.dias === 1 ? "dia" : "dias"}</Etiqueta>;
    case "encerrado":
      return <Etiqueta tom="neutro">Encerrado</Etiqueta>;
    default:
      return <Etiqueta tom="ok">Vigente</Etiqueta>;
  }
}

/** Botão + modal de novo contrato, para usar fora da lista (ex.: Nossa empresa). */
export function BotaoNovoContrato({ leads, variante = "primario" }: { leads: OpcaoLead[]; variante?: "primario" | "secundario" }) {
  const [aberto, setAberto] = useState(false);
  const [n, setN] = useState(0);
  return (
    <>
      <Botao variante={variante} icone={FilePlus2} onClick={() => { setN((x) => x + 1); setAberto(true); }}>Novo contrato</Botao>
      <ModalContrato key={n} aberto={aberto} aoFechar={() => setAberto(false)} contrato={null} leads={leads} />
    </>
  );
}

export function GestaoContratos({ contratos, leads }: { contratos: ContratoCliente[]; leads: OpcaoLead[] }) {
  const busca = useSearchParams();
  const router = useRouter();
  const caminho = usePathname();
  const [alvo, setAlvo] = useState<{ contrato: ContratoCliente | null; n: number } | null>(
    busca.get("novo") === "1" ? { contrato: null, n: 0 } : null,
  );
  const [mostrarEncerrados, setMostrarEncerrados] = useState(false);
  const abrir = (contrato: ContratoCliente | null) => setAlvo((a) => ({ contrato, n: (a?.n ?? 0) + 1 }));
  const fechar = () => {
    setAlvo(null);
    if (busca.get("novo")) router.replace(caminho, { scroll: false });
  };

  const ativos = contratos.filter((c) => c.situacao !== "encerrado");
  const encerrados = contratos.filter((c) => c.situacao === "encerrado");
  const lista = mostrarEncerrados ? contratos : ativos;

  return (
    <Cartao className="animate-surgir">
      <CabecalhoCartao
        titulo="Contratos"
        descricao={`${contratos.filter((c) => c.situacao === "vigente").length} vigentes · ${contratos.filter((c) => c.situacao === "aguardando").length} aguardando · ${encerrados.length} encerrados`}
        acao={<Botao icone={FilePlus2} onClick={() => abrir(null)}>Novo contrato</Botao>}
      />
      {lista.length === 0 ? (
        <EstadoVazio
          icone={FileSignature}
          titulo={contratos.length ? "Nenhum contrato ativo" : "Nenhum contrato cadastrado"}
          texto="Cadastre o contrato com vigência e valores. O Hub avisa 45 dias antes do fim para combinar a renovação."
          acao={<Botao icone={FilePlus2} onClick={() => abrir(null)}>Cadastrar contrato</Botao>}
        />
      ) : (
        <Tabela rotulo="Contratos">
          <thead>
            <tr><Th>Cliente</Th><Th>Vigência</Th><Th>Situação</Th><Th className="text-right">Mensal</Th><Th><span className="sr-only">Ações</span></Th></tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <Tr key={c.id}>
                <Td>
                  <p className="font-medium">{c.cliente}</p>
                  <p className="text-xs text-tinta-3">{c.produto}</p>
                </Td>
                <Td className="numeros whitespace-nowrap text-[13px]">{data(c.inicio)} – {data(c.fim)}</Td>
                <Td><EtiquetaContrato estado={estadoContrato(c)} /></Td>
                <Td className="numeros text-right">{brl(c.valorMensal)}</Td>
                <Td className="w-14 text-right">
                  <BotaoIcone icone={Pencil} rotulo={`Editar contrato de ${c.cliente}`} onClick={() => abrir(c)} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Tabela>
      )}
      {encerrados.length > 0 && (
        <div className="border-t border-areia px-5 py-3 sm:px-6">
          <button type="button" onClick={() => setMostrarEncerrados((v) => !v)} className="min-h-11 text-sm font-medium text-azul-escuro hover:underline">
            {mostrarEncerrados ? "Esconder encerrados" : `Mostrar ${encerrados.length} encerrado${encerrados.length > 1 ? "s" : ""}`}
          </button>
        </div>
      )}
      <ModalContrato key={alvo?.n ?? -1} aberto={!!alvo} aoFechar={fechar} contrato={alvo?.contrato ?? null} leads={leads} />
    </Cartao>
  );
}
