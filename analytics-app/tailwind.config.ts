import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3713ec',
        'bg-dark': '#0d0b1e',
        'bg-card': '#1a1630',
        'bg-card2': '#1e1a35',
        navy: '#131022',
        purple: {
          neon: '#7c3aed',
          soft: '#9b92c9',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
