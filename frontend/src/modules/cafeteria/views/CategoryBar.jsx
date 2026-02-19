import React from 'react';
import { Coffee, Cake, Croissant, Utensils, LayoutGrid } from 'lucide-react';
import clsx from 'clsx';
import { CATEGORIAS } from '../models/productsModel';

const ICONS = {
  todas: LayoutGrid,
  cafes: Coffee,
  pasteles: Cake,
  pan: Croissant,
  comida: Utensils
};

export const CategoryBar = ({ active, onSelect }) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 hide-scrollbar">
      {CATEGORIAS.map(cat => {
        const Icon = ICONS[cat.id] || LayoutGrid;
        const isActive = active === cat.id;
        
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2 rounded-full border transition-all whitespace-nowrap text-sm font-bold active:scale-95",
              isActive 
                // Activo: Se mantiene igual (Brand Color)
                ? "bg-brand-dark text-white border-brand-dark shadow-md" 
                // Inactivo: Adaptado a Dark Mode
                : "bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-brand-primary hover:text-brand-primary dark:hover:text-white"
            )}
          >
            <Icon size={16} />
            <span>{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
};