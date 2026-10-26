/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        panel: 'var(--pn)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        muted: 'rgb(var(--mut-rgb) / <alpha-value>)',
        accent: 'rgb(var(--acc-rgb) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Anton', 'Dela Gothic One', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        kanji: ['Dela Gothic One', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
