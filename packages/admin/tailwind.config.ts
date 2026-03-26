import type { Config } from 'tailwindcss';

const config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 24px 60px rgba(145, 84, 28, 0.18)',
      },
      keyframes: {
        heroFloat: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -18px, 0)' },
        },
        panelRise: {
          '0%': {
            opacity: '0',
            transform: 'translate3d(0, 16px, 0)',
          },
          '100%': {
            opacity: '1',
            transform: 'translate3d(0, 0, 0)',
          },
        },
      },
      animation: {
        heroFloat: 'heroFloat 16s ease-in-out infinite',
        panelRise: 'panelRise 280ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'sans-serif'],
      },
    },
  },
} satisfies Config;

export default config;
