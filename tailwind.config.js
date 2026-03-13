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
        },
        // Semantic palette — named after coffee craft materials
        crema: {
          50: '#fef6ee',
          100: '#fdeadb',
          200: '#f9d1b0',
          300: '#f4b07c',
          400: '#ee8c4e',
          500: '#c15f3c',   // Primary CTA — terracotta
          600: '#a44a30',
          700: '#863a28',
          800: '#6c3024',
          900: '#5a2820',
        },
        sage: {
          50: '#f4f6ef',
          100: '#e6eadb',
          200: '#cfd8bb',
          300: '#b0c093',
          400: '#93a872',
          500: '#7d8966',   // Success — muted, earthy green
          600: '#606c4d',
          700: '#4b543e',
          800: '#3e4534',
          900: '#353c2e',
        },
        parchment: {
          50: '#fefdfb',
          100: '#faf7f2',   // App background
          200: '#f3ece0',
          300: '#e8dbc9',
          400: '#d9c5a9',
        },
        ceramic: {
          50: '#f9f8f7',
          100: '#f1efed',
          200: '#e3dfdb',
          300: '#d0cac4',
          400: '#b5ada5',
        },
        felt: {
          900: '#1A1A1A',
          800: '#222222',
          700: '#2E2824',
          600: '#2C2420',
          500: '#908880',
          400: '#706858',
          300: '#5C5047',
          200: '#B87333',
          100: '#EFEBE5',
          50:  '#F5F1EB',
        },
      },
      fontFamily: {
        // Clean, readable fonts
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Display serif — for headings and emotional moments
        display: ['"Fraunces"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
        condensed: ['"Barlow Condensed"', 'system-ui', 'sans-serif'],
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
        // Completion moment — elastic bounce for the checkmark
        'brew-complete': {
          '0%': { opacity: '0', transform: 'scale(0.6)' },
          '40%': { opacity: '1', transform: 'scale(1.08)' },
          '65%': { opacity: '1', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Warm radial glow that pulses once
        'warm-glow': {
          '0%': { boxShadow: '0 0 0 0 rgba(193, 95, 60, 0)' },
          '40%': { boxShadow: '0 0 48px 16px rgba(193, 95, 60, 0.18)' },
          '100%': { boxShadow: '0 0 0 0 rgba(193, 95, 60, 0)' },
        },
        // Staggered slide-up for content blocks
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'board-slide': {
          '0%': { opacity: '0', transform: 'translateY(-3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'countdown-tick': {
          '0%': { opacity: '0', transform: 'scale(1.5)' },
          '20%': { opacity: '1', transform: 'scale(1)' },
          '80%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0.3', transform: 'scale(0.8)' },
        },
        'blob-drift-1': {
          '0%, 100%': { transform: 'translate(-50%,-50%) translate(0,0)' },
          '35%': { transform: 'translate(-50%,-50%) translate(15px,-8px)' },
          '70%': { transform: 'translate(-50%,-50%) translate(-10px,6px)' },
        },
        'blob-drift-2': {
          '0%, 100%': { transform: 'translate(-50%,-50%) translate(0,0)' },
          '40%': { transform: 'translate(-50%,-50%) translate(-12px,10px)' },
          '75%': { transform: 'translate(-50%,-50%) translate(18px,-5px)' },
        },
        'blob-drift-3': {
          '0%, 100%': { transform: 'translate(-50%,-50%) translate(0,0)' },
          '30%': { transform: 'translate(-50%,-50%) translate(8px,12px)' },
          '65%': { transform: 'translate(-50%,-50%) translate(-14px,-8px)' },
        },
        'blob-drift-4': {
          '0%, 100%': { transform: 'translate(-50%,-50%) translate(0,0)' },
          '45%': { transform: 'translate(-50%,-50%) translate(-6px,-10px)' },
          '80%': { transform: 'translate(-50%,-50%) translate(10px,8px)' },
        },
        'note-fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 300ms ease-out',
        'fade-in-up': 'fade-in-up 300ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
        'pulse-dot': 'pulse-dot 2s ease-in-out infinite',
        'brew-complete': 'brew-complete 800ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'warm-glow': 'warm-glow 1.5s ease-out both',
        'slide-up': 'slide-up 500ms ease-out both',
        'slide-up-d1': 'slide-up 500ms ease-out 150ms both',
        'slide-up-d2': 'slide-up 500ms ease-out 300ms both',
        'slide-up-d3': 'slide-up 500ms ease-out 450ms both',
        'board-slide': 'board-slide 200ms ease-out',
        'countdown-tick': 'countdown-tick 1s ease-out forwards',
        'blob-drift-1': 'blob-drift-1 22s ease-in-out infinite',
        'blob-drift-2': 'blob-drift-2 28s ease-in-out infinite',
        'blob-drift-3': 'blob-drift-3 18s ease-in-out infinite',
        'blob-drift-4': 'blob-drift-4 32s ease-in-out infinite',
        'note-fade-up': 'note-fade-up 500ms ease-out 600ms both',
      },
    },
  },
  plugins: [],
}
