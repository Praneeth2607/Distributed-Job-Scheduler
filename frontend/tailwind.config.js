/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#FDFDFB',
        charcoal: '#1F1F1F',
        gold: {
          400: '#D4AF37', // soft gold
          500: '#C5A028', // deeper gold for hover
        },
        surface: '#F4F4F0',
        border: '#E8E8E3',
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}
