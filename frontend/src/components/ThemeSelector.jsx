import React from 'react';
import { Sun, Moon, Cake } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

// Fíjate en el "export const" de esta línea, eso es lo que busca App.jsx
export const ThemeSelector = () => {
  const { theme, setTheme } = useTheme();

  const themes = [
    { id: 'light', icon: Sun, label: 'Claro' },
    { id: 'dark', icon: Moon, label: 'Oscuro' },
    { id: 'lya', icon: Cake, label: 'LyA' },
  ];

  return (
    <div className="flex bg-gray-200/50 dark:bg-gray-900 lya:bg-lya-bg rounded-lg p-1 transition-colors">
      {themes.map((t) => {
        const isActive = theme === t.id;
        const Icon = t.icon;
        
        return (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all ${
              isActive
                ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm border border-gray-200/50 dark:border-gray-600/50 lya:border-lya-border/30 transform scale-100'
                : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-200 lya:hover:text-lya-text hover:bg-gray-200/50 dark:hover:bg-gray-800 lya:hover:bg-lya-border/20 transform scale-95 hover:scale-100'
            }`}
            title={`Cambiar a tema ${t.label}`}
          >
            <Icon 
              size={14} 
              className={isActive && t.id === 'lya' ? 'text-orange-500 lya:text-lya-primary' : ''} 
            />
            <span>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
};