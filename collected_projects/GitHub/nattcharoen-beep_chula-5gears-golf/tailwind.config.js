/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        chula: {
          50: '#fdf2f8',
          100: '#fce7f3',
          200: '#fbcfe8',
          300: '#f9a8d4',
          400: '#f472b6',
          500: '#de388b',
          600: '#be123c',
          700: '#9f1239',
          pink: '#de388b',
          rose: '#e11d48',
          gold: '#d4af37',
        },
        golf: {
          fairway: '#15803d',
          green: '#16a34a',
          dark: '#064e3b',
          sand: '#fef08a',
          water: '#0284c7',
        }
      }
    },
  },
  plugins: [],
}
