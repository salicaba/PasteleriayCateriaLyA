/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // <--- ESTO ES LA CLAVE
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        lya: ['Pacifico', 'cursive'], // Fuente para el logo
      },
      colors: {
        brand: {
          primary: '#D946EF', // Fuchsia-500
          secondary: '#A855F7', // Purple-500
          dark: '#1F2937',    // Gray-800
          light: '#F3F4F6',   // Gray-100
        }
      }
    },
  },
  plugins: [],
}