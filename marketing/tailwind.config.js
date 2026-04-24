/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#0A0707',
        oxblood: '#8B1A1A',
        oxbloodbright: '#B32121',
        gold: '#C9A24A',
        bone: '#F2ECE2',
        ash: '#8F857A',
        border: '#2A1B1B',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'system-ui', 'sans-serif'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        none: '0',
      },
      transitionTimingFunction: {
        earned: 'cubic-bezier(.22,1,.36,1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-gold': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.65s cubic-bezier(.22,1,.36,1) both',
        'pulse-gold': 'pulse-gold 2.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
