/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{html,js}"
  ],
  theme: {
    extend: {
      colors: {
        'deep-tide': '#153A3A',
        'salt-white': '#F7F5EF',
        'sea-glass': '#D9E6D9',
        'surf-coral': {
          DEFAULT: '#F16D4F',
          hover: '#E05A3B',
          light: '#FCECE8',
        },
        'ocean-mist': '#A9C9C3',
        'warm-sand': {
          DEFAULT: '#E8D7BB',
          light: '#F4ECE0',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        'editorial': '0.04em',
        'tight-editorial': '-0.02em',
      },
    },
  },
  plugins: [],
}
