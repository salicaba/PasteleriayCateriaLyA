import React from 'react';
import { Plus } from 'lucide-react';

export const ProductCard = ({ producto, onAdd, qty }) => {
  return (
    <div 
      onClick={() => onAdd(producto)}
      // CAMBIO: bg-white -> dark:bg-gray-800, border-gray-100 -> dark:border-gray-700
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer border border-gray-100 dark:border-gray-700 relative h-48 flex flex-col active:scale-95"
    >
      <div className="h-32 overflow-hidden relative">
        <img 
          src={producto.imagen} 
          alt={producto.nombre} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"/>
        
        {/* Precio */}
        <span className="absolute bottom-2 right-2 text-white font-bold text-lg drop-shadow-md">
          ${producto.precio}
        </span>

        {/* Badge de Cantidad */}
        {qty > 0 && (
          <div className="absolute top-2 right-2 bg-brand-primary text-white w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs shadow-lg border-2 border-white dark:border-gray-800 animate-bounce-in">
            {qty}
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex items-center justify-between">
        {/* CAMBIO: Texto oscuro/claro */}
        <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm leading-tight line-clamp-2">
          {producto.nombre}
        </h3>
        
        <div className={`
          p-1 rounded-full transition-all shadow-lg transform
          ${qty > 0 ? 'bg-brand-primary text-white opacity-100' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}
        `}>
          <Plus size={16} />
        </div>
      </div>
    </div>
  );
};