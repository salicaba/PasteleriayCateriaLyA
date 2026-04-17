import React from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export const ProductCard = ({ product, onClick }) => {
  // EL CAMBIO CLAVE: Solo está agotado SI controlamos el stock Y además es 0 o menos.
  // Si controlarStock es false (ilimitado), isAgotado siempre será false.
  const isAgotado = product.controlarStock === true && product.stock <= 0;

  return (
    <motion.div
      layout
      whileHover={!isAgotado ? { y: -5 } : {}}
      whileTap={!isAgotado ? { scale: 0.95 } : {}}
      onClick={() => {
        if (!isAgotado) {
          onClick(product);
        }
      }}
      className={`relative flex flex-col bg-white dark:bg-gray-900 rounded-3xl p-4 border transition-all overflow-hidden ${
        isAgotado 
          ? 'border-gray-200 dark:border-gray-800 opacity-70 grayscale-[60%] cursor-not-allowed' 
          : 'border-transparent shadow-sm hover:shadow-md cursor-pointer'
      }`}
    >
      {isAgotado && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-full px-2 pointer-events-none">
          <div className="bg-red-600/90 backdrop-blur-md text-white text-center py-2.5 rounded-xl font-black tracking-[0.2em] uppercase transform -rotate-12 shadow-2xl border border-red-500/50">
            Agotado
          </div>
        </div>
      )}

      <div className="h-32 w-full rounded-2xl bg-gray-50 dark:bg-gray-800 mb-4 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-gray-800">
        {product.image ? (
          <img src={product.image} alt={product.nombre} className="w-full h-full object-cover" />
        ) : (
          <span className="text-5xl">{product.imagen || '☕'}</span>
        )}
      </div>

      <div className="flex flex-col flex-1 relative z-0">
        <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg leading-tight mb-1">
          {product.nombre}
        </h3>
        
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className={`font-black text-lg ${isAgotado ? 'text-gray-500 dark:text-gray-400' : 'text-orange-500 dark:text-orange-400'}`}>
            ${product.precioBase?.toFixed(2)}
          </span>
          
          <button 
            disabled={isAgotado}
            className={`p-2 rounded-xl transition-all ${
              isAgotado 
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-400' 
                : 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
            }`}
          >
            <Plus size={20} strokeWidth={isAgotado ? 2 : 3} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};