import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, Loader2 } from 'lucide-react';

export const SortableOptionItem = ({ id, option, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  // Trinidad UX: Prevención de doble clic
  const [isDeleting, setIsDeleting] = useState(false);

  // Mantenemos Translate para rendimiento en grillas dnd-kit
  const style = {
    transform: CSS.Translate.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.2, 0, 0, 1)',
    zIndex: isDragging ? 50 : 'auto',
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await Promise.resolve(onRemove(option.id));
    } catch (error) {
      console.error("Error al eliminar opción:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex justify-between items-center p-3.5 rounded-[1.5rem] border transition-all duration-300 select-none overflow-hidden bg-white dark:bg-[#121212] lya:bg-lya-surface
        ${isDragging 
          ? 'border-lya-400/50 opacity-90 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.5)] z-50' 
          : 'border-gray-100 dark:border-gray-800/80 lya:border-lya-border/40 shadow-sm hover:border-blue-200 dark:hover:border-blue-900/50 lya:hover:border-lya-secondary/50'
        }
      `}
    >
      <div className="flex items-center space-x-3 overflow-hidden flex-1">
        <div 
          {...attributes} 
          {...listeners} 
          className="text-gray-300 hover:text-lya-500 cursor-grab active:cursor-grabbing p-1.5 transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none"
        >
          <GripVertical size={18} strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-semibold text-gray-700 dark:text-gray-200 lya:text-lya-text truncate pr-2">
          {option.nombre} 
          {Number(option.precioAdicional) > 0 && (
            <span className="text-emerald-500 text-xs ml-1.5 font-bold">
              (+${Number(option.precioAdicional).toFixed(2)})
            </span>
          )}
        </span>
      </div>
      <button 
        onClick={handleDelete}
        disabled={isDeleting}
        className="flex items-center justify-center p-2 text-gray-300 dark:text-gray-600 lya:text-lya-text/40 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed md:opacity-0 group-hover:opacity-100"
      >
        {isDeleting ? <Loader2 size={16} className="animate-spin text-red-500" /> : <Trash2 size={16} strokeWidth={2.5} />}
      </button>
    </div>
  );
};