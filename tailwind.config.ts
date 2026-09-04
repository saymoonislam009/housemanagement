import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brandDark: "#0E1512",
        ink: {
          950: "rgb(var(--ink-950) / <alpha-value>)",
          900: "rgb(var(--ink-900) / <alpha-value>)",
          800: "rgb(var(--ink-800) / <alpha-value>)",
          700: "rgb(var(--ink-700) / <alpha-value>)",
          600: "rgb(var(--ink-600) / <alpha-value>)",
        },
        brass: {
          400: "rgb(var(--brass-400) / <alpha-value>)",
          500: "rgb(var(--brass-500) / <alpha-value>)",
          600: "rgb(var(--brass-600) / <alpha-value>)",
        },
        paper: {
          50: "rgb(var(--paper-50) / <alpha-value>)",
          100: "rgb(var(--paper-100) / <alpha-value>)",
        },
        clay: {
          500: "rgb(var(--clay-500) / <alpha-value>)",
        },
        okay: "rgb(var(--okay) / <alpha-value>)",
        warn: "rgb(var(--brass-500) / <alpha-value>)",
        bad: "rgb(var(--clay-500) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(14,21,18,0.06), 0 8px 24px -12px rgba(14,21,18,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
