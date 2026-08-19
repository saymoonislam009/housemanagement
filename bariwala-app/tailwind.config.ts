import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0E1512",
          900: "#131D18",
          800: "#1B2A22",
          700: "#25392F",
          600: "#33513F",
        },
        brass: {
          400: "#E8C77E",
          500: "#D4A94F",
          600: "#B8862F",
        },
        paper: {
          50: "#FBF8F1",
          100: "#F4EEE0",
        },
        clay: {
          500: "#C15F3C",
        },
        okay: "#5C8A66",
        warn: "#D4A94F",
        bad: "#C15F3C",
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
