import { useState, useEffect } from 'react';

export const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('theme')) {
      return localStorage.getItem('theme');
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    // Removemos todos los temas posibles antes de aplicar el nuevo
    root.classList.remove('light', 'dark', 'theme-lya');
    
    // Agregamos la clase correspondiente
    if (theme === 'lya') {
      root.classList.add('theme-lya');
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.add('light'); 
    }
    
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme }; // Exponemos setTheme para el selector
};