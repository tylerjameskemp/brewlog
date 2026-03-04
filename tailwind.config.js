/** @type {import('tailwindcss').Config} */
export default {
  // Tell Tailwind where to look for class names in your files
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom colors inspired by coffee — warm, earthy palette
      colors: {
        brew: {
          50: '#fdf8f0',
          100: '#f5e6d0',
          200: '#e8cba0',
          300: '#d4a574',
          400: '#c08552',
          500: '#a0673c',
          600: '#7c4f2e',
          700: '#5c3a22',
          800: '#3d2718',
          900: '#2a1a10',
        }
      },
      fontFamily: {
        // Clean, readable fonts
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.3)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 300ms ease-out',
        'fade-in-up': 'fade-in-up 300ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
