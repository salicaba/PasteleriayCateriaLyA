import React, { useState, useMemo } from 'react';
import { useCashController } from '../controllers/useCashController';
import { Calculator, XCircle, Coffee, Cake, Calendar as CalendarIcon, UserCheck, RotateCcw, Filter, AlertTriangle, Banknote, Landmark, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CashRegisterPage = ({ user }) => {
  const { 
    transactions, loading, selectedDate, setSelectedDate, resumen, 
    handleCancelTransaction, handleRestoreTransaction,
    confirmModal, closeConfirmModal, executeConfirmAction 
  } = useCashController(user);

  const [filterSource, setFilterSource] = useState('ALL');
  const [showModDetails, setShowModDetails] = useState(false);
  
  // PILAR 3: Estado local para bloqueo asíncrono del modal
  const [isProcessing, setIsProcessing] = useState(false);

  const setToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // REGLA ESTRICTA DE NEGOCIO: Solo Efectivo y Transferencia (Tarjetas eliminadas)
  const getPaymentInfo = (tx) => {
    const methodStr = String(tx.paymentMethod || '').toUpperCase();
    const isTransfer = methodStr === 'TRANSFER' || tx.description?.toLowerCase().includes('transferencia');

    if (isTransfer) {
      return { label: 'Transferencia', icon: Landmark, color: 'text-blue-600 dark:text-blue-400 lya:text-blue-700', bg: 'bg-blue-100 dark:bg-blue-500/20 lya:bg-blue-100' };
    }
    
    return { label: 'Efectivo', icon: Banknote, color: 'text-emerald-600 dark:text-emerald-400 lya:text-emerald-700', bg: 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-emerald-100' };
  };

  const activeTransactions = transactions.filter(tx => tx.status === 'ACTIVE');
  const paymentStats = useMemo(() => {
    return activeTransactions.reduce((acc, tx) => {
      const amount = parseFloat(tx.amount) || 0;
      const info = getPaymentInfo(tx);
      
      if (info.label === 'Efectivo') acc.efectivo += amount;
      else acc.digital += amount;
      
      return acc;
    }, { efectivo: 0, digital: 0 });
  }, [activeTransactions]);

  // PILAR 3: Envoltura asíncrona para la confirmación
  const handleConfirmLock = async () => {
    setIsProcessing(true);
    try {
      await executeConfirmAction();
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-hidden">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800"
        >
          <Calculator size={40} className="text-orange-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Caja
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500" /> Sincronizando movimientos...
        </p>
      </div>
    );
  }

  const filteredTransactions = transactions.filter(tx => {
    if (filterSource === 'ALL') return true;
    return tx.source === filterSource;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    // PILAR 1: Contenedor Raíz bloqueado
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full w-full flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      
      {/* HEADER: PILAR 4 Geometría premium */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 lya:shadow-lya-primary/20">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Caja</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Control de ingresos y anulaciones de Cafetería y Pastelería</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* PILAR 2: Botón con whileTap y md:hover */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={setToday}
            className="w-full sm:w-auto px-5 py-3.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold rounded-xl md:hover:bg-orange-200 dark:md:hover:bg-orange-500/30 transition-all shadow-sm transform md:hover:-translate-y-0.5 lya:bg-lya-primary/10 lya:text-lya-primary lya:hover:bg-lya-primary/20"
          >
            Hoy
          </motion.button>

          <div className="flex w-full sm:w-auto items-center bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner lya:bg-lya-bg lya:border-lya-border/40 focus-within:ring-2 focus-within:ring-orange-500 lya:focus-within:ring-lya-primary transition-all">
            <CalendarIcon size={20} className="text-gray-400 lya:text-lya-text/50 mx-2" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ colorScheme: 'dark' }}
              className="bg-transparent border-none text-gray-700 dark:text-white lya:text-lya-text font-bold outline-none cursor-pointer w-full"
            />
          </div>
        </div>
      </header>

      {/* KPIs: PILAR 4 Geometría */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 shrink-0"
      >
        <motion.div variants={cardVariants} className="col-span-2 md:col-span-1 bg-gray-900 dark:bg-gray-800 lya:bg-[#03543F] text-white rounded-[2rem] p-5 shadow-lg relative overflow-hidden transform transition-all md:hover:-translate-y-1">
          <p className="text-gray-400 lya:text-emerald-100 text-[10px] font-black uppercase tracking-wider mb-1">Total del Día</p>
          <h2 className="text-3xl font-black">${resumen.total.toFixed(2)}</h2>
          <Calculator className="absolute -right-4 -bottom-4 opacity-10 w-20 h-20" />
        </motion.div>

        <motion.div variants={cardVariants} className="col-span-2 md:col-span-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Banknote size={16}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Efectivo en Cajón</span>
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 lya:text-[#03543F]">${paymentStats.efectivo.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="col-span-2 md:col-span-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <Landmark size={16}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Banco / Digital</span>
          </div>
          <h2 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 lya:text-blue-600">${paymentStats.digital.toFixed(2)}</h2>
        </motion.div>
        
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Coffee size={14}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Cafetería</span>
          </div>
          <h2 className="text-xl font-extrabold text-orange-600 dark:text-orange-400 lya:text-[#9B1C1C]">${resumen.cafeteria.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-pink-500 mb-1">
            <Cake size={14}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Pastelería</span>
          </div>
          <h2 className="text-xl font-extrabold text-pink-600 dark:text-pink-400 lya:text-[#9D174D]">${resumen.pasteleria.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <XCircle size={14}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Anulado</span>
          </div>
          <h2 className="text-xl font-extrabold text-red-600 dark:text-red-400 lya:text-red-600">${resumen.anulados.toFixed(2)}</h2>
        </motion.div>
      </motion.div>

      <div className="mb-4 bg-white dark:bg-gray-900 lya:bg-lya-surface p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <h3 className="text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold flex items-center gap-2 pl-2 whitespace-nowrap">
          <Filter size={18} className="text-gray-400 lya:text-lya-text/50" /> Movimientos
        </h3>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar">
          <div className="flex bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-1 rounded-xl border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 w-full sm:w-auto flex-shrink-0">
            {/* PILAR 2: Botones de filtro táctiles */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterSource('ALL')}
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all ${filterSource === 'ALL' ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text shadow-sm' : 'text-gray-500 md:hover:text-gray-700 dark:md:hover:text-gray-300 lya:text-lya-text/50 lya:md:hover:text-lya-text/80'}`}
            >
              Todos
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterSource('CAFETERIA')}
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'CAFETERIA' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shadow-sm lya:bg-[#FDE8E8] lya:text-[#9B1C1C]' : 'text-gray-500 md:hover:text-orange-500 lya:text-lya-text/50 lya:md:hover:text-[#9B1C1C]'}`}
            >
              <Coffee size={14} /> Cafetería
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterSource('PASTELERIA')}
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'PASTELERIA' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-sm lya:bg-[#FCE8F3] lya:text-[#9D174D]' : 'text-gray-500 md:hover:text-pink-500 lya:text-lya-text/50 lya:md:hover:text-[#9D174D]'}`}
            >
              <Cake size={14} /> Pastelería
            </motion.button>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModDetails(!showModDetails)}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all w-full sm:w-auto flex-shrink-0 ${
              showModDetails 
                ? 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50 lya:bg-lya-primary/10 lya:text-lya-primary lya:border-lya-primary/20' 
                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 lya:bg-lya-surface lya:border-lya-border/40 md:hover:bg-gray-50 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-bg/50'
            } border shadow-sm`}
          >
            {showModDetails ? <EyeOff size={14}/> : <Eye size={14}/>}
            {showModDetails ? 'Ocultar Detalles' : 'Ver Detalles'}
          </motion.button>
        </div>
      </div>

      {/* TABLA PRINCIPAL: PILAR 1 y 4 (Contenedor scrolleable) */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden relative lya:bg-lya-surface lya:border-lya-border/30 mb-4">
        <div className="overflow-y-auto custom-scrollbar flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-950 lya:bg-lya-bg sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/30">
              <tr>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Hora</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Origen</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Descripción / Pago</th>
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
                  
                  const payInfo = getPaymentInfo(tx);

                  return (
                    <motion.tr 
                      key={tx.id} 
                      layout
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 26, delay: Math.min(index * 0.02, 0.2) }}
                      className={`${isCancelled ? 'bg-red-50/50 dark:bg-red-900/5 lya:bg-red-500/5' : 'md:hover:bg-gray-50 dark:md:hover:bg-gray-800/40 lya:md:hover:bg-lya-bg/40'} transition-colors`}
                    >
                      <td className="p-5 text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                        {new Date(tx.createdAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg flex items-center gap-1.5 w-fit ${tx.source === 'CAFETERIA' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 lya:bg-[#FDE8E8] lya:text-[#9B1C1C]' : tx.source === 'PASTELERIA' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 lya:bg-[#FCE8F3] lya:text-[#9D174D]' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                          {tx.source === 'CAFETERIA' ? <Coffee size={12} /> : tx.source === 'PASTELERIA' ? <Cake size={12} /> : <Calculator size={12} />}
                          {tx.source}
                        </span>
                      </td>
                      <td className="p-5 text-sm font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">
                        
                        {(() => {
                          const partes = (tx.description || '').split(' | ');
                          const descOriginal = partes[0];
                          const modificaciones = partes.slice(1);
                          
                          return (
                            <div className="flex flex-col gap-1.5">
                              <p className={isCancelled ? 'line-through opacity-50' : ''}>
                                {descOriginal}
                              </p>
                              
                              {modificaciones.length > 0 && showModDetails && (
                                <div className="flex flex-col gap-1 mt-0.5">
                                  {modificaciones.map((mod, i) => {
                                    const isRestaurado = mod.includes('📈');
                                    return (
                                      <span key={i} className={`text-[10px] font-black px-2 py-1 rounded-md border w-fit flex items-center shadow-sm ${
                                        isRestaurado 
                                          ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 lya:bg-blue-500/10 lya:border-blue-500/20 lya:text-blue-500' 
                                          : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 lya:bg-red-500/10 lya:border-red-500/20 lya:text-red-500'
                                      }`}>
                                        {mod}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}

                              {modificaciones.length > 0 && !showModDetails && (
                                 <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold italic flex items-center gap-1">
                                   <RotateCcw size={10}/> {modificaciones.length} modificación(es) oculta(s)
                                 </span>
                              )}

                            </div>
                          );
                        })()}

                        <div className={`text-[11px] font-semibold mt-1.5 flex flex-wrap items-center gap-2 ${isCancelled ? 'text-gray-400 lya:text-lya-text/40' : 'text-blue-500 dark:text-blue-400 lya:text-lya-primary'}`}>
                          <span className="flex items-center gap-1"><UserCheck size={12} /> Por: {creatorName}</span>
                          {!isCancelled && (
                            <>
                              <span className="text-gray-300 dark:text-gray-700 lya:text-lya-border">•</span>
                              <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-widest ${payInfo.bg} ${payInfo.color}`}>
                                <payInfo.icon size={10} /> {payInfo.label}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="p-5 text-base font-black text-right text-gray-900 dark:text-white lya:text-lya-text">
                        <span className={isCancelled ? 'line-through opacity-50 text-gray-400 dark:text-gray-600 lya:text-lya-text/40' : 'text-emerald-600 dark:text-emerald-400 lya:text-[#03543F]'}>
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

                      {/* PILAR 2: Botones de tabla con whileTap */}
                      <td className="p-5 text-center">
                        {tx.source !== 'MANUAL' ? (
                          <span 
                            className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg select-none"
                            title={`Los movimientos de ${tx.source === 'CAFETERIA' ? 'Cafetería' : 'Pastelería'} solo se pueden anular o restaurar desde su módulo correspondiente.`}
                          >
                            Automático
                          </span>
                        ) : (
                          <>
                            {!isCancelled && user?.role === 'Administrador' && (
                              <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleCancelTransaction(tx.id)}
                                className="text-red-500 hover:text-red-700 transition-colors p-2 bg-red-50 dark:bg-red-900/20 md:hover:bg-red-100 dark:md:hover:bg-red-900/40 rounded-xl outline-none lya:bg-red-500/10 lya:text-red-500 lya:md:hover:bg-red-500/20"
                                title="Anular Movimiento Manual"
                              >
                                <XCircle size={20} />
                              </motion.button>
                            )}
                            {isCancelled && user?.role === 'Administrador' && (
                              <motion.button 
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleRestoreTransaction(tx.id)}
                                className="text-blue-500 hover:text-blue-700 transition-colors p-2 bg-blue-50 dark:bg-blue-900/20 md:hover:bg-blue-100 dark:md:hover:bg-blue-900/40 rounded-xl outline-none lya:bg-lya-primary/10 lya:text-lya-primary lya:md:hover:bg-lya-primary/20"
                                title="Restaurar Movimiento Manual"
                              >
                                <RotateCcw size={20} />
                              </motion.button>
                            )}
                            {user?.role !== 'Administrador' && (
                               <span className="text-xs font-bold text-gray-400 lya:text-lya-text/30 select-none">No auto.</span>
                            )}
                          </>
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

      {/* MODAL DE CONFIRMACIÓN: PILAR 4 y 5 (Cápsulas y Locks Asíncronos) */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/60 lya:bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
            >
              <div className={`mx-auto w-20 h-20 flex items-center justify-center rounded-full mb-5 ${
                confirmModal.actionType === 'CANCEL' 
                  ? 'bg-red-100 text-red-500 dark:bg-red-500/10 lya:bg-red-500/10 lya:text-red-500' 
                  : 'bg-blue-100 text-blue-500 dark:bg-blue-500/10 lya:bg-lya-primary/10 lya:text-lya-primary'
              }`}>
                {confirmModal.actionType === 'CANCEL' ? <AlertTriangle size={40} /> : <RotateCcw size={40} />}
              </div>
              
              <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text mb-2 tracking-tight">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed text-center">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={closeConfirmModal}
                  disabled={isProcessing}
                  className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:md:hover:bg-lya-border/40 rounded-xl font-bold transition-colors disabled:opacity-50 outline-none"
                >
                  Cancelar
                </motion.button>
                {/* PILAR 3: Botón de confirmación con estado de carga (Anti-doble clic) */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmLock}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center py-3.5 font-bold rounded-xl transition-all transform md:hover:-translate-y-0.5 text-white shadow-lg outline-none ${
                    confirmModal.actionType === 'CANCEL'
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 lya:bg-red-600 lya:hover:bg-red-700'
                      : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30 lya:bg-lya-primary lya:hover:opacity-90 lya:shadow-lya-primary/30'
                  } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    `Sí, ${confirmModal.actionType === 'CANCEL' ? 'Anular' : 'Restaurar'}`
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};