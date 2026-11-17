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
    background_color: "#141414",
    theme_color: "#141414",
    icons: [
      { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icone-mascaravel.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Chat dos sócios", url: "/chat", icons: [{ src: "/icone-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Novo lead", url: "/leads?novo=1", icons: [{ src: "/icone-192.png", sizes: "192x192", type: "image/png" }] },
      { name: "Agenda", url: "/agenda", icons: [{ src: "/icone-192.png", sizes: "192x192", type: "image/png" }] },
    ],
  };
}
