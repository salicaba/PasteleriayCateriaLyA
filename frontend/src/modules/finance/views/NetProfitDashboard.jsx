// frontend/src/modules/finance/views/NetProfitDashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useFinanceController } from '../controllers/useFinanceController';
import { TrendingUp, TrendingDown, DollarSign, Wallet, AlertCircle, Calendar } from 'lucide-react';

export const NetProfitDashboard = () => {
  const { summary, isSummaryLoading, fetchFinancialSummary } = useFinanceController();
  
  // Por defecto, calculamos el mes actual
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

  // 🔥 NUEVO: Función para regresar rápidamente al mes actual
  const setThisMonth = () => {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  };

  // Funciones de formato
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount || 0);
  };

  // Variantes de animación para las tarjetas (Cascada)
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
    <div className="p-6 h-full flex flex-col lya:bg-lya-bg overflow-y-auto">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold lya:text-lya-text flex items-center gap-3">
            <DollarSign className="w-10 h-10 text-emerald-500 bg-emerald-100 p-2 rounded-xl" />
            Estado de Resultados
          </h1>
          <p className="text-gray-500 text-sm mt-1 ml-1">Análisis de Utilidad Neta y Costos del Negocio.</p>
        </div>

        {/* 🔥 CONTROLES DE FECHA MEJORADOS */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          
          {/* BOTÓN RÁPIDO "ESTE MES" */}
          <button 
            onClick={setThisMonth}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 w-full sm:w-auto flex items-center justify-center gap-2 active:scale-95"
          >
            <Calendar size={16} /> Este Mes
          </button>

          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 lya:bg-lya-surface p-2 rounded-2xl border border-gray-200 lya:border-lya-border/40 shadow-sm w-full sm:w-auto justify-center">
            <div className="flex items-center gap-2 px-3">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent font-bold text-sm text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer"
              />
            </div>
            <span className="text-gray-300 font-bold">-</span>
            <div className="flex items-center gap-2 px-3">
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent font-bold text-sm text-gray-700 dark:text-gray-200 lya:text-lya-text outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {isSummaryLoading || !summary ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse flex flex-col items-center gap-4 opacity-50">
            <Wallet className="w-16 h-16 text-gray-400" />
            <p className="text-lg font-bold text-gray-500">Calculando finanzas...</p>
          </div>
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="max-w-4xl mx-auto w-full space-y-6 pb-10"
        >
          {/* PASO 1: INGRESOS BRUTOS */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border-2 border-emerald-100 dark:border-emerald-900/30 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 text-emerald-50 dark:text-emerald-900/10 rotate-12 pointer-events-none">
              <TrendingUp size={200} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-emerald-600 dark:text-emerald-400 font-black text-sm uppercase tracking-widest mb-1 flex items-center gap-2">
                  <TrendingUp size={16} /> Ingresos Brutos
                </p>
                <p className="text-gray-500 text-xs">Total de ventas cobradas en Caja y Pastelería</p>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {formatMoney(summary.totalIncome)}
              </h2>
            </div>
          </motion.div>

          {/* FLECHA DE DESCUENTO */}
          <motion.div variants={itemVariants} className="flex justify-center -my-2 relative z-20">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 shadow-sm">
              <TrendingDown size={14} /> MENOS
            </div>
          </motion.div>

          {/* PASO 2: COSTO DE VENTAS (COGS) */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 w-11/12 mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-gray-800 dark:text-gray-200 lya:text-lya-text font-black text-sm uppercase tracking-widest mb-1">
                  Costo de Ventas (COGS)
                </p>
                <p className="text-gray-500 text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> Valor de insumos consumidos (Calculado por Arqueos)
                </p>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white lya:text-lya-text">
                - {formatMoney(summary.totalCogs)}
              </h3>
            </div>
          </motion.div>

          {/* UTILIDAD BRUTA (Subtotal) */}
          <motion.div variants={itemVariants} className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 w-10/12 mx-auto flex justify-between items-center">
            <p className="text-blue-600 dark:text-blue-400 font-bold uppercase text-xs tracking-wider">Utilidad Bruta</p>
            <p className="text-blue-600 dark:text-blue-400 font-black text-xl">{formatMoney(summary.grossProfit)}</p>
          </motion.div>

          {/* FLECHA DE DESCUENTO 2 */}
          <motion.div variants={itemVariants} className="flex justify-center -my-2 relative z-20">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 border border-red-100 dark:border-red-900/30 px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-2 shadow-sm">
              <TrendingDown size={14} /> MENOS
            </div>
          </motion.div>

          {/* PASO 3: GASTOS OPERATIVOS (OPEX) */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 w-11/12 mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-gray-800 dark:text-gray-200 lya:text-lya-text font-black text-sm uppercase tracking-widest mb-1">
                  Gastos Operativos (OPEX)
                </p>
                <p className="text-gray-500 text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> Luz, Sueldos, Limpieza (Registrados manualmente)
                </p>
              </div>
              <h3 className="text-3xl font-bold text-gray-800 dark:text-white lya:text-lya-text">
                - {formatMoney(summary.totalOpex)}
              </h3>
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="w-full h-1 bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent my-4" />

          {/* RESULTADO FINAL: UTILIDAD NETA */}
          <motion.div variants={itemVariants} className="bg-gray-900 lya:bg-lya-primary p-6 md:p-10 rounded-3xl shadow-xl relative overflow-hidden transform hover:scale-[1.01] transition-transform">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col items-center text-center">
              <p className="text-yellow-400 font-black text-sm md:text-base uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                <Wallet size={20} /> Utilidad Neta Real
              </p>
              <h1 className={`text-5xl md:text-7xl font-black tracking-tight ${summary.netProfit >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatMoney(summary.netProfit)}
              </h1>
              <p className="text-gray-400 mt-6 text-sm font-medium">
                {summary.netProfit >= 0 
                  ? "Este es el margen de ganancia real después de cubrir producto y operación."
                  : "Atención: El negocio operó con pérdidas en este periodo."}
              </p>
            </div>
          </motion.div>

        </motion.div>
      )}
    </div>
  );
};