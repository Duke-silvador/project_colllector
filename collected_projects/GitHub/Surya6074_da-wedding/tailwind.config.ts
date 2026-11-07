import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wedding: {
          magenta: "#B0125B",
          maroon: "#4A0E2E",
          ivory: "#FFF8E7",
          champagne: "#E8D9A0",
          gold: "#C9A227",
          goldLight: "#F6EBB8",
          goldDark: "#9E7B16",
          roseLight: "#FCE7F3",
          deepWine: "#2D051B",
          cardBg: "rgba(255, 248, 231, 0.85)",
          cardBorder: "rgba(201, 162, 39, 0.35)",
        },
      },
      fontFamily: {
        script: ["var(--font-great-vibes)", "cursive"],
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
      },
      boxShadow: {
        goldGlow: "0 0 25px rgba(201, 162, 39, 0.35)",
        goldSoft: "0 8px 30px rgba(74, 14, 46, 0.12)",
        magentaGlow: "0 0 30px rgba(176, 18, 91, 0.25)",
      },
      backgroundImage: {
        "gold-shimmer": "linear-gradient(135deg, #E8D9A0 0%, #C9A227 50%, #F6EBB8 100%)",
        "magenta-gradient": "linear-gradient(135deg, #B0125B 0%, #700938 100%)",
        "temple-sky": "linear-gradient(180deg, #2D051B 0%, #4A0E2E 40%, #B0125B 80%, #E8D9A0 100%)",
      },
      animation: {
        "float-slow": "float 6s ease-in-out infinite",
        "pulse-gold": "pulseGold 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 25s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseGold: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.03)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
