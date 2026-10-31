import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        brand: {
          50: "#f0fdfa",
          100: "#ccfbf1",
          200: "#99f6e4",
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
          700: "#0f766e",
          800: "#115e59",
          900: "#134e4a",
          950: "#042f2e",
        },
        accent: {
          cyan: "#06b6d4",
          violet: "#8b5cf6",
          emerald: "#10b981",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "radial-glass": "radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.15) 0%, transparent 70%)",
        "mesh-dark": "radial-gradient(at 0% 0%, rgba(139, 92, 246, 0.12) 0px, transparent 50%), radial-gradient(at 100% 0%, rgba(6, 182, 212, 0.15) 0px, transparent 50%), radial-gradient(at 50% 100%, rgba(16, 185, 129, 0.08) 0px, transparent 50%)",
      },
      boxShadow: {
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-glow": "0 0 25px -5px rgba(6, 182, 212, 0.3)",
        "glass-violet": "0 0 25px -5px rgba(139, 92, 246, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
