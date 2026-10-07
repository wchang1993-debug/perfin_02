import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { RegistrarServiceWorker } from "@/components/RegistrarServiceWorker";
import "./globals.css";

// Substitutas web das fontes da marca (Chronicle Display → Source Serif 4; Texta Alt → Hanken Grotesk).
const serif = Source_Serif_4({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-serif" });
const sans = Hanken_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Portal Perfin", template: "%s | Portal Perfin" },
  description: "Central de análise de indicadores e mercado da Perfin Wealth Management.",
  applicationName: "Portal Perfin",
  appleWebApp: { capable: true, title: "Portal Perfin", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/icone-192.png", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#221F20",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {children}
        <RegistrarServiceWorker />
        <Analytics />
      </body>
    </html>
  );
}
