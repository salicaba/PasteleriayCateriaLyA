import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventoryController } from '../controllers/useInventoryController';
import { ClipboardCheck, Search, AlertCircle, CheckCircle2, Calculator } from 'lucide-react';

export const InventoryReconciliationPage = () => {
  const { inventory, loading, fetchInventory, processReconciliation } = useInventoryController();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [counts, setCounts] = useState({}); // { itemId: physicalStock }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleCountChange = (id, value) => {
    setCounts(prev => ({
      ...prev,
      [id]: value === '' ? '' : Number(value)
    }));
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Cálculos en tiempo real
  const reconciliationItems = filteredInventory.map(item => {
    const physicalCount = counts[item.id];
    const hasCount = physicalCount !== undefined && physicalCount !== '';
    const difference = hasCount ? physicalCount - parseFloat(item.currentStock) : 0;
    const differenceCost = difference * parseFloat(item.averageCost);
    return { ...item, physicalCount, hasCount, difference, differenceCost };
  });

  const totalCOGS = reconciliationItems.reduce((acc, item) => {
    return item.difference < 0 ? acc + Math.abs(item.differenceCost) : acc;
  }, 0);

  const itemsToProcess = reconciliationItems
    .filter(item => item.hasCount)
    .map(item => ({
      inventoryItemId: item.id,
      physicalStock: item.physicalCount
    }));

  const handleConfirmReconciliation = async () => {
    if (itemsToProcess.length === 0) return;
    try {
      setIsProcessing(true);
      await processReconciliation(itemsToProcess, notes);
      setIsModalOpen(false);
      setCounts({}); // Limpiar conteos
      setNotes('');
      // Podrías lanzar un toast de éxito aquí
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold lya:text-lya-text flex items-center gap-2">
            <ClipboardCheck className="w-8 h-8 text-blue-500" />
            Arqueo de Inventario
          </h1>
          <p className="text-gray-500 text-sm mt-1">Registra tu conteo físico y el sistema calculará el consumo automáticamente.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          disabled={itemsToProcess.length === 0}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
            itemsToProcess.length > 0 
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed lya:bg-lya-border lya:text-gray-400'
          }`}
        >
          <Calculator className="w-5 h-5" />
          Procesar Arqueo ({itemsToProcess.length})
        </button>
      </div>

      <div className="mb-4 relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar insumo por nombre o SKU..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl lya:bg-lya-surface border lya:border-lya-border lya:text-lya-text focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
        />
      </div>

      <div className="flex-1 overflow-auto rounded-xl border lya:border-lya-border bg-white lya:bg-lya-surface shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 lya:bg-lya-ui bg-gray-50 shadow-sm z-10">
            <tr>
              <th className="p-4 font-semibold lya:text-lya-text border-b lya:border-lya-border">Insumo</th>
              <th className="p-4 font-semibold lya:text-lya-text border-b lya:border-lya-border text-center">Stock Lógico</th>
              <th className="p-4 font-semibold lya:text-lya-text border-b lya:border-lya-border text-center">Conteo Físico</th>
              <th className="p-4 font-semibold lya:text-lya-text border-b lya:border-lya-border text-right">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="text-center p-8 lya:text-lya-text">Cargando inventario...</td></tr>
            ) : reconciliationItems.map((item) => (
              <tr key={item.id} className="border-b lya:border-lya-border hover:bg-gray-50 lya:hover:bg-lya-ui transition-colors">
                <td className="p-4">
                  <p className="font-medium lya:text-lya-text">{item.name}</p>
                  <span className="text-xs text-gray-400">SKU: {item.sku || 'N/A'}</span>
                </td>
                <td className="p-4 text-center font-medium text-gray-600 lya:text-gray-300">
                  {parseFloat(item.currentStock).toFixed(2)} {item.unit}
                </td>
                <td className="p-4 text-center">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={counts[item.id] !== undefined ? counts[item.id] : ''}
                    onChange={(e) => handleCountChange(item.id, e.target.value)}
                    className="w-24 text-center p-2 rounded-lg border lya:border-lya-border lya:bg-lya-surface lya:text-lya-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-500">{item.unit}</span>
                </td>
                <td className="p-4 text-right font-medium">
                  {!item.hasCount ? (
                    <span className="text-gray-400">-</span>
                  ) : item.difference < 0 ? (
                    <span className="text-red-500 flex items-center justify-end gap-1">
                      <AlertCircle className="w-4 h-4" /> {item.difference.toFixed(2)}
                    </span>
                  ) : item.difference > 0 ? (
                    <span className="text-green-500 flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-4 h-4" /> +{item.difference.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-500">Exacto</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL ESTILO CÁPSULA (Framer Motion) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white lya:bg-lya-surface p-8 rounded-3xl shadow-2xl max-w-md w-full"
            >
              <h2 className="text-2xl font-bold mb-2 lya:text-lya-text">Confirmar Arqueo</h2>
              <p className="text-gray-500 mb-6">Vas a actualizar el sistema con tu conteo físico. Revisa el impacto financiero:</p>

              <div className="bg-red-50 lya:bg-red-900/20 border border-red-100 lya:border-red-900/50 rounded-2xl p-4 mb-6">
                <span className="text-red-600 lya:text-red-400 text-sm font-semibold uppercase tracking-wider">Costo de Ventas / Consumo</span>
                <p className="text-3xl font-bold text-red-600 lya:text-red-400 mt-1">
                  ${totalCOGS.toFixed(2)}
                </p>
                <p className="text-xs text-red-500/80 mt-1">Este valor será descontado de las ganancias como insumo consumido.</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium lya:text-gray-300 mb-2">Notas del Arqueo (Opcional)</label>
                <textarea 
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Conteo cierre de turno, faltó leche..."
                  className="w-full p-3 rounded-xl border lya:border-lya-border lya:bg-lya-ui lya:text-lya-text focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-medium border border-gray-300 lya:border-lya-border lya:text-lya-text hover:bg-gray-50 lya:hover:bg-lya-ui transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmReconciliation}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-xl font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Procesando...' : 'Confirmar Ajuste'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};