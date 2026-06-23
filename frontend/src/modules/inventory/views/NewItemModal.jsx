// src/modules/inventory/views/NewItemModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Package, Barcode, Scale, AlertTriangle } from 'lucide-react';

export default function NewItemModal({ isOpen, onClose, onCreate }) {
  const [formData, setFormData] = useState({ name: '', sku: '', unit: 'pza', minimumStock: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const res = await onCreate({
      ...formData,
      minimumStock: parseFloat(formData.minimumStock) || 0
    });

    if (res.success) {
      onClose();
    } else {
      setError(res.error);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 lya:bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col max-h-[85vh]"
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text flex items-center gap-2">
            <Package size={24} className="text-orange-500 lya:text-lya-primary" />
            Nuevo Insumo
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 lya:text-lya-text/50 lya:hover:text-lya-text bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/40 p-2 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-100 dark:border-red-900/30 rounded-xl text-sm flex items-center gap-2 font-semibold">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-1.5 tracking-wider">Nombre del Insumo</label>
            <input
              required
              type="text"
              placeholder="Ej. Leche Lala Deslactosada"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary font-medium transition-all text-sm"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-1.5 tracking-wider flex items-center gap-1"><Barcode size={14}/> SKU (Opcional)</label>
              <input
                type="text"
                placeholder="Código"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary font-medium transition-all text-sm"
                value={formData.sku}
                onChange={(e) => setFormData({...formData, sku: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-1.5 tracking-wider flex items-center gap-1"><Scale size={14}/> Unidad base</label>
              <select
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary font-bold transition-all text-sm"
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
              >
                <option value="pza">Piezas (pza)</option>
                <option value="kg">Kilogramos (kg)</option>
                <option value="g">Gramos (g)</option>
                <option value="l">Litros (l)</option>
                <option value="ml">Mililitros (ml)</option>
                <option value="caja">Caja</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-1.5 tracking-wider flex items-center gap-1"><AlertTriangle size={14}/> Stock Mínimo (Alerta)</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej. 5.00"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary font-medium transition-all text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={formData.minimumStock}
              onChange={(e) => setFormData({...formData, minimumStock: e.target.value})}
            />
          </div>

          <div className="pt-4 flex gap-3 mt-auto">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-border/20 lya:hover:bg-lya-border/40 rounded-xl font-bold transition-colors"
            >
              Cancelar
            </button>
            <button 
              disabled={loading} 
              type="submit" 
              className="flex-1 py-3.5 bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl font-bold shadow-lg shadow-orange-500/30 lya:shadow-lya-primary/30 transform hover:-translate-y-0.5 transition-all flex justify-center items-center gap-2"
            >
              {loading ? 'Guardando...' : 'Guardar Insumo'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}