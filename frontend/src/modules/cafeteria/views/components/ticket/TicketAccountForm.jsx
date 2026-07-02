// src/modules/cafeteria/views/components/ticket/TicketAccountForm.jsx
import React from 'react';
import { UserPlus, Phone } from 'lucide-react';

export const TicketAccountForm = ({
  newCuentaName,
  setNewCuentaName,
  newCuentaPhone,
  setNewCuentaPhone,
  handleAddCuenta,
  isCompletamentePagada
}) => {
  return (
    <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-3 sm:p-4 shadow-sm z-20 shrink-0 sticky top-0 transition-colors">
      <form onSubmit={handleAddCuenta} className="flex gap-2">
        <div className="relative flex-1">
          <input 
            type="text" 
            value={newCuentaName} 
            onChange={(e) => setNewCuentaName(e.target.value)} 
            disabled={isCompletamentePagada} 
            placeholder="Nombre" 
            className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-xs rounded-xl py-2 pl-9 pr-2 outline-none focus:ring-4 focus:ring-orange-500/10 lya:focus:ring-lya-primary/20 border-2 border-transparent focus:border-orange-500 lya:focus:border-lya-primary transition-all disabled:opacity-50" 
          />
          <UserPlus size={16} className="absolute left-2.5 top-2.5 text-gray-400 lya:text-lya-text/40" />
        </div>
        
        <div className="relative w-28 md:w-32">
          <input 
            type="tel" 
            value={newCuentaPhone} 
            onChange={(e) => setNewCuentaPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} 
            disabled={isCompletamentePagada} 
            placeholder="Celular (Opc.)" 
            className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-white lya:text-lya-text text-xs rounded-xl py-2 pl-8 pr-2 outline-none focus:ring-4 focus:ring-orange-500/10 lya:focus:ring-lya-primary/20 border-2 border-transparent focus:border-orange-500 lya:focus:border-lya-primary transition-all disabled:opacity-50" 
          />
          <Phone size={14} className="absolute left-2.5 top-2.5 text-gray-400 lya:text-lya-text/40" />
        </div>

        <button 
            type="submit" 
            disabled={!newCuentaName.trim() || isCompletamentePagada} 
            className="bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white px-3 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center justify-center shrink-0 disabled:opacity-50 border border-transparent dark:border-gray-700 shadow-sm"
        >
          Añadir
        </button>
      </form>
    </div>
  );
};