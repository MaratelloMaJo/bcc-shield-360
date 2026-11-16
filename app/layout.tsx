import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BCC Shield 360 — активная киберзащита",
  description:
    "Единая экосистема активной киберзащиты клиента Банка ЦентрКредит: SafeCall Shield, TrustLens, GuardPay и AI Scam-Scanner.",
  applicationName: "BCC Shield 360",
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
  themeColor: "#06110C",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
