import type { MetadataRoute } from "next";

// Permite "Adicionar à tela inicial" no celular e instalar como app no computador (Chrome/Edge).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GTM Hub",
    short_name: "GTM Hub",
    description: "Sistema interno da GTM Soluções",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0c0f16",
    theme_color: "#3f6fd8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
    shortcuts: [
      { name: "Chat dos sócios", url: "/chat" },
      { name: "Novo lead", url: "/leads?novo=1" },
      { name: "Agenda", url: "/agenda" },
    ],
  };
}
