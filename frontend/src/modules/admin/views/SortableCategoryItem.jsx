// src/modules/admin/views/SortableCategoryItem.jsx
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Edit2, Trash2 } from 'lucide-react';

export const SortableCategoryItem = ({ id, category, isActive, onClick, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative flex items-center justify-between p-3 mb-2 rounded-xl border cursor-pointer transition-colors ${
        isActive 
          ? 'bg-orange-50 border-orange-200 dark:bg-orange-500/10 dark:border-orange-500/30' 
          : 'bg-white border-gray-100 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800'
      } ${isDragging ? 'opacity-50 shadow-2xl scale-105' : 'shadow-sm'}`}
      onClick={() => onClick(category)}
    >
      <div className="flex items-center space-x-3 overflow-hidden">
        <div {...attributes} {...listeners} className="text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 cursor-grab active:cursor-grabbing p-1 transition-colors">
          <GripVertical size={18} />
        </div>
        <span className={`font-semibold truncate ${isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-700 dark:text-gray-300'}`}>
          {category.name}
        </span>
      </div>

      <div className="flex space-x-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
        {/* CORRECCIÓN DARK MODE: Hovers adaptados a bg oscuro */}
        <button onClick={(e) => { e.stopPropagation(); onEdit(category); }} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors">
          <Edit2 size={16} />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(category.id); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
};