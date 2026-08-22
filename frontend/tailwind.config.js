/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#14181f',
        paper: '#fffdf8',
        wash: '#f1f4f1',
        rail: '#d9dfda',
        transit: '#0e6e8c',
        'transit-dark': '#09536b',
        stamp: '#b33a2b',
        ochre: '#d79b2f',
        muted: '#5f6965',
      },
      fontFamily: {
        serif: ['Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
