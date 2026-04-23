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
                ? "bg-brand-secondary text-brand-surface border-brand-secondary shadow-lg shadow-brand-secondary/30" 
                : "bg-brand-surface text-brand-text border-brand-border/30 hover:border-brand-secondary/50 hover:text-brand-secondary opacity-80 hover:opacity-100"
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