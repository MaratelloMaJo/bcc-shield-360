import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bcc: {
          page: "#06110C",
          forest: "#0B1F17",
          surface: "#122B21",
          raised: "#163527",
          line: "#1E4233",
          green: "#00A859",
          mint: "#34D399",
          text: "#E8F5EE",
          muted: "#7FA793",
          safe: "#10B981",
          warn: "#F59E0B",
          guardian: "#8B5CF6",
          danger: "#EF4444",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        phone:
          "0 50px 140px -40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.035) inset",
        panel: "0 24px 80px -40px rgba(0, 0, 0, 0.9)",
      },
      keyframes: {
        "fade-rise": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "drawer-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "radar-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.45)" },
          "70%": { boxShadow: "0 0 0 14px rgba(239, 68, 68, 0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(239, 68, 68, 0)" },
        },
        "live-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-rise": "fade-rise 280ms ease-out both",
        "drawer-up": "drawer-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "radar-pulse": "radar-pulse 2.2s ease-out infinite",
        "live-pulse": "live-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
