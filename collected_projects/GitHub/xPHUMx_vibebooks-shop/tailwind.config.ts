import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Liquid Glass Commerce Design System Tokens (from DESIGN.md)
        porcelain: '#fbfbfd',
        surface: '#fcf8fb',
        'surface-dim': '#dcd9dc',
        'surface-bright': '#fcf8fb',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f6f3f5',
        'surface-container': '#f0edef',
        'surface-container-high': '#eae7ea',
        'surface-container-highest': '#e4e2e4',
        'on-surface': '#1b1b1d',
        'on-surface-variant': '#4c4546',
        'charcoal': '#1d1d1f',
        'muted-slate': '#86868b',
        'hairline': 'rgba(0, 0, 0, 0.06)',
        'hairline-subtle': 'rgba(0, 0, 0, 0.04)',
        'primary': '#000000',
        'on-primary': '#ffffff',
        'secondary': '#0071e3', // Verified Blue
        'on-secondary': '#ffffff',
        'accent-emerald': '#34c759', // Voucher Emerald
        'accent-coral': '#ff3b30', // Flash Urgency
        'glass-rim': 'rgba(255, 255, 255, 0.65)',
        'glass-fill': 'rgba(255, 255, 255, 0.85)',
      },
      boxShadow: {
        'level-1': '0 2px 8px rgba(0, 0, 0, 0.02), 0 8px 24px rgba(0, 0, 0, 0.04)',
        'level-2': '0 12px 32px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.02)',
        'level-3': '0 24px 64px rgba(0, 0, 0, 0.10), 0 4px 16px rgba(0, 0, 0, 0.04)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05), inset 0 0 0 1px rgba(255, 255, 255, 0.4)',
      },
      borderRadius: {
        'squircle-sm': '16px',
        'squircle': '20px',
        'squircle-lg': '24px',
        'squircle-xl': '32px',
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'var(--font-thai)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['var(--font-jakarta)', 'sans-serif'],
        thai: ['var(--font-thai)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
