import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#08090A",
          surface: "#111214",
          "surface-hover": "#191B1F",
          elevated: "#16181C",
        },
        border: {
          subtle: "#1E2028",
          hover: "#2A2D38",
        },
        text: {
          primary: "#EDEEF0",
          secondary: "#8B8D98",
          tertiary: "#5A5C66",
        },
        accent: {
          primary: "#3B82F6",
          "primary-hover": "#60A5FA",
          glow: "rgba(59, 130, 246, 0.12)",
          success: "#22C55E",
          warm: "#F59E0B",
        },
      },
      fontFamily: {
        display: ["var(--font-instrument-serif)", "Playfair Display", "serif"],
        body: ["var(--font-satoshi)", "General Sans", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      maxWidth: {
        content: "1200px",
      },
      animation: {
        "dot-flow": "dotFlow 3s linear infinite",
      },
      keyframes: {
        dotFlow: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
