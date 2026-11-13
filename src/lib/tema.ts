// Tema claro/escuro escolhido pelo sócio. Sem escolha, segue o sistema.
export const COOKIE_TEMA = "gtm-tema";
export type Tema = "claro" | "escuro";

export const lerTema = (v: string | undefined): Tema | null => (v === "claro" || v === "escuro" ? v : null);
