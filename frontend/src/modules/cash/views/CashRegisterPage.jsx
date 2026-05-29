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

  // --- VARIANTES DE ANIMACIÓN HOMOLOGADAS ---
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
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      
      {/* Encabezado y Fecha Premium (Estilo Inventario) */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 lya:shadow-lya-primary/20">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text">Caja</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Control de ingresos y anulaciones del negocio</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button 
            onClick={setToday}
            className="w-full sm:w-auto px-5 py-3.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold rounded-xl hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-all shadow-sm active:scale-95 transform hover:-translate-y-0.5 lya:bg-lya-primary/10 lya:text-lya-primary lya:hover:bg-lya-primary/20"
          >
            Hoy
          </button>

          <div className="flex w-full sm:w-auto items-center bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner lya:bg-lya-bg lya:border-lya-border/40 focus-within:ring-2 focus-within:ring-orange-500 lya:focus-within:ring-lya-primary transition-all">
            <CalendarIcon size={20} className="text-gray-400 lya:text-lya-text/50 mx-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-gray-700 dark:text-white lya:text-lya-text font-bold outline-none cursor-pointer w-full"
            />
          </div>
        </div>
      </header>

      {/* Tarjetas de Resumen Animadas (Con Hover) */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      >
        <motion.div variants={cardVariants} className="bg-emerald-500 dark:bg-emerald-600 lya:bg-[#03543F] text-white rounded-3xl p-6 shadow-lg shadow-emerald-500/20 relative overflow-hidden transform transition-all hover:-translate-y-1 hover:shadow-xl">
          <p className="text-emerald-100 text-xs font-black uppercase tracking-wider mb-1">Ingreso Neto Total</p>
          <h2 className="text-4xl font-black">${resumen.total.toFixed(2)}</h2>
          <Calculator className="absolute -right-4 -bottom-4 opacity-20 w-24 h-24" />
        </motion.div>
        
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center gap-2 text-gray-400 lya:text-lya-text/50 mb-1"><Coffee size={16}/> <span className="text-xs font-black uppercase tracking-wider">Cafetería</span></div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text">${resumen.cafeteria.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-6 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center gap-2 text-gray-400 lya:text-lya-text/50 mb-1"><Cake size={16}/> <span className="text-xs font-black uppercase tracking-wider">Pastelería</span></div>
          <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text">${resumen.pasteleria.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-3xl p-6 shadow-sm lya:bg-red-500/5 lya:border-red-500/20 transform transition-all hover:-translate-y-1 hover:shadow-md">
          <div className="flex items-center gap-2 text-red-500 lya:text-red-500 mb-1"><XCircle size={16}/> <span className="text-xs font-black uppercase tracking-wider">Total Anulado</span></div>
          <h2 className="text-2xl font-extrabold text-red-600 dark:text-red-400 lya:text-red-500">${resumen.anulados.toFixed(2)}</h2>
        </motion.div>
      </motion.div>

      {/* Barra de Filtros Estilizada */}
      <div className="mb-4 bg-white dark:bg-gray-900 lya:bg-lya-surface p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold flex items-center gap-2 pl-2">
          <Filter size={18} className="text-gray-400 lya:text-lya-text/50" /> Movimientos
        </h3>
        
        <div className="flex bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-1 rounded-xl border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterSource('ALL')}
            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all ${filterSource === 'ALL' ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 lya:text-lya-text/50 lya:hover:text-lya-text/80'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterSource('CAFETERIA')}
            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'CAFETERIA' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shadow-sm lya:bg-[#FDE8E8] lya:text-[#9B1C1C]' : 'text-gray-500 hover:text-orange-500 lya:text-lya-text/50 lya:hover:text-[#9B1C1C]'}`}
          >
            <Coffee size={14} /> Cafetería
          </button>
          <button
            onClick={() => setFilterSource('PASTELERIA')}
            className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'PASTELERIA' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-sm lya:bg-[#FCE8F3] lya:text-[#9D174D]' : 'text-gray-500 hover:text-pink-500 lya:text-lya-text/50 lya:hover:text-[#9D174D]'}`}
          >
            <Cake size={14} /> Pastelería
          </button>
        </div>
      </div>

      {/* Tabla de Movimientos (PopLayout y Spring) */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden relative lya:bg-lya-surface lya:border-lya-border/30 mb-4">
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm z-20 flex items-center justify-center lya:bg-lya-surface/50"
            >
              <RefreshCw className="animate-spin text-orange-500 lya:text-lya-primary" size={36} />
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-950 lya:bg-lya-bg sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/30">
              <tr>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Hora</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Origen</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Descripción</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider text-right lya:text-lya-text/50">Monto</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider text-center lya:text-lya-text/50">Estado</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider text-center lya:text-lya-text/50">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10">
              
              {filteredTransactions.length === 0 && !loading && (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td colSpan="6" className="text-center py-10 text-gray-400 font-medium lya:text-lya-text/50">
                    {filterSource === 'ALL' ? 'No hay movimientos registrados en esta fecha.' : `No hay movimientos de ${filterSource.toLowerCase()} en esta fecha.`}
                  </td>
                </motion.tr>
              )}

              <AnimatePresence mode="popLayout">
                {filteredTransactions.map((tx, index) => {
                  const isCancelled = tx.status === 'CANCELLED';
                  const creatorName = tx.creator 
                    ? (tx.creator.fullName?.split(' ')[0] || tx.creator.username) 
                    : 'Sistema';

                  return (
                    <motion.tr 
                      key={tx.id}
                      layout
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.02, 0.2) }}
                      className={`${isCancelled ? 'bg-red-50/50 dark:bg-red-900/5 lya:bg-red-500/5' : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 lya:hover:bg-lya-bg/40'} transition-colors`}
                    >
                      <td className="p-5 text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                        {new Date(tx.createdAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg flex items-center gap-1.5 w-fit ${tx.source === 'CAFETERIA' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 lya:bg-[#FDE8E8] lya:text-[#9B1C1C]' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 lya:bg-[#FCE8F3] lya:text-[#9D174D]'}`}>
                          {tx.source === 'CAFETERIA' ? <Coffee size={12} /> : <Cake size={12} />}
                          {tx.source}
                        </span>
                      </td>
                      <td className="p-5 text-sm font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">
                        <p className={isCancelled ? 'line-through opacity-50' : ''}>{tx.description}</p>
                        <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${isCancelled ? 'text-gray-400 lya:text-lya-text/40' : 'text-blue-500 dark:text-blue-400 lya:text-lya-primary'}`}>
                          <UserCheck size={12} /> Por: {creatorName}
                        </p>
                      </td>
                      <td className="p-5 text-base font-black text-right text-gray-900 dark:text-white lya:text-lya-text">
                        <span className={isCancelled ? 'line-through opacity-50' : 'text-emerald-600 dark:text-emerald-400 lya:text-[#03543F]'}>
                          {isCancelled ? '' : '+'} ${parseFloat(tx.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        {isCancelled ? (
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase text-red-600 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-lg mb-1 border border-red-200 dark:border-red-800/50 lya:bg-red-500/10 lya:border-red-500/20 lya:text-red-500">Anulado</span>
                            {tx.canceller && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 lya:text-lya-text/50 font-bold whitespace-nowrap">
                                Por: {tx.canceller.fullName?.split(' ')[0] || tx.canceller.username}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 rounded-lg lya:bg-emerald-500/10 lya:border-emerald-500/20 lya:text-[#03543F]">Activo</span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        {!isCancelled && user?.role === 'Administrador' && (
                          <button 
                            onClick={() => handleCancelTransaction(tx.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl outline-none active:scale-95 lya:bg-red-500/10 lya:text-red-500 lya:hover:bg-red-500/20"
                            title="Anular Movimiento"
                          >
                            <XCircle size={20} />
                          </button>
                        )}
                        {isCancelled && user?.role === 'Administrador' && (
                          <button 
                            onClick={() => handleRestoreTransaction(tx.id)}
                            className="text-blue-500 hover:text-blue-700 transition-colors p-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-xl outline-none active:scale-95 lya:bg-lya-primary/10 lya:text-lya-primary lya:hover:bg-lya-primary/20"
                            title="Restaurar Movimiento"
                          >
                            <RotateCcw size={20} />
                          </button>
                        )}
                        {user?.role !== 'Administrador' && (
                           <span className="text-xs font-bold text-gray-400 lya:text-lya-text/30 select-none">No auto.</span>
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

      {/* Modal de Confirmación Estilizado con Spring */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/60 lya:bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
            >
              <div className={`mx-auto w-20 h-20 flex items-center justify-center rounded-full mb-5 ${
                confirmModal.actionType === 'CANCEL' 
                  ? 'bg-red-100 text-red-500 dark:bg-red-500/10 lya:bg-red-500/10 lya:text-red-500' 
                  : 'bg-blue-100 text-blue-500 dark:bg-blue-500/10 lya:bg-lya-primary/10 lya:text-lya-primary'
              }`}>
                {confirmModal.actionType === 'CANCEL' ? <AlertTriangle size={40} /> : <RotateCcw size={40} />}
              </div>
              
              <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={closeConfirmModal}
                  className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-border/20 lya:hover:bg-lya-border/40 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={executeConfirmAction}
                  className={`flex-1 py-3.5 font-bold rounded-xl transition-all transform hover:-translate-y-0.5 text-white shadow-lg ${
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