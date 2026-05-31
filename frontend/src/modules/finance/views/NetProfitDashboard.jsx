// src/modules/finance/views/NetProfitDashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFinanceController } from '../controllers/useFinanceController';
import { TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, Calendar } from 'lucide-react';

export const NetProfitDashboard = () => {
  const { summary, isSummaryLoading, fetchFinancialSummary } = useFinanceController();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchFinancialSummary(startDate, endDate);
  }, [startDate, endDate, fetchFinancialSummary]);

  const setThisMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-8 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500 dark:bg-emerald-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-emerald-500/20 dark:shadow-emerald-900/30 lya:shadow-lya-primary/20">
            <DollarSign size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight transition-colors">Estado de Resultados</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 transition-colors">Análisis de Utilidad Neta y Costos del Negocio.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <button 
            onClick={setThisMonth}
            className="px-5 py-3 rounded-xl text-sm font-bold transition-all bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 w-full sm:w-auto flex items-center justify-center gap-2 active:scale-95"
          >
            <Calendar size={18} /> Este Mes
          </button>

          <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg p-2 rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-sm w-full sm:w-auto justify-center transition-colors">
            <div className="flex items-center gap-2 px-3">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent font-bold text-sm text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer transition-colors"
              />
            </div>
            <span className="text-gray-400 dark:text-gray-500 lya:text-lya-text/50 font-bold transition-colors">-</span>
            <div className="flex items-center gap-2 px-3">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent font-bold text-sm text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer transition-colors"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {isSummaryLoading || !summary ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse flex flex-col items-center gap-4 opacity-50">
              <Wallet className="w-16 h-16 text-emerald-500 dark:text-emerald-600 lya:text-lya-primary transition-colors" />
              <p className="text-lg font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">Calculando finanzas...</p>
            </div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto w-full space-y-6"
          >
            {/* PASO 1: INGRESOS BRUTOS */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border-2 border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30 relative overflow-hidden transition-colors">
              <div className="absolute -right-10 -top-10 text-emerald-50 dark:text-emerald-900/10 lya:text-lya-primary/5 rotate-12 pointer-events-none transition-colors">
                <TrendingUp size={200} />
              </div>
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-emerald-600 dark:text-emerald-400 lya:text-lya-primary font-black text-[11px] uppercase tracking-widest mb-2 flex items-center gap-2 transition-colors">
                    <TrendingUp size={16} /> Ingresos Brutos
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs font-bold transition-colors">Total de ventas cobradas en Caja y Pastelería</p>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400 lya:text-lya-primary transition-colors">
                  {formatMoney(summary.totalIncome)}
                </h2>
              </div>
            </motion.div>

            {/* FLECHA DE DESCUENTO */}
            <motion.div variants={itemVariants} className="flex justify-center -my-2 relative z-20">
              <div className="bg-red-50 dark:bg-red-900/20 lya:bg-lya-secondary/10 text-red-500 dark:text-red-400 lya:text-lya-secondary border border-red-100 dark:border-red-900/30 lya:border-lya-secondary/20 px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 shadow-sm transition-colors">
                <TrendingDown size={16} /> MENOS
              </div>
            </motion.div>

            {/* PASO 2: COSTO DE VENTAS (COGS) */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 w-11/12 mx-auto transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-gray-800 dark:text-gray-200 lya:text-lya-text font-black text-[11px] uppercase tracking-widest mb-2 transition-colors">
                    Costo de Ventas (COGS)
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs font-bold flex items-center gap-1 transition-colors">
                    <AlertCircle size={14} /> Valor de insumos consumidos (Calculado por Arqueos)
                  </p>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white lya:text-lya-text transition-colors">
                  - {formatMoney(summary.totalCogs)}
                </h3>
              </div>
            </motion.div>

            {/* UTILIDAD BRUTA (Subtotal) */}
            <motion.div variants={itemVariants} className="bg-blue-50 dark:bg-blue-900/10 lya:bg-lya-primary/10 p-6 md:p-8 rounded-3xl border border-blue-100 dark:border-blue-900/30 lya:border-lya-primary/20 w-10/12 mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-2 transition-colors">
              <p className="text-blue-600 dark:text-blue-400 lya:text-lya-primary font-black uppercase text-[11px] tracking-widest transition-colors">Utilidad Bruta</p>
              <p className="text-blue-600 dark:text-blue-400 lya:text-lya-primary font-black text-2xl md:text-3xl transition-colors">{formatMoney(summary.grossProfit)}</p>
            </motion.div>

            {/* FLECHA DE DESCUENTO 2 */}
            <motion.div variants={itemVariants} className="flex justify-center -my-2 relative z-20">
              <div className="bg-red-50 dark:bg-red-900/20 lya:bg-lya-secondary/10 text-red-500 dark:text-red-400 lya:text-lya-secondary border border-red-100 dark:border-red-900/30 lya:border-lya-secondary/20 px-5 py-2 rounded-full text-xs font-black flex items-center gap-2 shadow-sm transition-colors">
                <TrendingDown size={16} /> MENOS
              </div>
            </motion.div>

            {/* PASO 3: GASTOS OPERATIVOS (OPEX) */}
            <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 w-11/12 mx-auto transition-colors">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="text-gray-800 dark:text-gray-200 lya:text-lya-text font-black text-[11px] uppercase tracking-widest mb-2 transition-colors">
                    Gastos Operativos (OPEX)
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs font-bold flex items-center gap-1 transition-colors">
                    <AlertCircle size={14} /> Luz, Sueldos, Limpieza (Registrados manualmente)
                  </p>
                </div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-white lya:text-lya-text transition-colors">
                  - {formatMoney(summary.totalOpex)}
                </h3>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="w-full h-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 lya:via-lya-border/50 to-transparent my-6 transition-colors" />

            {/* RESULTADO FINAL: UTILIDAD NETA */}
            <motion.div variants={itemVariants} className="bg-gray-900 dark:bg-black lya:bg-lya-primary p-8 md:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden transform hover:scale-[1.02] transition-all">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 dark:from-yellow-400/10 lya:from-white/20 to-transparent opacity-50 pointer-events-none transition-colors" />
              <div className="relative z-10 flex flex-col items-center text-center">
                <p className="text-yellow-400 dark:text-yellow-300 lya:text-lya-surface font-black text-xs md:text-sm uppercase tracking-[0.3em] mb-4 flex items-center gap-2 transition-colors">
                  <Wallet size={20} /> Utilidad Neta Real
                </p>
                <h1 className={`text-5xl md:text-7xl font-black tracking-tight transition-colors ${summary.netProfit >= 0 ? 'text-white lya:text-lya-surface' : 'text-red-400 dark:text-red-500 lya:text-red-200'}`}>
                  {formatMoney(summary.netProfit)}
                </h1>
                <p className="text-gray-400 dark:text-gray-400 lya:text-lya-surface/80 mt-6 text-sm md:text-base font-medium max-w-lg transition-colors">
                  {summary.netProfit >= 0 
                    ? "Este es el margen de ganancia real después de cubrir producto y operación."
                    : "Atención: El negocio operó con pérdidas en este periodo."}
                </p>
              </div>
            </motion.div>

          </motion.div>
        )}
      </div>
    </motion.div>
  );
};