// Service worker do GTM Hub: recebe as notificações (Web Push) e abre o chat ao tocar.
// Não guarda páginas em cache: o painel sempre busca dados atualizados no servidor.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (evento) => {
  let dados = { titulo: "GTM Hub", texto: "Nova mensagem no chat", url: "/chat", naoLidas: 0 };
  try {
    dados = { ...dados, ...evento.data.json() };
  } catch {}

  evento.waitUntil(
    (async () => {
      // Número no ícone do app instalado (onde o sistema permite).
      if (dados.naoLidas > 0 && "setAppBadge" in navigator) navigator.setAppBadge(dados.naoLidas).catch(() => {});

      // Quem já está com o chat aberto e em foco não precisa do aviso.
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const vendoChat = janelas.some((j) => j.focused && j.visibilityState === "visible" && new URL(j.url).pathname.startsWith("/chat"));
      if (vendoChat) return;

      await self.registration.showNotification(dados.titulo, {
        body: dados.texto,
        icon: "/icone-192.png",
        badge: "/icone-192.png",
        tag: "chat-gtm",
        renotify: true,
        timestamp: Date.now(),
        data: { url: dados.url },
      });
    })(),
  );
});

self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL(evento.notification.data?.url || "/chat", self.location.origin).href;
  evento.waitUntil(
    (async () => {
      const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const aberta = janelas.find((j) => new URL(j.url).origin === self.location.origin);
      if (aberta) {
        await aberta.focus();
        if ("navigate" in aberta) await aberta.navigate(destino).catch(() => {});
        return;
      }
      await self.clients.openWindow(destino);
    })(),
  );
});
