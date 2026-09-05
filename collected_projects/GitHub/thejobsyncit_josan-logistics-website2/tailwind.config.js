/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#FFF2EB',
          100: '#FFE0D1',
          200: '#FFBEA3',
          300: '#FF9466',
          400: '#FF7D3B',
          500: '#FF6B00', // Vibrant Electric Orange (as in reference)
          600: '#E55C00', // Hover Electric Orange
          700: '#BF4B00',
          800: '#993900',
          900: '#7D2D00',
          950: '#471600',
        },
        brand: {
          orange: '#FF6B00',
          hover: '#E55C00',
          light: '#FFF2EB',
          dark: '#0F172A',
          card: '#FFFFFF',
          border: '#E2E8F0',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'orange-glow': '0 10px 30px -5px rgba(255, 107, 0, 0.4)',
        'orange-sm': '0 4px 14px 0 rgba(255, 107, 0, 0.3)',
        'card': '0 10px 25px -5px rgba(15, 23, 42, 0.05), 0 8px 10px -6px rgba(15, 23, 42, 0.01)',
        'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
      }
    },
  },
  plugins: [],
}
