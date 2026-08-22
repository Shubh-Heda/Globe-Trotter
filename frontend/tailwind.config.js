/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // TripCraft palette (convert_frontend/TripCraft Prototype.dc.html) — this
        // is the authoritative design source, ported 1:1 rather than reusing the
        // earlier placeholder tokens.
        ink: '#101a20',
        paper: '#ffffff',
        wash: '#f4f6f1',
        'wash-deep': '#eaf0e8',
        'wash-soft': '#f6f9f5',
        rail: '#d9e1d8',
        'rail-soft': '#eef2ec',
        muted: '#5c6f69',
        placeholder: '#8a9a94',
        brand: '#13463a',
        'brand-light': '#1f6f5c',
        accent: '#b2721c',
        'accent-light': '#dd9634',
        stamp: '#b33a2b',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        heading: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      backgroundImage: {
        cta: 'linear-gradient(135deg, #dd9634, #b2721c)',
        'brand-gradient': 'linear-gradient(160deg, #13463a, #101a20)',
      },
    },
  },
  plugins: [],
}
