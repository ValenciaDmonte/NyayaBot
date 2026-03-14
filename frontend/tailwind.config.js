/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // NyayaBot design system colours
        navy: {
          DEFAULT: '#1A237E',  // Primary background
          50:  '#E8EAF6',
          100: '#C5CAE9',
          200: '#9FA8DA',
          300: '#7986CB',
          400: '#5C6BC0',
          500: '#3F51B5',
          600: '#3949AB',
          700: '#303F9F',
          800: '#283593',
          900: '#1A237E',      // Main dark navy
          950: '#0D1257',      // Even darker for sidebar
        },
        saffron: {
          DEFAULT: '#FF9933',  // Primary accent (Indian flag saffron)
          50:  '#FFF3E0',
          100: '#FFE0B2',
          200: '#FFCC80',
          300: '#FFB74D',
          400: '#FFA726',
          500: '#FF9800',
          600: '#FF9933',      // Main saffron
          700: '#E65100',
        },
        // Semantic colours for legal status
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
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
