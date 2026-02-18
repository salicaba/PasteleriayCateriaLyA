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
                ? "bg-brand-dark text-white border-brand-dark shadow-md" 
                : "bg-white text-gray-500 border-gray-200 hover:border-brand-primary hover:text-brand-primary"
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