import React, { useState } from 'react';
import { useCashController } from '../controllers/useCashController';
import { Calculator, XCircle, Coffee, Cake, Calendar as CalendarIcon, RefreshCw, UserCheck, RotateCcw, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export const CashRegisterPage = ({ user }) => {
  const { transactions, loading, selectedDate, setSelectedDate, resumen, handleCancelTransaction, handleRestoreTransaction } = useCashController(user);

  // <-- NUEVO ESTADO PARA EL FILTRO -->
  const [filterSource, setFilterSource] = useState('ALL');

  const setToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  };

  // <-- LÓGICA DE FILTRADO -->
  const filteredTransactions = transactions.filter(tx => {
    if (filterSource === 'ALL') return true;
    return tx.source === filterSource;
  });

  return (
    <div className="h-full flex flex-col p-6 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg">
      
      {/* Encabezado y Fecha */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text flex items-center gap-2">
            <Calculator className="text-orange-500 lya:text-lya-secondary" />
            Caja
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Control de ingresos y anulaciones del negocio.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={setToday}
            className="px-4 py-2 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold rounded-xl hover:bg-orange-200 dark:hover:bg-orange-500/30 transition-colors shadow-sm active:scale-95 outline-none"
          >
            Hoy
          </button>

          <div className="flex items-center bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <CalendarIcon size={18} className="text-gray-400 mx-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none text-gray-700 dark:text-white font-bold outline-none cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen (No cambian con el filtro, siempre muestran el total del día) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-emerald-500 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <p className="text-emerald-100 text-sm font-black uppercase tracking-wider mb-1">Ingreso Neto Total</p>
          <h2 className="text-4xl font-black">${resumen.total.toFixed(2)}</h2>
          <Calculator className="absolute -right-4 -bottom-4 opacity-20 w-24 h-24" />
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 mb-1"><Coffee size={16}/> <span className="text-xs font-black uppercase">Cafetería</span></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">${resumen.cafeteria.toFixed(2)}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400 mb-1"><Cake size={16}/> <span className="text-xs font-black uppercase">Pastelería</span></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">${resumen.pasteleria.toFixed(2)}</h2>
        </div>
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-red-400 mb-1"><XCircle size={16}/> <span className="text-xs font-black uppercase">Total Anulado</span></div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">${resumen.anulados.toFixed(2)}</h2>
        </div>
      </div>

      {/* <-- NUEVO: BARRA DE FILTROS PARA LA TABLA --> */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-4">
        <h3 className="text-gray-700 dark:text-gray-300 font-bold flex items-center gap-2">
          <Filter size={18} className="text-gray-400" /> Historial de Movimientos
        </h3>
        
        <div className="flex bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterSource('ALL')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${filterSource === 'ALL' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterSource('CAFETERIA')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'CAFETERIA' ? 'bg-orange-100 text-orange-600 shadow-sm' : 'text-gray-500 hover:text-orange-500'}`}
          >
            <Coffee size={14} /> Cafetería
          </button>
          <button
            onClick={() => setFilterSource('PASTELERIA')}
            className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'PASTELERIA' ? 'bg-pink-100 text-pink-600 shadow-sm' : 'text-gray-500 hover:text-pink-500'}`}
          >
            <Cake size={14} /> Pastelería
          </button>
        </div>
      </div>

      {/* Tabla de Movimientos */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm z-10 flex items-center justify-center">
            <RefreshCw className="animate-spin text-orange-500" size={32} />
          </div>
        )}
        
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase">Hora</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase">Origen</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase">Descripción</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase text-right">Monto</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase text-center">Estado</th>
                <th className="px-4 py-3 text-xs font-black text-gray-400 uppercase text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              
              {/* Si no hay datos (usando el arreglo filtrado) */}
              {filteredTransactions.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400 font-medium">
                    {filterSource === 'ALL' ? 'No hay movimientos registrados en esta fecha.' : `No hay movimientos de ${filterSource.toLowerCase()} en esta fecha.`}
                  </td>
                </tr>
              )}

              {/* Mapeamos el arreglo filtrado en lugar del original */}
              {filteredTransactions.map(tx => {
                const isCancelled = tx.status === 'CANCELLED';
                
                const creatorName = tx.creator 
                  ? (tx.creator.fullName?.split(' ')[0] || tx.creator.username) 
                  : 'Sistema';

                return (
                  <motion.tr initial={{opacity:0}} animate={{opacity:1}} key={tx.id} className={`${isCancelled ? 'bg-red-50/50 dark:bg-red-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'}`}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-500">
                      {new Date(tx.createdAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-md flex items-center gap-1 w-fit ${tx.source === 'CAFETERIA' ? 'bg-orange-100 text-orange-600' : 'bg-pink-100 text-pink-600'}`}>
                        {tx.source === 'CAFETERIA' ? <Coffee size={10} /> : <Cake size={10} />}
                        {tx.source}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-200">
                      <p className={isCancelled ? 'line-through opacity-50' : ''}>{tx.description}</p>
                      <p className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${isCancelled ? 'text-gray-400' : 'text-blue-500 dark:text-blue-400'}`}>
                        <UserCheck size={12} />
                        Por: {creatorName}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm font-black text-right text-gray-900 dark:text-white">
                      <span className={isCancelled ? 'line-through opacity-50' : 'text-emerald-600 dark:text-emerald-400'}>
                        + ${parseFloat(tx.amount).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isCancelled ? (
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-black uppercase text-red-500 bg-red-100 px-2 py-1 rounded mb-1">Anulado</span>
                          {tx.canceller && (
                            <span className="text-[9px] text-gray-400 font-bold whitespace-nowrap">
                              Por: {tx.canceller.fullName?.split(' ')[0] || tx.canceller.username}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-emerald-500 bg-emerald-100 px-2 py-1 rounded">Activo</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {!isCancelled && user?.role === 'Administrador' && (
                        <button 
                          onClick={() => handleCancelTransaction(tx.id)}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 bg-red-50 hover:bg-red-100 rounded-lg outline-none active:scale-95"
                          title="Anular Movimiento"
                        >
                          <XCircle size={18} />
                        </button>
                      )}
                      {isCancelled && user?.role === 'Administrador' && (
                        <button 
                          onClick={() => handleRestoreTransaction(tx.id)}
                          className="text-blue-500 hover:text-blue-700 transition-colors p-1 bg-blue-50 hover:bg-blue-100 rounded-lg outline-none active:scale-95"
                          title="Restaurar Movimiento"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                      {user?.role !== 'Administrador' && (
                         <span className="text-[10px] text-gray-300 select-none">No auto.</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};