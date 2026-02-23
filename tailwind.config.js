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
      }
    },
  },
  plugins: [],
}
