/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e40af',
          900: '#1e3a8a',
        },
        gold: {
          500: '#d97706',
          600: '#b45309',
        }
      },
      fontFamily: {
        sans: ['var(--font-assistant)', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['var(--font-frank-ruhl)', 'Frank Ruhl Libre', 'David', 'Georgia', 'serif'],
        traditional: ['var(--font-frank-ruhl)', 'Frank Ruhl Libre', 'David', 'serif'],
      }
    },
  },
  plugins: [],
};
