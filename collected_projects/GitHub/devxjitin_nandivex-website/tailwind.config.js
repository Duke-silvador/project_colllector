/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FFFFFF',
        soft: '#F3F7FF',
        ink: '#0F172A',
        muted: '#5A6578',
        line: '#E2E8F3',
        accent: '#0057E7',
        'accent-dark': '#0A45B8',
        tint: '#E8F0FF',
        night: '#0B1B3A',
        cyan: '#18B7FF',
        sun: '#FFB020',
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.10)',
        lift: '0 2px 4px rgba(15,23,42,.05), 0 18px 40px -12px rgba(0,87,231,.25)',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(14px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: { rise: 'rise .6s ease-out both' },
    },
  },
  plugins: [],
};
