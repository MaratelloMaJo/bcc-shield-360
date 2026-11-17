import type { Metadata, Viewport } from "next";
import { Golos_Text, Literata, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const golos = Golos_Text({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-golos",
  display: "swap",
});

const literata = Literata({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "600"],
  variable: "--font-literata",
  display: "swap",
});

const spline = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-spline",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BCC Shield 360 — активная киберзащита",
  description:
    "Единая экосистема активной киберзащиты клиента Банка ЦентрКредит: SafeCall Shield, TrustLens, GuardPay и AI Scam-Scanner.",
  applicationName: "BCC Shield 360",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "BCC Shield 360",
    statusBarStyle: "black-translucent",
  },
  other: {
    // Next still emits the legacy apple-* tag; this satisfies the modern spec.
    "mobile-web-app-capable": "yes",
  },
  authors: [{ name: "BCC Bank" }],
  keywords: [
    "BCC Bank",
    "Банк ЦентрКредит",
    "кибербезопасность",
    "антифрод",
    "SafeCall",
    "TrustLens",
    "GuardPay",
    "ITU Hackathon 2026",
  ],
  openGraph: {
    title: "BCC Shield 360",
    description:
      "Активная киберзащита клиента внутри мобильного банкинга Банка ЦентрКредит.",
    type: "website",
  },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#00A859"/><path d="M32 12 50 19v13c0 11-7.6 18.4-18 21-10.4-2.6-18-10-18-21V19l18-7Z" fill="#06110C"/><path d="m24 32 6 6 11-12" stroke="#34D399" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
          ),
        type: "image/svg+xml",
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F3EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1512" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      data-theme="light"
      className={`${golos.variable} ${literata.variable} ${spline.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("bcc_shield_360_theme_v1")==="dark"){document.documentElement.dataset.theme="dark";document.documentElement.style.colorScheme="dark";}}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
