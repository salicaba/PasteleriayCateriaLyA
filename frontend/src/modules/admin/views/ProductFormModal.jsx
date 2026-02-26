import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Plus, Trash2 } from 'lucide-react';

export const ProductFormModal = ({ isOpen, onClose, onSave, initialData, categories }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    categoria: categories[0] || '',
    precioBase: '',
    imagen: '☕',
    opciones: { tamanos: [], leches: [], extras: [] }
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        nombre: '',
        categoria: categories[0] || '',
        precioBase: '',
        imagen: '☕',
        opciones: { tamanos: ['Estándar'], leches: [], extras: [] }
      });
    }
  }, [initialData, categories]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'precioBase' ? Number(value) : value }));
  };

  const handleArrayChange = (category, value) => {
    const arrayValues = value.split(',').map(item => item.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      opciones: { ...prev.opciones, [category]: arrayValues }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
            {initialData ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-gray-700 rounded-full shadow-sm transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <form id="product-form" onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Nombre del Producto</label>
                <input required type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="Ej. Frappé Moka" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Precio Base ($)</label>
                <input required type="number" name="precioBase" value={formData.precioBase} onChange={handleChange} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="0.00" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Categoría</label>
                <select name="categoria" value={formData.categoria} onChange={handleChange} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all">
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Icono / Emoji</label>
                <input type="text" name="imagen" value={formData.imagen} onChange={handleChange} className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all" placeholder="Ej. ☕, 🥤, 🍰" />
              </div>
            </div>

            {/* Variantes - Separadas por comas para facilidad rápida */}
            <div className="p-5 bg-orange-50/50 dark:bg-orange-500/5 rounded-2xl border border-orange-100 dark:border-orange-500/10 space-y-4">
              <h3 className="font-bold text-orange-600 dark:text-orange-400">Variantes y Opciones (Separa con comas)</h3>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Tamaños Disponibles</label>
                <input type="text" value={formData.opciones.tamanos.join(', ')} onChange={(e) => handleArrayChange('tamanos', e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200" placeholder="Ej. Chico, Mediano, Grande" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Tipos de Leche (Deja vacío si no aplica)</label>
                <input type="text" value={formData.opciones.leches.join(', ')} onChange={(e) => handleArrayChange('leches', e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200" placeholder="Ej. Entera, Deslactosada, Almendra" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Extras Sugeridos</label>
                <input type="text" value={formData.opciones.extras.join(', ')} onChange={(e) => handleArrayChange('extras', e.target.value)} className="w-full p-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200" placeholder="Ej. Extra Shot, Jarabe Vainilla" />
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            Cancelar
          </button>
          <button type="submit" form="product-form" className="px-6 py-3 rounded-xl font-bold text-white bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/30 transition-all flex items-center space-x-2">
            <Save size={20} />
            <span>Guardar Producto</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};