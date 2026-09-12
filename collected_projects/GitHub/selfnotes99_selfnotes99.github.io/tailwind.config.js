/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        peach: {
          DEFAULT: '#EBAF87',
          50: '#FDF8F5',
          100: '#FAF0E9',
          200: '#F4DDCB',
          300: '#EFC7AB',
          400: '#EBAF87',
          500: '#E39768',
          600: '#D57B45',
        },
        cream: {
          DEFAULT: '#F7E5D3',
          light: '#FCF7F0',
          dark: '#EED6C0',
        },
        maroon: {
          DEFAULT: '#7C2928',
          light: '#963433',
          dark: '#521B18',
          deep: '#3E1311',
        },
        deep: {
          text: '#1F1714',
          muted: '#4A3E39',
        },
        gold: {
          DEFAULT: '#E5A835',
          light: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-heading)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm': '0 10px 25px -5px rgba(124, 41, 40, 0.08), 0 8px 10px -6px rgba(124, 41, 40, 0.05)',
        'warm-lg': '0 20px 30px -10px rgba(124, 41, 40, 0.12), 0 10px 15px -5px rgba(124, 41, 40, 0.08)',
        'card': '0 4px 20px rgba(82, 27, 24, 0.06)',
      }
    },
  },
  plugins: [],
};
