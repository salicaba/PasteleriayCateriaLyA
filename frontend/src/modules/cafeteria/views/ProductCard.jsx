import React from 'react';
import { Plus } from 'lucide-react';

// Recibimos 'qty' (cantidad actual en carrito)
export const ProductCard = ({ producto, onAdd, qty }) => {
  return (
    <div 
      onClick={() => onAdd(producto)}
      className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer border border-gray-100 relative h-48 flex flex-col active:scale-95"
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

        {/* --- NUEVO: BADGE DE CANTIDAD --- */}
        {qty > 0 && (
          <div className="absolute top-2 right-2 bg-brand-primary text-white w-7 h-7 flex items-center justify-center rounded-full font-bold text-xs shadow-lg border-2 border-white animate-bounce-in">
            {qty}
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex items-center justify-between">
        <h3 className="font-bold text-gray-700 text-sm leading-tight line-clamp-2">
          {producto.nombre}
        </h3>
        
        {/* Botón visual de + */}
        <div className={`
          p-1 rounded-full transition-all shadow-lg transform
          ${qty > 0 ? 'bg-brand-primary text-white opacity-100' : 'bg-gray-100 text-gray-400 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0'}
        `}>
          <Plus size={16} />
        </div>
      </div>
    </div>
  );
};