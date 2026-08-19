import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plexmono",
  weight: ["400", "500", "600"],
  display: "swap",
});
const bengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  variable: "--font-bengali",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bariwala — Property & Tenant Ledger",
  description: "Manage properties, tenants, meters, bills and payments in one place.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#131D18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return (
    <html lang={locale} className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} ${bengali.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
