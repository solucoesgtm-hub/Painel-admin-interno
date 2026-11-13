import type { Metadata, Viewport } from "next";
import { Urbanist } from "next/font/google";
import { cookies } from "next/headers";
import { COOKIE_TEMA, lerTema } from "@/lib/tema";
import "./globals.css";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-urbanist",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "GTM Hub", template: "%s · GTM Hub" },
  description: "Sistema interno de gestão da GTM Soluções",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e6eaf1" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0f16" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Sem cookie, o tema segue o sistema (CSS em globals.css).
  const tema = lerTema((await cookies()).get(COOKIE_TEMA)?.value);
  return (
    <html lang="pt-BR" className={urbanist.variable} data-tema={tema ?? undefined}>
      <body>
        <div aria-hidden className="fundo" />
        {children}
      </body>
    </html>
  );
}
