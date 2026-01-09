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
            DEFAULT: '#001F3F',
            light: '#003366',
            dark: '#001529',
          },
          orange: {
            DEFAULT: '#FFA500',
            light: '#FFB733',
            dark: '#CC8400',
          },
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
