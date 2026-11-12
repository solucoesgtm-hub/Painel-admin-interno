import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";

const lexend = Lexend({ subsets: ["latin"], variable: "--font-lexend", display: "swap" });

export const metadata: Metadata = {
  title: { default: "GTM Hub", template: "%s · GTM Hub" },
  description: "Sistema interno de gestão da GTM Soluções",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#080a10", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={lexend.variable}>
      <body>{children}</body>
    </html>
  );
}
