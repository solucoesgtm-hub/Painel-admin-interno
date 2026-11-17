"use client";
// Ativar/desativar as notificações do chat neste aparelho (Web Push).
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { acaoAtivarNotificacoes, acaoDesativarNotificacoes, acaoTestarNotificacao } from "@/app/(painel)/chat/acoes";
import { cn } from "@/components/ui/base";
import { useAviso } from "@/components/ui/toast";

type Estado = "carregando" | "indisponivel" | "nao-suportado" | "ios-instalar" | "bloqueado" | "inativo" | "ativo";

const chaveBytes = (base64: string) => {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const bin = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

const ehIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalado = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;

function nomeDoAparelho() {
  const ua = navigator.userAgent;
  const so = /Android/.test(ua) ? "Android" : ehIOS() ? "iPhone/iPad" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Outro";
  const nav = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${nav} · ${so}${instalado() ? " (app)" : ""}`;
}

export function useNotificacoes(chavePublica: string | null) {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [ocupado, setOcupado] = useState(false);

  const conferir = useCallback(async () => {
    if (!chavePublica) return setEstado("indisponivel");
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setEstado(ehIOS() && !instalado() ? "ios-instalar" : "nao-suportado");
    }
    if (Notification.permission === "denied") return setEstado("bloqueado");
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (sub && Notification.permission === "granted") {
      // Mantém o servidor em dia com este aparelho (a inscrição pode ter sido renovada pelo navegador).
      const j = sub.toJSON();
      acaoAtivarNotificacoes({ endpoint: j.endpoint, keys: j.keys, aparelho: nomeDoAparelho() }).catch(() => {});
      return setEstado("ativo");
    }
    setEstado("inativo");
  }, [chavePublica]);

  useEffect(() => {
    void conferir();
  }, [conferir]);

  const ativar = useCallback(async (): Promise<string | null> => {
    if (!chavePublica) return "Notificações ainda não configuradas no servidor.";
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      if (permissao !== "granted") {
        setEstado(permissao === "denied" ? "bloqueado" : "inativo");
        return permissao === "denied" ? "O navegador bloqueou as notificações deste site." : "Permissão não concedida.";
      }
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveBytes(chavePublica) }));
      const j = sub.toJSON();
      const r = await acaoAtivarNotificacoes({ endpoint: j.endpoint, keys: j.keys, aparelho: nomeDoAparelho() });
      if (!r.ok) return r.mensagem ?? "Não foi possível ativar.";
      setEstado("ativo");
      return null;
    } catch {
      return "Não foi possível ativar neste navegador.";
    } finally {
      setOcupado(false);
    }
  }, [chavePublica]);

  const desativar = useCallback(async () => {
    setOcupado(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await acaoDesativarNotificacoes(sub.endpoint);
        await sub.unsubscribe();
      }
      setEstado("inativo");
    } finally {
      setOcupado(false);
    }
  }, []);

  return { estado, ocupado, ativar, desativar, testar: acaoTestarNotificacao };
}

const DICAS: Partial<Record<Estado, string>> = {
  "ios-instalar": "No iPhone, adicione o GTM Hub à Tela de Início (Compartilhar → Adicionar à Tela de Início) e abra por lá para ativar.",
  bloqueado: "O navegador bloqueou as notificações deste site. Libere no cadeado ao lado do endereço e recarregue.",
  "nao-suportado": "Este navegador não recebe notificações.",
  indisponivel: "Notificações ainda não configuradas no servidor.",
};

/** Linha do menu da conta: ativar, testar ou desativar neste aparelho. */
export function LinhaNotificacoes({ chavePublica, className }: { chavePublica: string | null; className?: string }) {
  const { estado, ocupado, ativar, desativar, testar } = useNotificacoes(chavePublica);
  const avisar = useAviso();
  if (estado === "carregando") return null;
  const linha = cn("flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-tinta-2 hover:bg-superficie-2 hover:text-tinta disabled:opacity-60", className);

  if (estado === "ativo") {
    return (
      <>
        <button type="button" className={linha} disabled={ocupado} onClick={async () => {
          const r = await testar();
          avisar(r.ok ? { tom: "ok", texto: "Notificação de teste enviada" } : { tom: "risco", texto: "Nenhum aparelho recebeu. Desative e ative de novo." });
        }}>
          <BellRing aria-hidden className="size-[18px] shrink-0 text-ok" />
          <span className="flex-1 text-left">Testar notificação</span>
        </button>
        <button type="button" className={linha} disabled={ocupado} onClick={() => void desativar()}>
          <BellOff aria-hidden className="size-[18px] shrink-0 text-tinta-3" />
          <span className="flex-1 text-left">Desativar notificações aqui</span>
        </button>
      </>
    );
  }
  if (estado === "inativo") {
    return (
      <button type="button" className={linha} disabled={ocupado} onClick={async () => {
        const erro = await ativar();
        avisar(erro ? { tom: "risco", texto: erro } : { tom: "ok", texto: "Notificações do chat ativadas neste aparelho" });
      }}>
        {ocupado ? <Loader2 aria-hidden className="size-[18px] shrink-0 animate-spin" /> : <Bell aria-hidden className="size-[18px] shrink-0 text-tinta-3" />}
        <span className="flex-1 text-left">Ativar notificações do chat</span>
      </button>
    );
  }
  return (
    <p className="flex gap-3 px-3 py-2 text-xs text-tinta-3">
      <BellOff aria-hidden className="mt-0.5 size-4 shrink-0" />
      {DICAS[estado]}
    </p>
  );
}

/** Aviso no topo do chat enquanto as notificações não estão ativas neste aparelho. */
export function ConviteNotificacoes({ chavePublica }: { chavePublica: string | null }) {
  const { estado, ocupado, ativar } = useNotificacoes(chavePublica);
  const avisar = useAviso();
  const [fechado, setFechado] = useState(false);
  useEffect(() => {
    try {
      setFechado(localStorage.getItem("gtm-convite-notificacoes") === "fechado");
    } catch {}
  }, []);
  if (fechado || !["inativo", "ios-instalar", "bloqueado"].includes(estado)) return null;
  const fechar = () => {
    setFechado(true);
    try {
      localStorage.setItem("gtm-convite-notificacoes", "fechado");
    } catch {}
  };
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-areia bg-azul-suave px-4 py-2.5 text-sm sm:px-6">
      <Bell aria-hidden className="size-4 shrink-0 text-azul-escuro" />
      <p className="min-w-0 flex-1 text-tinta-2">
        {estado === "inativo" ? "Receba um aviso no celular ou no computador quando chegar mensagem." : DICAS[estado]}
      </p>
      {estado === "inativo" && (
        <button type="button" disabled={ocupado} onClick={async () => {
          const erro = await ativar();
          avisar(erro ? { tom: "risco", texto: erro } : { tom: "ok", texto: "Notificações do chat ativadas neste aparelho" });
        }} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-azul px-3.5 text-[13px] font-semibold text-white hover:bg-[#3461c9] pointer-coarse:min-h-11">
          {ocupado && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          Ativar
        </button>
      )}
      <button type="button" onClick={fechar} className="min-h-9 rounded-full px-2.5 text-[13px] text-tinta-3 hover:text-tinta pointer-coarse:min-h-11">
        Agora não
      </button>
    </div>
  );
}
