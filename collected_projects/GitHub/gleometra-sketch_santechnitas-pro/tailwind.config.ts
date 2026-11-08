import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#172039", 700: "#1f2b4d" },
        accent: { DEFAULT: "#e28f3e", dark: "#c97a2c", soft: "#fdf1e3" },
        go: { DEFAULT: "#5bb365", dark: "#3f9a4a", soft: "#f0faf2" },
        surface: "#f2f3f5",
        ink: "#172039",
        muted: "#6b7280",
        danger: "#b3261e",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: { card: "1.5rem" },
      boxShadow: { card: "0 1px 2px rgba(23,32,57,.06)" },
    },
  },
  plugins: [],
};
export default config;
