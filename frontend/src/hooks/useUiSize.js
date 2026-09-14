//frontend/src/hooks/useUiSize.js
import { useState, useEffect } from 'react';

export const useUiSize = () => {
  const [uiSize, setUiSize] = useState(() => {
    if (typeof window !== 'undefined') {
      // 1. Usamos la llave EXACTA de tu sistema
      const savedSize = localStorage.getItem('lya_ui_size');
      if (savedSize) return savedSize;

      // 2. Si no hay nada guardado, auto-detectamos la pantalla
      const width = window.innerWidth;
      if (width < 768) return 'small';    // Móviles
      if (width < 1280) return 'medium';  // Tablets y Laptops estándar
      return 'large';                     // Monitores grandes / PCs
    }
    return 'medium'; // Fallback de seguridad
  });

  useEffect(() => {
    // Cada vez que cambie, lo guardamos
    localStorage.setItem('lya_ui_size', uiSize);
    
    // Inyectamos el tamaño base para escalar los "rem" de Tailwind en toda la app
    const root = document.documentElement;
    if (uiSize === 'large') root.style.fontSize = '16px'; 
    if (uiSize === 'medium') root.style.fontSize = '14px'; 
    if (uiSize === 'small') root.style.fontSize = '12px';
  }, [uiSize]);

  return { uiSize, setUiSize };
};