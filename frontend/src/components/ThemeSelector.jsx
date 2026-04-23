import React from 'react';
import { useTheme } from '../hooks/useTheme';

// Fíjate en el "export const" de esta línea, eso es lo que busca App.jsx
export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-col">
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        className="bg-brand-surface text-brand-text border border-brand-border rounded-lya px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary cursor-pointer transition-colors"
      >
        <option value="light">☀️ Modo Claro</option>
        <option value="dark">🌙 Modo Oscuro</option>
        <option value="lya">🍰 Tema LyA</option>
      </select>
    </div>
  );
};