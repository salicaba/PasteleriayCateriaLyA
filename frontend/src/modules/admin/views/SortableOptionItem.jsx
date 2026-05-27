// src/modules/admin/views/SortableOptionItem.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical } from 'lucide-react';

export const SortableOptionItem = ({ id, option, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    // Usamos Translate en lugar de Transform para mayor rendimiento en grillas
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      // 🔥 FIX: Cambiamos 'transition-all' por 'transition-colors' y 'transition-shadow' 
      // para evitar que el navegador ralentice el arrastre (transform)
      className={`flex justify-between items-center bg-white dark:bg-gray-800 lya:bg-lya-surface p-3 rounded-xl border transition-colors transition-shadow ${
        isDragging 
          ? 'border-orange-500 opacity-80 shadow-2xl scale-105 z-50' 
          : 'border-gray-100 dark:border-gray-700 lya:border-lya-border/40 shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 lya:hover:border-lya-secondary/50'
      } group`}
    >
      <div className="flex items-center space-x-2 overflow-hidden flex-1">
        {/* El botón de arrastre */}
        <div 
          {...attributes} 
          {...listeners} 
          className="text-gray-400 hover:text-orange-500 cursor-grab active:cursor-grabbing p-1 transition-colors"
        >
          <GripVertical size={18} />
        </div>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text truncate pr-2">
          {option.nombre} {Number(option.precioAdicional) > 0 ? <span className="text-emerald-500 text-xs ml-1">(+${Number(option.precioAdicional).toFixed(2)})</span> : ''}
        </span>
      </div>
      <button 
        onClick={() => onRemove(option.id)} 
        className="text-gray-300 dark:text-gray-600 lya:text-lya-text/40 hover:text-red-500 dark:hover:text-red-400 md:opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
      >
        <Trash2 size={16}/>
      </button>
    </div>
  );
};