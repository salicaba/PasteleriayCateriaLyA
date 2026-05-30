// src/modules/inventory/views/ItemDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, ArrowDownToLine, Trash2, AlertTriangle, ArrowRightLeft, MessageSquare, ChevronDown, PackageMinus, PackagePlus } from 'lucide-react';

export default function ItemDetailsModal({ item, isOpen, onClose, controller }) {
  const [activeTab, setActiveTab] = useState('history'); 
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedTx, setExpandedTx] = useState(null);
  
  const [type, setType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [unitCost, setUnitCost] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      loadHistory();
      setActiveTab('history');
      setQuantity('');
      setUnitCost(item.averageCost || '');
      setNotes('');
      setError('');
      setExpandedTx(null); 
      setShowDeleteConfirm(false);
    }
  }, [isOpen, item]);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const data = await controller.getItemHistory(item.id);
    setHistory(data);
    setLoadingHistory(false);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    const res = await controller.deleteItem(item.id);
    setIsDeleting(false);
    if (res.success) {
      setShowDeleteConfirm(false);
      onClose(); 
    } else {
      setError(res.error);
      setShowDeleteConfirm(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const res = await controller.registerTransaction({
      inventoryItemId: item.id,
      type,
      quantity: parseFloat(quantity),
      unitCost: type === 'IN' ? parseFloat(unitCost) : item.averageCost,
      notes: notes || null,
      reference: type === 'IN' ? notes : null
    });

    if (res.success) {
      await loadHistory();
      setActiveTab('history');
      setQuantity('');
      setNotes('');
    } else {
      setError(res.error);
    }
    setIsSubmitting(false);
  };

  if (!isOpen || !item) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="detalles-modal" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-2xl bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
        >
          {/* Cabecera */}
          <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-start relative bg-gray-50/50 dark:bg-gray-900/30">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text pr-20">{item.name}</h2>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mt-1">SKU: {item.sku || 'N/A'} | UNIDAD BASE: <span className="uppercase font-black text-gray-600 dark:text-gray-300">{item.unit}</span></p>
              
              <div className="flex gap-3 mt-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 px-3 py-1.5 rounded-xl text-sm font-bold">
                  Stock: {Number(item.currentStock).toFixed(2)}
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-3 py-1.5 rounded-xl text-sm font-bold">
                  Costo Prom: ${Number(item.averageCost).toFixed(2)}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 absolute top-6 right-6">
              <button 
                onClick={() => setShowDeleteConfirm(true)} 
                className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                title="Eliminar Insumo"
              >
                <Trash2 size={20} />
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Pestañas estilo Cápsula (Igual a Caja y Ajustes) */}
          <div className="p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
            <div className="flex bg-gray-100 dark:bg-gray-950 lya:bg-lya-bg p-1 rounded-xl border border-gray-200 dark:border-gray-800 lya:border-lya-border/30">
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-black flex justify-center items-center gap-2 transition-all ${
                  activeTab === 'history' 
                    ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface shadow text-orange-600 dark:text-orange-400 lya:text-lya-primary' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <History size={18} /> Kardex (Historial)
              </button>
              <button
                onClick={() => setActiveTab('transaction')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-black flex justify-center items-center gap-2 transition-all ${
                  activeTab === 'transaction' 
                    ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface shadow text-orange-600 dark:text-orange-400 lya:text-lya-primary' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <ArrowRightLeft size={18} /> Registrar Movimiento
              </button>
            </div>
          </div>

          {/* Cuerpo del Modal */}
          <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text">
            {activeTab === 'history' ? (
              <div className="space-y-3">
                {loadingHistory ? (
                  <p className="text-center py-10 opacity-60 text-sm font-medium">Cargando historial...</p>
                ) : history.length === 0 ? (
                  <p className="text-center py-10 opacity-60 text-sm font-medium">Aún no hay movimientos registrados.</p>
                ) : (
                  <div className="border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                        <tr>
                          <th className="p-3.5 w-10"></th> 
                          <th className="p-3.5">Fecha</th>
                          <th className="p-3.5">Tipo</th>
                          <th className="p-3.5 text-right">Cant.</th>
                          <th className="p-3.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {history.map((tx) => {
                          const hasDetails = tx.notes || tx.reference;
                          const isExpanded = expandedTx === tx.id;

                          // 🔥 Lógica de Colores y Signos
                          const isOutflow = ['OUT', 'WASTE', 'CONSUMPTION'].includes(tx.type);
                          const sign = isOutflow ? '-' : '+';
                          const colorClass = isOutflow 
                            ? 'text-red-600 dark:text-red-400 lya:text-red-500' 
                            : 'text-emerald-600 dark:text-emerald-400 lya:text-emerald-500';

                          // Configuración visual por tipo de transacción
                          const getTypeConfig = (type) => {
                            switch(type) {
                              case 'IN': return { label: 'COMPRA', icon: <ArrowDownToLine size={12}/> };
                              case 'WASTE': return { label: 'MERMA', icon: <Trash2 size={12}/> };
                              case 'CONSUMPTION': return { label: 'CONSUMO', icon: <PackageMinus size={12}/> };
                              case 'ADJUSTMENT': return { label: 'AJUSTE', icon: <PackagePlus size={12}/> };
                              case 'OUT': return { label: 'SALIDA', icon: <ArrowRightLeft size={12}/> };
                              default: return { label: type, icon: <ArrowRightLeft size={12}/> };
                            }
                          };
                          
                          const typeConfig = getTypeConfig(tx.type);

                          return (
                            <React.Fragment key={tx.id}>
                              <tr 
                                onClick={() => hasDetails && setExpandedTx(isExpanded ? null : tx.id)}
                                className={`transition-colors ${hasDetails ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/20 lya:hover:bg-lya-bg/20' : ''}`}
                              >
                                <td className="p-3.5 text-center text-gray-400">
                                  {hasDetails && (
                                    <MessageSquare size={16} className={`inline transition-transform ${isExpanded ? 'text-orange-500 lya:text-lya-primary' : ''}`} />
                                  )}
                                </td>
                                <td className="p-3.5 text-xs font-medium opacity-80">
                                  {new Date(tx.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </td>
                                
                                <td className="p-3.5">
                                  <span className={`${colorClass} font-bold text-xs flex items-center gap-1`}>
                                    {typeConfig.icon} {typeConfig.label}
                                  </span>
                                </td>
                                
                                <td className={`p-3.5 text-right font-mono font-bold ${colorClass}`}>
                                  {sign}{Number(tx.quantity).toFixed(2)}
                                </td>
                                
                                <td className={`p-3.5 text-right font-black flex items-center justify-end gap-2 ${colorClass}`}>
                                  {sign}${Number(tx.totalCost).toFixed(2)}
                                  {hasDetails && <ChevronDown size={14} className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                                </td>
                              </tr>
                              
                              {hasDetails && (
                                <tr key={`expand-${tx.id}`}>
                                  <td colSpan="5" className="p-0 border-none">
                                    <AnimatePresence>
                                      {isExpanded && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden bg-gray-50/50 dark:bg-gray-950/30"
                                        >
                                          <div className={`m-3 p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-xl shadow-sm border-l-4 text-sm space-y-1 ${isOutflow ? 'border-red-500' : 'border-emerald-500'}`}>
                                            {tx.reference && <div><span className="font-bold opacity-70">Referencia:</span> {tx.reference}</div>}
                                            {tx.notes && <div><span className="font-bold opacity-70">Nota / Justificación:</span> {tx.notes}</div>}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto py-2">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-500/10 text-red-600 border border-red-100 rounded-xl text-sm flex items-center gap-2 font-bold">
                    <AlertTriangle size={16} /> {error}
                  </div>
                )}

                <div className="flex bg-gray-100 dark:bg-gray-950 lya:bg-lya-bg p-1 rounded-xl border border-gray-200 dark:border-gray-800 lya:border-lya-border/30">
                  <button type="button" onClick={() => setType('IN')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${type === 'IN' ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface shadow text-emerald-600 dark:text-emerald-400' : 'text-gray-400'}`}>
                    Entrada (Compra)
                  </button>
                  <button type="button" onClick={() => setType('WASTE')} className={`flex-1 py-2 rounded-lg text-sm font-black transition-all ${type === 'WASTE' ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface shadow text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                    Salida (Merma)
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-1.5 tracking-wider">Cantidad ({item.unit})</label>
                  <input required type="number" step="0.01" min="0.01" placeholder="Ej. 10.00"
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary font-medium text-sm transition-all"
                    value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-1.5 tracking-wider flex items-center justify-between">
                    <span>Costo Unitario ($)</span>
                    {type === 'WASTE' && <span className="text-[10px] text-red-500 font-bold lowercase italic">(fijo por costo promedio)</span>}
                  </label>
                  <input required type="number" step="0.01" min="0" placeholder="Ej. 24.50"
                    disabled={type === 'WASTE'}
                    className={`w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 font-bold text-sm outline-none transition-all ${type === 'WASTE' ? 'bg-gray-100 dark:bg-gray-900/50 opacity-60 text-gray-400 border-dashed' : 'bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary dark:text-white lya:text-lya-text'}`}
                    value={type === 'WASTE' ? Number(item.averageCost).toFixed(2) : unitCost} 
                    onChange={(e) => setUnitCost(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 mb-1.5 tracking-wider">Notas / Referencia (Opcional)</label>
                  <textarea placeholder={type === 'IN' ? "Ej. Factura A-124 de Walmart" : "Ej. Producto caducado en vitrina"}
                    className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary font-medium text-sm transition-all resize-none"
                    rows="2" value={notes} onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>

                <button disabled={isSubmitting} type="submit" className={`w-full py-3.5 rounded-xl font-bold text-white transition-all transform hover:-translate-y-0.5 shadow-lg ${type === 'IN' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}>
                  {isSubmitting ? 'Procesando...' : `Registrar ${type === 'IN' ? 'Compra' : 'Merma'}`}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Confirmación de Eliminación 100% Consistente con el Sistema */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center flex flex-col items-center"
            >
              <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full mb-4 text-red-500">
                <AlertTriangle size={36} />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text mb-2">¿Eliminar Insumo?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed px-2">
                Esta acción ocultará el insumo del catálogo principal. Su historial financiero y kardex se mantendrán protegidos por seguridad.
              </p>
              <div className="flex w-full gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)} 
                  disabled={isDeleting}
                  className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-border/20 lya:hover:bg-lya-border/40 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete} 
                  disabled={isDeleting}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/30 transition-all transform hover:-translate-y-0.5 flex justify-center items-center"
                >
                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}