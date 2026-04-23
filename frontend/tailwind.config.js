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
        brand: {
          bg: 'var(--color-bg)',
          surface: 'var(--color-surface)',
          text: 'var(--color-text)',
          primary: 'var(--color-primary)',   // Rosa LyA
          secondary: 'var(--color-secondary)', // Turquesa LyA
          border: 'var(--color-border)',
        }
      },
      borderRadius: {
        'lya': '12px',
      }
    },
  },
  plugins: [],
}