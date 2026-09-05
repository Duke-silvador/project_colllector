/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#f5f8fc',
          100: '#edf3f9',
          200: '#e0eaf3',
          300: '#c6d6e5',
          400: '#a0b8cc',
          500: '#7894ad',
          600: '#56718c',
          700: '#405970',
          800: '#2a4159',
          900: '#192e43',
          950: '#101e30',
        },
        sage: {
          50: '#effdfa',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5eeacb',
          400: '#2dd4b3',
          500: '#14b896',
          600: '#0d8776',
          700: '#0f6c61',
          800: '#11564f',
          900: '#134740',
        }
      },
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: ['Georgia', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}



