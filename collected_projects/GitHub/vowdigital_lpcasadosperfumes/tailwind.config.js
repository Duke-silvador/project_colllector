/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        indigo: {
          DEFAULT: '#1e1486',
          deep: '#140c66',
          soft: '#f2f0ff',
        },
        gold: {
          DEFAULT: '#b8913a',
          light: '#e4cc8c',
          wash: '#fbf6e9',
        },
        ink: '#26262e',
        muted: '#6b6b78',
        line: '#ececf1',
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cta: '0 12px 26px -14px rgba(30, 20, 134, .55)',
      },
    },
  },
  plugins: [],
}
