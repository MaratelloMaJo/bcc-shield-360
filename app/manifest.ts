import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BCC Shield 360 — Киберзащита Банка ЦентрКредит",
    short_name: "BCC Shield 360",
    description:
      "Активная киберзащита клиента Банка ЦентрКредит: SafeCall Shield, TrustLens, GuardPay и AI Scam-Scanner.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1F17",
    theme_color: "#00A859",
    lang: "ru",
    dir: "ltr",
    categories: ["finance", "security", "utilities"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/maskable-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
