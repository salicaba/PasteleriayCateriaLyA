/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Colores exclusivos del corporativo LyA
        lya: {
          bg: '#FAEDCD',       // Vainilla
          surface: '#FFFFFF',  // Blanco para tarjetas
          text: '#4A2B29',     // Marrón Espresso
          primary: '#F49AC2',  // Rosa Betún
          secondary: '#72CEC3',// Verde Turquesa
          border: '#D4A373',   // Beige oscuro
        }
      },
      borderRadius: {
        'lya': '12px',
      }
    },
  },
  plugins: [
    // Este plugin crea el prefijo lya: (ej. lya:bg-lya-bg)
    require('tailwindcss/plugin')(function({ addVariant }) {
      addVariant('lya', '.theme-lya &');
    })
  ],
}