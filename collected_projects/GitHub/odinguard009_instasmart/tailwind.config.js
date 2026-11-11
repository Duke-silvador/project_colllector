/** Warna memakai variabel CSS (lihat src/index.css) supaya tema gelap/terang cukup ganti variabel. */
const themed = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: themed('bg'),
        surface: themed('surface'),
        raised: themed('raised'),
        line: themed('line'),
        ink: themed('ink'),
        muted: themed('muted'),
        brand: themed('brand'),
        good: themed('good'),
        bad: themed('bad'),
        warn: themed('warn'),
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Noto Sans', 'sans-serif'],
      },
      keyframes: {
        'heart-pop': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '30%': { transform: 'scale(1.25)', opacity: '1' },
          '60%': { transform: 'scale(0.95)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        'fade-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'heart-pop': 'heart-pop 800ms ease-out forwards',
        'fade-up': 'fade-up 240ms ease-out both',
      },
    },
  },
  plugins: [],
};
