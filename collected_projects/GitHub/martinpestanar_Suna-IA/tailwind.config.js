/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FBF9F5',
        surface: '#FFFFFF',
        subtle: '#F5F2EB',
        subtleBg: '#F3EFEA',
        elevated: '#EFECE6',
        borderSubtle: '#E5E0D8',
        borderHover: '#D6D0C7',
        borderStrong: '#BCB4A8',
        accent: {
          DEFAULT: '#D97757',
          hover: '#C46244',
          subtle: '#FAF1ED',
          dark: '#963E24',
        },
        primaryText: '#1F1E1D',
        secondaryText: '#645F5B',
        mutedText: '#8C8681',
        sage: {
          DEFAULT: '#3F7A5C',
          light: '#EBF4EF',
          dark: '#2D6148',
        },
        amberState: {
          DEFAULT: '#C4841D',
          light: '#FBF4E8',
        },
      },
      fontFamily: {
        serif: ['Newsreader', 'Lora', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(31, 30, 29, 0.05)',
        card: '0 4px 14px rgba(31, 30, 29, 0.06)',
        drawer: '0 -4px 24px rgba(31, 30, 29, 0.08)',
        floating: '0 10px 30px rgba(31, 30, 29, 0.12)',
      },
    },
  },
  plugins: [],
}
