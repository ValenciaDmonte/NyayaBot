/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class', // Controlled by <html class="dark"> — toggled by themeStore
  theme: {
    extend: {
      colors: {
        // ── Accent: Legal Gold ─────────────────────────────────────────────
        // Warm gold — reads "Supreme Court marble", works on both dark + light.
        gold: {
          50:  '#FDF8EC',
          100: '#FAF0D1',
          200: '#F3D98E',
          300: '#ECC24C',
          400: '#E2AB28',
          500: '#C8961F',  // Main accent — dark mode buttons, highlights
          600: '#A67A18',  // Main accent — light mode (darker for contrast on white)
          700: '#855F12',
          800: '#63470D',
          900: '#422F08',
        },
        // Zinc (Tailwind built-in) covers all neutrals:
        // zinc-950 darkest bg → zinc-50 lightest bg
        // No custom navy needed — zinc replaces it throughout.

        // ── Semantic colours for legal status ─────────────────────────────
        repealed: '#EF4444',   // Red — repealed laws
        amended:  '#F59E0B',   // Amber — recently amended
        verified: '#10B981',   // Green — verified, current law
      },
      fontFamily: {
        // System fonts that render well for Indian scripts
        sans: [
          'Inter',
          'Noto Sans',          // Covers Devanagari, Tamil, Telugu, etc.
          'system-ui',
          'sans-serif',
        ],
      },
      animation: {
        'pulse-slow':   'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in':      'fadeIn 0.3s ease-in-out',
        'slide-up':     'slideUp 0.3s ease-out',
        'bounce-slow':  'bounceSlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':      { transform: 'translateY(8px)' },
        },
      },
    },
  },
  plugins: [],
};
