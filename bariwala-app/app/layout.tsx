import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, IBM_Plex_Mono, Noto_Sans_Bengali } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/lib/i18n";
import { getTheme } from "@/lib/theme";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

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
  title: "House Management — Property & Tenant Ledger",
  description: "Manage your house, flats, tenants, meters, bills and payments in one place.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "House Mgmt",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#131D18",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  const theme = getTheme();
  return (
    <html
      lang={locale}
      className={`${fraunces.variable} ${inter.variable} ${plexMono.variable} ${bengali.variable} ${theme === "dark" ? "dark" : ""}`}
    >
      <body className="font-body">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
