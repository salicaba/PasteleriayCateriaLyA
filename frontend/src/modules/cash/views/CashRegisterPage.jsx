import React, { useState } from 'react';
import { useCashController } from '../controllers/useCashController';
import { Calculator, XCircle, Coffee, Cake, Calendar as CalendarIcon, RefreshCw, UserCheck, RotateCcw, Filter, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CashRegisterPage = ({ user }) => {
  const { 
    transactions, loading, selectedDate, setSelectedDate, resumen, 
    handleCancelTransaction, handleRestoreTransaction,
    confirmModal, closeConfirmModal, executeConfirmAction 
  } = useCashController(user);

  const [filterSource, setFilterSource] = useState('ALL');

  const setToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filterSource === 'ALL') return true;
    return tx.source === filterSource;
  });

  // --- VARIANTES DE ANIMACIÓN PARA LAS TARJETAS (Efecto Cascada) ---
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col p-6 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg relative"
    >
      
      {/* Encabezado y Fecha */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text flex items-center gap-2">
            <Calculator className="text-orange-500 lya:text-lya-secondary" />
            Caja
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70">Control de ingresos y anulaciones del negocio.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={setToday}
            className="px-4 py-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold rounded-xl hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-colors shadow-sm active:scale-95 outline-none lya:bg-lya-primary/20 lya:text-lya-primary lya:hover:bg-lya-primary/30"
          >
            Hoy
          </button>

          <div className="flex items-center bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm lya:bg-lya-surface lya:border-lya-border/40">
            <CalendarIcon size={18} className="text-gray-400 lya:text-lya-text/50 mx-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-gray-700 dark:text-white lya:text-lya-text font-bold outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen (Animadas) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <motion.div variants={cardVariants} className="bg-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <p className="text-emerald-100 text-sm font-black uppercase tracking-wider mb-1">Ingreso Neto Total</p>
          <h2 className="text-4xl font-black">${resumen.total.toFixed(2)}</h2>
          <Calculator className="absolute -right-4 -bottom-4 opacity-20 w-24 h-24" />
        </motion.div>
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/40">
          <div className="flex items-center gap-2 text-gray-400 lya:text-lya-text/50 mb-1"><Coffee size={16}/> <span className="text-xs font-black uppercase">Cafetería</span></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white lya:text-lya-text">${resumen.cafeteria.toFixed(2)}</h2>
        </motion.div>
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/40">
          <div className="flex items-center gap-2 text-gray-400 lya:text-lya-text/50 mb-1"><Cake size={16}/> <span className="text-xs font-black uppercase">Pastelería</span></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white lya:text-lya-text">${resumen.pasteleria.toFixed(2)}</h2>
        </motion.div>
        <motion.div variants={cardVariants} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 shadow-sm lya:bg-red-500/10 lya:border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 lya:text-red-400 mb-1"><XCircle size={16}/> <span className="text-xs font-black uppercase">Total Anulado</span></div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 lya:text-red-500">${resumen.anulados.toFixed(2)}</h2>
        </motion.div>
      </motion.div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-4">
        <h3 className="text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold flex items-center gap-2">
          <Filter size={18} className="text-gray-400 lya:text-lya-text/50" /> Historial de Movimientos
        </h3>
        
        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-full sm:w-auto overflow-x-auto lya:bg-lya-surface lya:border-lya-border/40">
          <button
            onClick={() => setFilterSource('ALL')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterSource === 'ALL' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white lya:bg-lya-border/30 lya:text-lya-text shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 lya:text-lya-text/50 lya:hover:text-lya-text/80'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterSource('CAFETERIA')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'CAFETERIA' ? 'bg-orange-100 text-orange-600 shadow-sm lya:bg-[#FDE8E8] lya:text-[#9B1C1C]' : 'text-gray-500 hover:text-orange-500 lya:text-lya-text/50 lya:hover:text-[#9B1C1C]'}`}
          >
            <Coffee size={14} /> Cafetería
          </button>
          <button
            onClick={() => setFilterSource('PASTELERIA')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'PASTELERIA' ? 'bg-pink-100 text-pink-600 shadow-sm lya:bg-[#FCE8F3] lya:text-[#9D174D]' : 'text-gray-500 hover:text-pink-500 lya:text-lya-text/50 lya:hover:text-[#9D174D]'}`}
          >
            <Cake size={14} /> Pastelería
          </button>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden relative lya:bg-lya-surface lya:border-lya-border/40">
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10 flex items-center justify-center lya:bg-lya-surface/50"
            >
              <RefreshCw className="animate-spin text-orange-500 lya:text-lya-primary" size={32} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10 lya:bg-lya-bg">
              <tr>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase lya:text-lya-text/50">Hora</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase lya:text-lya-text/50">Origen</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase lya:text-lya-text/50">Descripción</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase text-right lya:text-lya-text/50">Monto</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase text-center lya:text-lya-text/50">Estado</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase text-center lya:text-lya-text/50">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 lya:divide-lya-border/20">
              
              {filteredTransactions.length === 0 && !loading && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td colSpan="6" className="text-center py-10 text-gray-400 font-medium lya:text-lya-text/50">
                    {filterSource === 'ALL' ? 'No hay movimientos registrados en esta fecha.' : `No hay movimientos de ${filterSource.toLowerCase()} en esta fecha.`}
                  </td>
                </motion.tr>
              )}

              <AnimatePresence>
                {filteredTransactions.map((tx, index) => {
                  const isCancelled = tx.status === 'CANCELLED';
                  const creatorName = tx.creator 
                    ? (tx.creator.fullName?.split(' ')[0] || tx.creator.username) 
                    : 'Sistema';

                  return (
                    <motion.tr 
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ duration: 0.2, delay: index * 0.03 }} // 🔥 Efecto Dominó en la tabla
                      className={`${isCancelled ? 'bg-red-50/50 dark:bg-red-900/5 lya:bg-red-500/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700/20 lya:hover:bg-lya-border/10'}`}
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-500 lya:text-lya-text/60">
                        {new Date(tx.createdAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md flex items-center gap-1 w-fit ${tx.source === 'CAFETERIA' ? 'bg-orange-100 text-orange-600 lya:bg-[#FDE8E8] lya:text-[#9B1C1C]' : 'bg-pink-100 text-pink-600 lya:bg-[#FCE8F3] lya:text-[#9D174D]'}`}>
                          {tx.source === 'CAFETERIA' ? <Coffee size={10} /> : <Cake size={10} />}
                          {tx.source}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text">
                        <p className={isCancelled ? 'line-through opacity-50' : ''}>{tx.description}</p>
                        <p className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${isCancelled ? 'text-gray-400 lya:text-lya-text/40' : 'text-blue-500 dark:text-blue-400 lya:text-lya-primary'}`}>
                          <UserCheck size={12} />
                          Por: {creatorName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm font-black text-right text-gray-900 dark:text-white lya:text-lya-text">
                        <span className={isCancelled ? 'line-through opacity-50' : 'text-emerald-600 dark:text-emerald-400 lya:text-[#03543F]'}>
                          {isCancelled ? '' : '+'} ${parseFloat(tx.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isCancelled ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-red-500 bg-red-100 px-2 py-1 rounded mb-1 lya:bg-red-500/10 lya:text-red-500">Anulado</span>
                            {tx.canceller && (
                              <span className="text-[9px] text-gray-400 lya:text-lya-text/40 font-bold whitespace-nowrap">
                                Por: {tx.canceller.fullName?.split(' ')[0] || tx.canceller.username}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-100 px-2 py-1 rounded lya:bg-[#DEF7EC] lya:text-[#03543F]">Activo</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {!isCancelled && user?.role === 'Administrador' && (
                          <button 
                            onClick={() => handleCancelTransaction(tx.id)}
                            className="text-red-400 hover:text-red-600 transition-colors p-1 bg-red-50 hover:bg-red-100 rounded-lg outline-none active:scale-95 lya:bg-red-500/10 lya:text-red-500 lya:hover:bg-red-500/20"
                            title="Anular Movimiento"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                        {isCancelled && user?.role === 'Administrador' && (
                          <button 
                            onClick={() => handleRestoreTransaction(tx.id)}
                            className="text-blue-500 hover:text-blue-700 transition-colors p-1 bg-blue-50 hover:bg-blue-100 rounded-lg outline-none active:scale-95 lya:bg-lya-primary/10 lya:text-lya-primary lya:hover:bg-lya-primary/20"
                            title="Restaurar Movimiento"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        {user?.role !== 'Administrador' && (
                           <span className="text-[10px] text-gray-300 lya:text-lya-text/30 select-none">No auto.</span>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmación */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 lya:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 text-center"
            >
              <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 ${
                confirmModal.actionType === 'CANCEL' 
                  ? 'bg-red-50 text-red-500 dark:bg-red-500/10 lya:bg-red-500/10 lya:text-red-500' 
                  : 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 lya:bg-lya-primary/10 lya:text-lya-primary'
              }`}>
                {confirmModal.actionType === 'CANCEL' ? <AlertTriangle size={32} /> : <RotateCcw size={32} />}
              </div>
              
              <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 font-medium mb-8">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={closeConfirmModal}
                  className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 lya:bg-lya-border/20 lya:text-lya-text lya:hover:bg-lya-border/40 transition-colors outline-none active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeConfirmAction}
                  className={`flex-1 px-4 py-3 font-bold rounded-xl transition-colors outline-none active:scale-95 text-white shadow-sm ${
                    confirmModal.actionType === 'CANCEL'
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 lya:bg-red-600 lya:hover:bg-red-700'
                      : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30 lya:bg-lya-primary lya:hover:opacity-90 lya:shadow-lya-primary/30'
                  }`}
                >
                  Sí, {confirmModal.actionType === 'CANCEL' ? 'Anular' : 'Restaurar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};