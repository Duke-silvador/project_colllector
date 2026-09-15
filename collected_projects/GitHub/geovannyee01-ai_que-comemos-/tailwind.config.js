/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        ember: {
          50: "#FFF4ED",
          100: "#FFE6D5",
          200: "#FFC9A8",
          300: "#FFA36B",
          400: "#FF7A3D",
          500: "#F4511E",
          600: "#DA3E10",
          700: "#B22F0C",
          800: "#8C2610",
          900: "#6E2010",
        },
        char: {
          50: "#FAF7F5",
          100: "#F1EBE7",
          800: "#2A211D",
          900: "#1C1512",
          950: "#120D0B",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "ui-serif", "Georgia", "serif"],
        body: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,21,18,0.06), 0 8px 24px -8px rgba(28,21,18,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
