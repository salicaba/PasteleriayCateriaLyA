/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'lya': ['"Dancing Script"', 'cursive'], 
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: { primary: '#D946EF', secondary: '#F472B6', dark: '#1F2937' }
      }
    },
  },
  plugins: [],
}