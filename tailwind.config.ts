import type { Config } from "tailwindcss";

// Tokens from docs/UIUX.md ("Cahier" system)
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "rgb(var(--paper) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        ink2: "rgb(var(--ink2) / <alpha-value>)",
        craie: "rgb(var(--craie) / <alpha-value>)",
        bleu: "rgb(var(--bleu) / <alpha-value>)",
        brioche: "rgb(var(--brioche) / <alpha-value>)",
        menthe: "rgb(var(--menthe) / <alpha-value>)",
        groseille: "rgb(var(--groseille) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: { card: "16px", input: "10px" },
      boxShadow: {
        card: "0 1px 0 rgb(30 36 64 / 0.06), 0 8px 24px rgb(30 36 64 / 0.08)",
        press: "0 2px 0 rgb(30 36 64 / 0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
