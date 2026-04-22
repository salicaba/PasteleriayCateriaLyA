import React from 'react';
import { Coffee, Cake, Croissant, Utensils, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';

const getIconForCategory = (name) => {
  const n = name.toLowerCase();
  if (n.includes('bebida') || n.includes('café') || n.includes('cafe') || n.includes('frapp')) return Coffee;
  if (n.includes('postre') || n.includes('pastel') || n.includes('repost')) return Cake;
  if (n.includes('pan')) return Croissant;
  if (n.includes('comida') || n.includes('desayuno') || n.includes('snack')) return Utensils;
  return LayoutGrid;
};

export const CategoryBar = ({ categories = [], active, onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 hide-scrollbar">
      {categories.map(cat => {
        const Icon = cat.id === 'todas' ? LayoutGrid : getIconForCategory(cat.name);
        const isActive = active === cat.id;
        
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={clsx(
              "flex items-center gap-2 px-5 py-2.5 rounded-full border-2 transition-all whitespace-nowrap text-sm font-bold active:scale-95",
              isActive 
                // 🔥 FIX: El botón activo ahora es vibrante en ambos modos (Naranja/Primario)
                ? "bg-brand-primary dark:bg-orange-500 text-white border-brand-primary dark:border-orange-500 shadow-md shadow-brand-primary/30 dark:shadow-orange-500/20" 
                // 🔥 FIX: Los inactivos son visiblemente más apagados en Dark Mode (gray-800)
                : "bg-white dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-gray-700 hover:border-brand-primary/50 dark:hover:border-orange-500/50 hover:text-brand-primary dark:hover:text-orange-400"
            )}
          >
            <Icon size={16} />
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
};