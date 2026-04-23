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
                ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/30 lya:bg-lya-secondary lya:border-lya-secondary lya:text-lya-surface lya:shadow-lya-secondary/30" 
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-orange-500/50 hover:text-orange-500 dark:hover:text-orange-400 lya:bg-lya-surface lya:text-lya-text lya:border-lya-border/40 lya:hover:border-lya-secondary/50 lya:hover:text-lya-secondary opacity-80 hover:opacity-100"
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