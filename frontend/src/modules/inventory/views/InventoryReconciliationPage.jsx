// src/modules/inventory/views/InventoryReconciliationPage.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInventoryController } from '../controllers/useInventoryController';
import { ClipboardCheck, Search, AlertCircle, CheckCircle2, Calculator, Loader2 } from 'lucide-react';

// --- PANTALLA DE CARGA EXCLUSIVA PARA EL ARQUEO ---
const ReconciliationLoader = () => (
  <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg relative z-10 transition-colors duration-300">
    <motion.div
      animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
    >
      <ClipboardCheck size={40} className="text-blue-500 dark:text-blue-400 lya:text-lya-secondary" />
    </motion.div>
    <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
      Cargando Arqueo
    </h2>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
      <Loader2 size={16} className="animate-spin text-blue-500 dark:text-blue-400 lya:text-lya-secondary" /> Preparando hojas de conteo...
    </p>
  </div>
);

export const InventoryReconciliationPage = () => {
  const { inventory, isLoading, loading, fetchInventory, processReconciliation } = useInventoryController();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [counts, setCounts] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  const [toastContent, setToastContent] = useState(null);
  const [toastType, setToastType] = useState('success');

  useEffect(() => {
    fetchInventory();
  }, []);

  const showToast = (content, type = 'success') => {
    setToastContent(content);
    setToastType(type);
    setTimeout(() => setToastContent(null), 4000);
  };

  const handleCountChange = (id, value) => {
    setCounts(prev => ({
      ...prev,
      [id]: value === '' ? '' : Number(value)
    }));
  };

  const isPageLoading = isLoading || loading;
  if (isPageLoading) return <ReconciliationLoader />;

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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

  const totalSurplus = reconciliationItems.reduce((acc, item) => {
    return item.difference > 0 ? acc + Math.abs(item.differenceCost) : acc;
  }, 0);

  const itemsToProcess = reconciliationItems
    .filter(item => item.hasCount)
    .map(item => ({
      inventoryItemId: item.id,
      physicalStock: item.physicalCount
    }));

  const hasDifferences = reconciliationItems.some(item => item.hasCount && Math.abs(item.difference) > 0.001);

  const handleProcessClick = () => {
    if (itemsToProcess.length === 0) return;

    if (!hasDifferences) {
      showToast('¡Todo cuadra perfectamente! El stock coincide, no hay ajustes.', 'success');
      setCounts({}); 
      return;
    }

    setIsModalOpen(true);
  };

  const handleConfirmReconciliation = async () => {
    if (itemsToProcess.length === 0) return;
    try {
      setIsProcessing(true);
      await processReconciliation(itemsToProcess, notes);
      setIsModalOpen(false);
      setCounts({});
      setNotes('');
      
      showToast(
        <div className="flex flex-col text-left w-full gap-0.5 py-0.5">
          <span className="text-[15px] font-black">¡Arqueo procesado!</span>
          <div className="text-[13px] font-medium opacity-90 mt-1 space-y-1.5">
            <p className="leading-tight">El inventario se ha actualizado correctamente.</p>
            
            {totalCOGS > 0 && (
              <div className="flex justify-between items-center border-t border-black/10 dark:border-white/10 pt-1.5 mt-1">
                <span>Merma / Consumo:</span>
                <span className="text-red-500 dark:text-red-400 font-bold ml-4">-${totalCOGS.toFixed(2)}</span>
              </div>
            )}
            
            {totalSurplus > 0 && (
              <div className="flex justify-between items-center border-t border-black/10 dark:border-white/10 pt-1.5 mt-1">
                <span>Ajuste Positivo:</span>
                <span className="text-emerald-500 dark:text-emerald-400 font-bold ml-4">+${totalSurplus.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>,
        'success'
      );

    } catch (error) {
      console.error(error);
      showToast('Ocurrió un error al procesar el arqueo', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-500 dark:bg-blue-600 lya:bg-lya-secondary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-blue-500/20 dark:shadow-blue-900/30 lya:shadow-lya-secondary/20">
            <ClipboardCheck size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">Arqueo de Inventario</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Registra tu conteo físico y el sistema calculará el consumo automáticamente.</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 lya:text-lya-text/40 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar insumo..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-500/40 lya:focus:ring-lya-secondary/30 transition-all text-gray-800 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40" 
            />
          </div>

          <button 
            onClick={handleProcessClick}
            disabled={itemsToProcess.length === 0}
            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center space-x-2 ${
              itemsToProcess.length > 0 
                ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white shadow-blue-500/30 dark:shadow-blue-900/30 lya:shadow-lya-secondary/30 transform hover:-translate-y-0.5' 
                : 'bg-gray-300 dark:bg-gray-800 text-gray-500 dark:text-gray-600 lya:bg-lya-border/40 lya:text-lya-text/40 cursor-not-allowed shadow-none'
            }`}
          >
            <Calculator size={20} />
            <span>Procesar Arqueo ({itemsToProcess.length})</span>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto hide-scrollbar bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 mb-4 pb-20 transition-colors">
        <div className="overflow-x-auto hide-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-950/50 lya:bg-lya-bg/50 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/20 text-gray-500 dark:text-gray-400 lya:text-lya-text/70 text-xs uppercase tracking-wider font-bold transition-colors">
                <th className="p-5">Insumo</th>
                <th className="p-5 text-center">Stock Lógico</th>
                <th className="p-5 text-center">Conteo Físico</th>
                <th className="p-5 text-right">Diferencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10">
              {reconciliationItems.length === 0 ? (
                <tr><td colSpan="4" className="text-center p-10 text-gray-400 dark:text-gray-500 lya:text-lya-text/60 font-medium transition-colors">No se encontraron insumos.</td></tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {reconciliationItems.map((item, index) => (
                    <motion.tr 
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.02, 0.2) }}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/40 lya:hover:bg-lya-bg/40 transition-colors"
                    >
                      <td className="p-5">
                        <p className="font-bold text-gray-800 dark:text-gray-100 lya:text-lya-text transition-colors">{item.name}</p>
                        <span className="text-xs text-gray-400 dark:text-gray-500 lya:text-lya-text/40 font-mono transition-colors">SKU: {item.sku || 'N/A'}</span>
                      </td>
                      
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-black text-lg text-gray-900 dark:text-white lya:text-lya-text transition-colors">
                            {parseFloat(item.currentStock).toFixed(2)}
                          </span>
                          <span className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/20 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                            {item.unit}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={counts[item.id] !== undefined ? counts[item.id] : ''}
                            onChange={(e) => handleCountChange(item.id, e.target.value)}
                            className="w-24 text-center p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-500/50 lya:focus:ring-lya-secondary/40 font-bold transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-border/20 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                            {item.unit}
                          </span>
                        </div>
                      </td>

                      <td className="p-5 text-right font-medium">
                        {!item.hasCount ? (
                          <span className="text-gray-400 dark:text-gray-600 lya:text-lya-text/40 font-bold transition-colors">-</span>
                        ) : item.difference < 0 ? (
                          <span className="text-red-500 dark:text-red-400 lya:text-red-500 flex items-center justify-end gap-1 font-bold transition-colors">
                            <AlertCircle size={16} /> {item.difference.toFixed(2)}
                          </span>
                        ) : item.difference > 0 ? (
                          <span className="text-emerald-500 dark:text-emerald-400 lya:text-lya-secondary flex items-center justify-end gap-1 font-bold transition-colors">
                            <CheckCircle2 size={16} /> +{item.difference.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 lya:text-lya-text/60 font-bold transition-colors">Exacto</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 lya:bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2rem] shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800 lya:border-lya-border/30"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="p-4 rounded-full mb-4 bg-blue-50 dark:bg-blue-900/30 lya:bg-lya-secondary/10 transition-colors">
                  <Calculator size={28} className="text-blue-500 dark:text-blue-400 lya:text-lya-secondary" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-gray-800 dark:text-white lya:text-lya-text transition-colors">Confirmar Arqueo</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 transition-colors">Vas a actualizar el sistema con tu conteo físico. Revisa el impacto financiero:</p>
              </div>

              <div className="flex flex-col gap-3 mb-6">
                {totalCOGS > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/10 lya:bg-red-900/20 border border-red-100 dark:border-red-900/30 lya:border-red-900/50 rounded-2xl p-4 text-center transition-colors">
                    <span className="text-red-600 dark:text-red-400 lya:text-red-400 text-[10px] font-black uppercase tracking-widest transition-colors">Costo de Ventas / Consumo</span>
                    <p className="text-3xl font-black text-red-600 dark:text-red-500 lya:text-red-400 mt-1 transition-colors">
                      -${totalCOGS.toFixed(2)}
                    </p>
                    <p className="text-xs text-red-500/80 dark:text-red-400/80 mt-1 font-medium transition-colors">Este valor se descontará de las ganancias (insumos consumidos o mermas).</p>
                  </div>
                )}

                {totalSurplus > 0 && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/10 lya:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 lya:border-emerald-900/50 rounded-2xl p-4 text-center transition-colors">
                    <span className="text-emerald-600 dark:text-emerald-400 lya:text-emerald-400 text-[10px] font-black uppercase tracking-widest transition-colors">Ajuste Positivo / Sobrante</span>
                    <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500 lya:text-emerald-400 mt-1 transition-colors">
                      +${totalSurplus.toFixed(2)}
                    </p>
                    <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium transition-colors">Este valor se sumará al inventario (producto encontrado a favor).</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-gray-300 mb-2 uppercase tracking-wider transition-colors">Notas del Arqueo (Opcional)</label>
                <textarea 
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Conteo cierre de turno, faltó leche..."
                  className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border bg-gray-50 dark:bg-gray-800 lya:bg-lya-ui text-gray-800 dark:text-gray-200 lya:text-lya-text placeholder-gray-400 dark:placeholder-gray-500 lya:placeholder-lya-text/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:focus:ring-blue-500/40 lya:focus:ring-lya-secondary/30 text-sm resize-none transition-all"
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isProcessing}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:bg-lya-bg/80 text-gray-700 dark:text-gray-300 lya:text-lya-text/80 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleConfirmReconciliation}
                  disabled={isProcessing}
                  className={`flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white shadow-lg shadow-blue-500/30 dark:shadow-blue-900/30 lya:shadow-lya-secondary/30 flex items-center justify-center gap-2 transform transition-all ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-0.5'}`}
                >
                  {isProcessing ? <><Loader2 size={18} className="animate-spin" /> Procesando...</> : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NOTIFICACIÓN FLOTANTE PERSONALIZADA (TOAST CENTRADO ARRIBA) */}
      <AnimatePresence>
        {toastContent && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-[2rem] shadow-2xl flex items-start gap-4 font-bold border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 pointer-events-auto max-w-sm sm:max-w-md w-full"
            >
              <div className={`p-1.5 rounded-full shrink-0 mt-0.5 ${toastType === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary' : 'bg-red-100 dark:bg-red-500/20 text-red-500'}`}>
                {toastType === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
              </div>
              <div className="flex flex-col flex-1">
                {typeof toastContent === 'string' ? <span className="text-sm mt-1">{toastContent}</span> : toastContent}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};