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
    },
  },
  plugins: [],
}

export default config
