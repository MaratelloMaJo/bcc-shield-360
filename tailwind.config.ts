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
        /* Semantic roles driven by the CSS token layer in app/globals.css. */
        canvas: "rgb(var(--bcc-canvas) / <alpha-value>)",
        surface: "rgb(var(--bcc-surface) / <alpha-value>)",
        raised: "rgb(var(--bcc-raised) / <alpha-value>)",
        line: "rgb(var(--bcc-line) / <alpha-value>)",
        "line-strong": "rgb(var(--bcc-line-strong) / <alpha-value>)",
        ink: "rgb(var(--bcc-ink) / <alpha-value>)",
        "ink-soft": "rgb(var(--bcc-ink-soft) / <alpha-value>)",
        muted: "rgb(var(--bcc-muted) / <alpha-value>)",
        accent: "rgb(var(--bcc-accent) / <alpha-value>)",
        "accent-strong": "rgb(var(--bcc-accent-strong) / <alpha-value>)",
        "accent-soft": "rgb(var(--bcc-accent-soft) / <alpha-value>)",
        "accent-ink": "rgb(var(--bcc-accent-ink) / <alpha-value>)",
        safe: "rgb(var(--bcc-safe) / <alpha-value>)",
        "safe-soft": "rgb(var(--bcc-safe-soft) / <alpha-value>)",
        "safe-ink": "rgb(var(--bcc-safe-ink) / <alpha-value>)",
        warn: "rgb(var(--bcc-warn) / <alpha-value>)",
        "warn-soft": "rgb(var(--bcc-warn-soft) / <alpha-value>)",
        "warn-ink": "rgb(var(--bcc-warn-ink) / <alpha-value>)",
        danger: "rgb(var(--bcc-danger) / <alpha-value>)",
        "danger-soft": "rgb(var(--bcc-danger-soft) / <alpha-value>)",
        "danger-ink": "rgb(var(--bcc-danger-ink) / <alpha-value>)",
        guardian: "rgb(var(--bcc-guardian) / <alpha-value>)",
        "guardian-soft": "rgb(var(--bcc-guardian-soft) / <alpha-value>)",
        "guardian-ink": "rgb(var(--bcc-guardian-ink) / <alpha-value>)",
        paper: "rgb(var(--bcc-paper) / <alpha-value>)",
        overlay: "rgb(var(--bcc-overlay) / <alpha-value>)",
        bezel: "rgb(var(--bcc-bezel) / <alpha-value>)",
        brand: "rgb(var(--bcc-brand) / <alpha-value>)",
        "brand-ink": "rgb(var(--bcc-brand-ink) / <alpha-value>)",
        /* Legacy palette: screens still reference it until Task 8 removes it. */
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
        sans: ["var(--font-golos)", "system-ui", "sans-serif"],
        display: ["var(--font-literata)", "Georgia", "serif"],
        mono: ["var(--font-spline)", "ui-monospace", "monospace"],
      },
      fontSize: {
        screen: ["24px", { lineHeight: "29px", letterSpacing: "-0.01em" }],
        amount: ["28px", { lineHeight: "34px" }],
        modal: ["20px", { lineHeight: "26px" }],
        score: ["40px", { lineHeight: "40px" }],
        section: ["16px", { lineHeight: "22px" }],
        body: ["14px", { lineHeight: "22px" }],
        secondary: ["13px", { lineHeight: "18px" }],
        meta: ["12px", { lineHeight: "16px" }],
        aux: ["11px", { lineHeight: "14px" }],
        hash: ["12px", { lineHeight: "16px" }],
      },
      borderRadius: {
        control: "10px",
        card: "14px",
        sheet: "18px",
        device: "22px",
      },
      boxShadow: {
        phone:
          "0 50px 140px -40px rgba(0, 0, 0, 0.95), 0 0 0 1px rgba(255, 255, 255, 0.035) inset",
        card: "var(--bcc-shadow-card)",
        panel: "var(--bcc-shadow-panel)",
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
