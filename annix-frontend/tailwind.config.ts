import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        amix: {
          navy: {
            DEFAULT: '#323288',
            light: '#4a4da3',
            dark: '#252560',
          },
          orange: {
            DEFAULT: '#FFA500',
            light: '#FFB733',
            dark: '#CC8400',
          },
        },
        blue: {
          50: '#eeeef9',
          100: '#d9d9f1',
          200: '#b8b9e4',
          300: '#9697d4',
          400: '#7173c2',
          500: '#4a4da3',
          600: '#323288',
          700: '#2b2b74',
          800: '#252560',
          900: '#1b1b48',
          950: '#111130',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)'],
        mono: ['var(--font-geist-mono)'],
        signature: ['var(--font-great-vibes)', 'Great Vibes', 'cursive'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
