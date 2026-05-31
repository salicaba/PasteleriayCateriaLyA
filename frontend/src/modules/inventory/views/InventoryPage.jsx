// src/modules/inventory/views/InventoryPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackagePlus, Search, AlertCircle, Boxes } from 'lucide-react';
import { useInventoryController } from '../controllers/useInventoryController';
import NewItemModal from './NewItemModal';
import ItemDetailsModal from './ItemDetailsModal';

export default function InventoryPage() {
  const controller = useInventoryController();
  const { inventory, isLoading, createItem } = controller;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors duration-300">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 dark:shadow-orange-900/30 lya:shadow-lya-primary/20">
            <Boxes size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">Catálogo de Inventario</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Gestiona tus insumos, costos de adquisición y existencias base</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 lya:text-lya-text/40 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre o SKU..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500/20 dark:focus:ring-orange-500/40 lya:focus:ring-lya-primary/30 transition-all text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40" 
            />
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-500/30 dark:shadow-orange-900/30 lya:shadow-lya-primary/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
          >
            <PackagePlus size={20} /> <span>Añadir Insumo</span>
          </button>
        </div>
      </header>

      {/* 🔥 AQUÍ APLICAMOS LA NUEVA CLASE 'hide-scrollbar' */}
      <div className="flex-1 overflow-y-auto hide-scrollbar bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 mb-4 pb-20 transition-colors duration-300">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-950/50 lya:bg-lya-bg/50 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-xs uppercase tracking-wider font-bold transition-colors">
                <th className="p-5">SKU / Nombre</th>
                <th className="p-5">Unidad</th>
                <th className="p-5">Stock Actual</th>
                <th className="p-5">Costo Promedio</th>
                <th className="p-5">Costo Total</th>
                <th className="p-5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10">
              {isLoading ? (
                <tr><td colSpan="6" className="text-center p-10 text-gray-400 dark:text-gray-500 lya:text-lya-text/60 font-medium transition-colors">Cargando inventario...</td></tr>
              ) : filteredInventory.length === 0 ? (
                <tr><td colSpan="6" className="text-center p-10 text-gray-400 dark:text-gray-500 lya:text-lya-text/60 font-medium transition-colors">No se encontraron insumos.</td></tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredInventory.map((item, index) => {
                    const isLowStock = parseFloat(item.currentStock) <= parseFloat(item.minimumStock);
                    return (
                      <motion.tr 
                        key={item.id}
                        layout 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.02, 0.2) }}
                        onClick={() => setSelectedItem(item)}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800/40 lya:hover:bg-lya-bg/40 transition-colors cursor-pointer"
                      >
                        <td className="p-5">
                          <div className="font-bold text-base text-gray-800 dark:text-gray-100 lya:text-lya-text transition-colors">{item.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 lya:text-lya-text/40 font-mono mt-1 transition-colors">{item.sku || 'Sin SKU'}</div>
                        </td>
                        <td className="p-5">
                          <span className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/20 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                            {item.unit}
                          </span>
                        </td>
                        <td className="p-5 font-black text-lg text-gray-900 dark:text-white lya:text-lya-text transition-colors">
                          {Number(item.currentStock).toFixed(2)}
                        </td>
                        <td className="p-5">
                          <span className="text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary font-bold transition-colors">
                            ${Number(item.averageCost).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-5">
                          <span className="font-black text-gray-800 dark:text-gray-200 lya:text-lya-text transition-colors">
                            ${(Number(item.currentStock) * Number(item.averageCost)).toFixed(2)}
                          </span>
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex justify-center">
                            {isLowStock ? (
                              <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 lya:text-red-500 lya:bg-red-500/10 lya:border-red-500/20 transition-colors">
                                <AlertCircle size={14} /> Bajo Stock
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30 lya:text-lya-secondary lya:bg-lya-secondary/10 lya:border-lya-secondary/20 transition-colors">
                                Óptimo
                              </div>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <NewItemModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onCreate={createItem} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailsModal 
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            controller={controller}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}