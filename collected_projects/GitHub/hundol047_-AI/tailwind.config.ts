import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#020817",
          panel: "#071426",
          card: "#0B1628",
        },
        cyan: {
          DEFAULT: "#18E7F2",
        },
        blue: {
          DEFAULT: "#3182FF",
        },
        purple: {
          DEFAULT: "#725CFF",
        },
        danger: {
          DEFAULT: "#FF5C67",
        },
        success: {
          DEFAULT: "#22E6A8",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 24px rgba(24, 231, 242, 0.35)",
        "glow-danger": "0 0 24px rgba(255, 92, 103, 0.4)",
        "glow-success": "0 0 24px rgba(34, 230, 168, 0.35)",
        card: "0 8px 32px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        "grid-glow":
          "radial-gradient(circle at 20% 20%, rgba(24,231,242,0.08), transparent 40%), radial-gradient(circle at 80% 0%, rgba(114,92,255,0.10), transparent 45%)",
      },
      animation: {
        "pulse-glow": "pulse-glow 1.6s ease-in-out infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.35s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(24,231,242,0.25)" },
          "50%": { boxShadow: "0 0 28px rgba(24,231,242,0.65)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
