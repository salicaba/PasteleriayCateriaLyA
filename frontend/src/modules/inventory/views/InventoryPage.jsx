// frontend/src/modules/inventory/views/InventoryPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackagePlus, Search, AlertCircle, Boxes, Loader2, CheckCircle2, TrendingUp, History, Calendar, Wallet, ChevronDown, Activity, Trash2, ArchiveRestore, X, AlertTriangle } from 'lucide-react';
import { useInventoryController } from '../controllers/useInventoryController';
import NewItemModal from './NewItemModal';
import ItemDetailsModal from './ItemDetailsModal';

const getDates = (filter) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  switch (filter) {
    case 'today':
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1);
      end.setDate(now.getDate() - 1);
      break;
    case 'week':
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      end = new Date(); 
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
      break;
    default:
      break;
  }
  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
};

const filterLabels = {
  today: 'Hoy',
  yesterday: 'Ayer',
  week: 'Esta Semana',
  month: 'Este Mes',
  lastMonth: 'Mes Anterior',
  custom: 'Personalizado...'
};

export default function InventoryPage() {
  const controller = useInventoryController();
  const { 
    inventory, isLoading, createItem, successScreen, 
    globalKardex, globalKpiSpent, globalKpiOut, isKardexLoading, fetchGlobalKardex 
  } = controller; 
  
  const [activeTab, setActiveTab] = useState('catalog'); 
  const [timeFilter, setTimeFilter] = useState('month'); 
  const [isDateMenuOpen, setIsDateMenuOpen] = useState(false);
  const [customDates, setCustomDates] = useState(() => {
    const { startDate, endDate } = getDates('month');
    return { start: startDate, end: endDate };
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  // 🔥 ESTADOS PARA MODALES, NOTIFICACIONES Y CARGAS
  const [isFullScreenLoader, setIsFullScreenLoader] = useState(true);
  const [notification, setNotification] = useState(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [cancelModal, setCancelModal] = useState({ isOpen: false, txId: null, reason: '' });
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  const dropdownRef = useRef(null);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // 🔥 PILAR 5: DESACTIVAR PANTALLAZO DESPUÉS DE LA PRIMERA CARGA
  useEffect(() => {
    if (!isLoading) {
      const minLoadTime = new Promise(resolve => setTimeout(resolve, 600));
      minLoadTime.then(() => setIsFullScreenLoader(false));
    }
  }, [isLoading]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (activeTab === 'kardex') {
      if (timeFilter === 'custom') {
        if (customDates.start && customDates.end) {
          fetchGlobalKardex(customDates.start, customDates.end);
        }
      } else {
        const { startDate, endDate } = getDates(timeFilter);
        fetchGlobalKardex(startDate, endDate);
      }
    }
  }, [activeTab, timeFilter, customDates.start, customDates.end, fetchGlobalKardex]);

  // 🔥 PILAR 3: ACCIONES PROTEGIDAS CON BLOQUEO Y SIN PANTALLAZO
  const handleConfirmCancel = async () => {
    try {
      setActionLoadingId(cancelModal.txId);
      const res = await controller.cancelKardexTransaction(cancelModal.txId, cancelModal.reason);
      if (res.success) {
        showNotification('Movimiento anulado. El stock ha regresado.', 'success');
        setCancelModal({ isOpen: false, txId: null, reason: '' });
        const { startDate, endDate } = timeFilter === 'custom' ? {startDate: customDates.start, endDate: customDates.end} : getDates(timeFilter);
        await fetchGlobalKardex(startDate, endDate);
      } else {
        showNotification(res.error || 'No se pudo anular el movimiento', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestore = async (id) => {
    try {
      setActionLoadingId(id);
      const res = await controller.restoreKardexTransaction(id);
      if (res.success) {
        showNotification('Movimiento restaurado en Kardex.', 'success');
        const { startDate, endDate } = timeFilter === 'custom' ? {startDate: customDates.start, endDate: customDates.end} : getDates(timeFilter);
        await fetchGlobalKardex(startDate, endDate);
      } else {
        showNotification(res.error || 'No se pudo restaurar el movimiento', 'error');
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentTotalWarehouseValue = inventory.reduce((total, item) => {
    return total + (parseFloat(item.currentStock) * parseFloat(item.averageCost));
  }, 0);

  const getTxStyles = (type) => {
    const styles = {
      IN: { label: 'Entrada', classes: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 lya:text-emerald-500 lya:bg-emerald-500/10 lya:border-emerald-500/20' },
      OUT: { label: 'Salida', classes: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 lya:text-blue-500 lya:bg-blue-500/10 lya:border-blue-500/20' },
      CONSUMPTION: { label: 'Consumo', classes: 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800 lya:text-purple-500 lya:bg-purple-500/10 lya:border-purple-500/20' },
      WASTE: { label: 'Merma', classes: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 lya:text-red-500 lya:bg-red-500/10 lya:border-red-500/20' },
      ADJUSTMENT: { label: 'Ajuste', classes: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800 lya:text-amber-500 lya:bg-amber-500/10 lya:border-amber-500/20' },
    };
    return styles[type] || { label: type, classes: 'text-gray-700 bg-gray-100 border-gray-200' };
  };

  const netBalance = globalKpiSpent - globalKpiOut;
  const isBalancePositive = netBalance >= 0;

  const todayStr = new Date().toLocaleDateString('es-MX');
  const activeKardex = globalKardex.filter(tx => tx.status !== 'CANCELLED');
  const cancelledKardex = globalKardex.filter(tx => {
    if (tx.status !== 'CANCELLED') return false;
    const cancelDate = tx.cancelledAt ? new Date(tx.cancelledAt) : new Date(tx.createdAt);
    return cancelDate.toLocaleDateString('es-MX') === todayStr;
  });

  return (
    <>
      {/* 🔥 PILAR 5: NOTIFICACIÓN TIPO CÁPSULA NEO-BENTO */}
      <AnimatePresence>
        {(notification || successScreen?.isOpen) && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border pointer-events-auto transition-colors ${
                notification?.type === 'error' ? 'border-red-100 dark:border-red-900/30 lya:border-red-500/30' : 'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                notification?.type === 'error' 
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-500' 
                  : 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
              }`}>
                {notification?.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="flex flex-col">
                  <span className="text-sm text-center">{notification?.message || successScreen?.title || 'Acción exitosa'}</span>
                  {successScreen?.subtitle && !notification && <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 leading-none mt-0.5 text-center">{successScreen.subtitle}</span>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONTENIDO PRINCIPAL: LOADER O PANTALLA */}
      <AnimatePresence mode="wait">
        {isFullScreenLoader ? (
          <motion.div
            key="loader-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300 z-[100]"
          >
            <motion.div
              animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <Boxes size={40} className="text-blue-500 lya:text-lya-secondary" />
            </motion.div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
              Cargando Inventario
            </h2>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-blue-500 lya:text-lya-secondary" /> Sincronizando registros...
            </p>
          </motion.div>
        ) : (
          <motion.div 
            key="main-content"
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative"
          >
            <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors">
              <div className="flex items-center space-x-4 mb-4 md:mb-0">
                <div className="bg-blue-500 dark:bg-blue-600 lya:bg-lya-secondary text-white p-3 rounded-2xl shadow-md shadow-blue-500/20 dark:shadow-blue-900/30">
                  <Boxes size={28} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight truncate transition-colors">Gestión de Almacén</h1>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1 line-clamp-2 transition-colors text-justify">Controla existencias, movimientos y valorización de 𝓛𝔂𝓪.</p>
                </div>
              </div>
              
              <div className="flex bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg p-1 rounded-2xl w-full md:w-auto shrink-0 transition-colors">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('catalog')}
                  className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm text-gray-900 dark:text-white lya:text-lya-text' : 'text-gray-500 md:hover:text-gray-700 dark:text-gray-400 dark:md:hover:text-gray-200 lya:text-lya-text/60 lya:hover:text-lya-text'}`}
                >
                  Catálogo
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveTab('kardex')}
                  className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'kardex' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm text-gray-900 dark:text-white lya:text-lya-text' : 'text-gray-500 md:hover:text-gray-700 dark:text-gray-400 dark:md:hover:text-gray-200 lya:text-lya-text/60 lya:hover:text-lya-text'}`}
                >
                  Kardex Global
                </motion.button>
              </div>
            </header>

            {/* CONTENEDOR FLEX DE VISTAS (Delega scroll a las tablas) */}
            <div className="flex-1 flex flex-col overflow-hidden relative">
              
              {/* ================== VISTA 1: CATÁLOGO ================== */}
              {activeTab === 'catalog' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="h-full flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden relative transition-colors">
                  
                  {/* OVERLAY DE CARGA LOCAL PARA CATÁLOGO (Protección táctil) */}
                  {isLoading && !isFullScreenLoader && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-sm z-30 rounded-[2rem]">
                      <Loader2 className="animate-spin text-blue-500 dark:text-blue-400 lya:text-lya-secondary" size={32} />
                    </div>
                  )}

                  <div className="p-6 shrink-0 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-900 lya:bg-lya-surface transition-colors">
                    <div className="relative w-full sm:w-80 shrink-0">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={18} />
                      <input 
                        type="text" 
                        placeholder="Buscar insumo por nombre o SKU..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/50 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 lya:focus:ring-lya-secondary/50 text-gray-800 dark:text-white lya:text-lya-text transition-all" 
                      />
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsModalOpen(true)}
                      className="w-full sm:w-auto bg-blue-600 md:hover:bg-blue-700 dark:bg-blue-600 dark:md:hover:bg-blue-500 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 md:hover:shadow-lg md:hover:-translate-y-0.5 text-white lya:text-lya-surface px-6 py-3 rounded-xl font-bold shadow-md shadow-blue-500/30 dark:shadow-blue-900/30 lya:shadow-lya-secondary/30 transition-all flex items-center justify-center space-x-2 shrink-0"
                    >
                      <PackagePlus size={20} /> <span>Añadir Insumo</span>
                    </motion.button>
                  </div>

                  {/* PILAR 1: SCROLL INTERNO PARA TABLA DE CATÁLOGO */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 lya:bg-lya-surface/95 backdrop-blur-md shadow-sm transition-colors">
                        <tr className="border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs uppercase tracking-wider font-bold">
                          <th className="p-5 text-left">SKU / Nombre</th>
                          <th className="p-5 text-center">Unidad</th>
                          <th className="p-5 text-right">Stock Actual</th>
                          <th className="p-5 text-right">Costo Promedio</th>
                          <th className="p-5 text-right">Costo Total</th>
                          <th className="p-5 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/30">
                        {!isLoading && filteredInventory.length === 0 ? (
                          <tr><td colSpan="6" className="text-center p-10 text-gray-400 lya:text-lya-text/40 font-medium">No se encontraron insumos.</td></tr>
                        ) : (
                          <AnimatePresence mode="popLayout">
                            {filteredInventory.map((item, index) => {
                              const isLowStock = parseFloat(item.currentStock) <= parseFloat(item.minimumStock);
                              return (
                                <motion.tr 
                                  key={item.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.1) }}
                                  onClick={() => setSelectedItem(item)}
                                  className="md:hover:bg-gray-50 dark:md:hover:bg-gray-800/40 lya:hover:bg-lya-bg/50 transition-colors cursor-pointer"
                                >
                                  <td className="p-5">
                                    <div className="font-bold text-base text-gray-800 dark:text-gray-100 lya:text-lya-text line-clamp-2">{item.name}</div>
                                    <div className="text-xs text-gray-400 lya:text-lya-text/50 font-mono mt-1">{item.sku || 'Sin SKU'}</div>
                                  </td>
                                  <td className="p-5">
                                    <div className="flex justify-center">
                                      <span className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-600 dark:text-gray-400 lya:text-lya-text px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider transition-colors">
                                        {item.unit}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-5 font-black text-lg text-gray-900 dark:text-white lya:text-lya-text text-right tabular-nums">
                                    {Number(item.currentStock).toFixed(2)}
                                  </td>
                                  <td className="p-5 text-right tabular-nums">
                                    <span className="text-emerald-600 dark:text-emerald-400 lya:text-lya-primary font-bold">
                                      ${Number(item.averageCost).toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-5 text-right tabular-nums">
                                    <span className="font-black text-gray-800 dark:text-gray-200 lya:text-lya-text">
                                      ${(Number(item.currentStock) * Number(item.averageCost)).toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-5 text-center">
                                    <div className="flex justify-center">
                                      {isLowStock ? (
                                        <div className="flex items-center justify-center gap-1.5 text-red-600 dark:text-red-400 lya:text-red-500 bg-red-50 dark:bg-red-900/20 lya:bg-red-500/10 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 lya:border-red-500/20 w-full max-w-[120px] transition-colors">
                                          <AlertCircle size={14} /> Bajo
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 lya:text-lya-primary bg-emerald-50 dark:bg-emerald-900/20 lya:bg-lya-primary/10 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/20 w-full max-w-[120px] transition-colors">
                                          Óptimo
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                          </AnimatePresence>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ================== VISTA 2: KARDEX GLOBAL ================== */}
              {activeTab === 'kardex' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }} className="h-full flex flex-col gap-4 lg:gap-6 overflow-hidden relative">
                  
                  {/* Controles Fijos */}
                  <div className="shrink-0 bg-white dark:bg-gray-900 lya:bg-lya-surface p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-wrap gap-4 items-center transition-colors">
                    <div className="relative shrink-0" ref={dropdownRef}>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                        className="flex items-center justify-between w-48 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text transition-colors md:hover:bg-gray-100 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-border/20"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>{filterLabels[timeFilter]}</span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${isDateMenuOpen ? 'rotate-180' : ''}`} />
                      </motion.button>

                      <AnimatePresence>
                        {isDateMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 lya:bg-lya-surface border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-2xl shadow-xl z-50 overflow-hidden transition-colors"
                          >
                            {Object.entries(filterLabels).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => {
                                  setTimeFilter(key);
                                  setIsDateMenuOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors md:hover:bg-gray-50 dark:md:hover:bg-gray-700/50 lya:hover:bg-lya-bg/50 ${timeFilter === key ? 'bg-blue-50 dark:bg-blue-500/10 lya:bg-lya-secondary/10 text-blue-600 dark:text-blue-400 lya:text-lya-secondary font-bold' : 'text-gray-700 dark:text-gray-300 lya:text-lya-text'}`}
                              >
                                {label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {timeFilter === 'custom' && (
                      <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex flex-wrap items-center gap-2 shrink-0">
                        <input type="date" value={customDates.start} onChange={e => setCustomDates({...customDates, start: e.target.value})} className="bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-blue-500/30 lya:focus:ring-lya-secondary/50 transition-colors" />
                        <span className="text-gray-400 font-bold">-</span>
                        <input type="date" value={customDates.end} onChange={e => setCustomDates({...customDates, end: e.target.value})} className="bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-blue-500/30 lya:focus:ring-lya-secondary/50 transition-colors" />
                      </motion.div>
                    )}
                  </div>

                  {/* Tarjetas KPI Slider Móvil */}
                  <div className="flex overflow-x-auto custom-scrollbar gap-4 md:gap-6 shrink-0 pb-2 snap-x">
                    <div className="min-w-[260px] md:min-w-[280px] flex-1 snap-start bg-gradient-to-br from-gray-900 to-gray-800 dark:from-white dark:to-gray-200 lya:from-lya-secondary lya:to-lya-secondary/90 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl relative overflow-hidden text-white dark:text-gray-900 lya:text-lya-surface transition-all md:hover:-translate-y-1">
                      <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10"><Wallet size={100} /></div>
                      <div className="relative z-10">
                        <p className="text-gray-300 dark:text-gray-600 lya:text-lya-surface/70 font-bold mb-2 uppercase tracking-wider text-[10px] truncate">Valor Ingresado (Periodo)</p>
                        <h3 className="text-3xl xl:text-4xl font-black truncate">${globalKpiSpent.toFixed(2)}</h3>
                      </div>
                    </div>

                    <div className="min-w-[260px] md:min-w-[280px] flex-1 snap-start bg-gradient-to-br from-rose-500 to-red-600 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-red-500/20 relative overflow-hidden text-white transition-all md:hover:-translate-y-1">
                      <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10"><TrendingUp size={100} className="rotate-180" /></div>
                      <div className="relative z-10">
                        <p className="text-red-100 font-bold mb-2 uppercase tracking-wider text-[10px] truncate">Costo Descontado (Periodo)</p>
                        <h3 className="text-3xl xl:text-4xl font-black truncate">${globalKpiOut.toFixed(2)}</h3>
                      </div>
                    </div>

                    <div className={`min-w-[260px] md:min-w-[280px] flex-1 snap-start rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl relative overflow-hidden text-white transition-all md:hover:-translate-y-1 ${isBalancePositive ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20 lya:from-lya-primary lya:to-lya-primary/80 lya:shadow-lya-primary/20' : 'bg-gradient-to-br from-orange-500 to-red-600 shadow-red-500/20'}`}>
                      <div className="absolute top-0 right-0 p-6 md:p-8 opacity-10"><Activity size={100} /></div>
                      <div className="relative z-10">
                        <p className="text-white/80 font-bold mb-2 uppercase tracking-wider text-[10px] truncate">Balance Neto (Periodo)</p>
                        <h3 className="text-3xl xl:text-4xl font-black truncate">{isBalancePositive ? '+' : '-'}${Math.abs(netBalance).toFixed(2)}</h3>
                      </div>
                    </div>

                    <div className="min-w-[260px] md:min-w-[280px] flex-1 snap-start bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 relative overflow-hidden transition-all md:hover:-translate-y-1 md:hover:shadow-md">
                      <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5"><Boxes size={100} className="text-blue-500 lya:text-lya-secondary" /></div>
                      <div className="relative z-10">
                        <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold mb-2 uppercase tracking-wider text-[10px] truncate">Valor Almacén (Actual)</p>
                        <h3 className="text-3xl xl:text-4xl font-black text-gray-900 dark:text-white lya:text-lya-text truncate">${currentTotalWarehouseValue.toFixed(2)}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Panel Kardex Table */}
                  <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 relative transition-colors">
                    
                    {/* OVERLAY DE CARGA LOCAL PARA KARDEX */}
                    {isKardexLoading && !isFullScreenLoader && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-gray-900/60 lya:bg-lya-surface/60 backdrop-blur-sm z-30 rounded-[2.5rem]">
                        <Loader2 className="animate-spin text-blue-500 dark:text-blue-400 lya:text-lya-secondary" size={32} />
                      </div>
                    )}

                    <div className="p-6 shrink-0 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 bg-white dark:bg-gray-900 lya:bg-lya-surface flex justify-between items-center transition-colors">
                      <div className="flex items-center gap-3">
                        <History className="text-gray-400 lya:text-lya-text/40" />
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white lya:text-lya-text truncate">Movimientos Globales</h3>
                      </div>
                      <motion.button 
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsTrashOpen(true)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          isTrashOpen 
                            ? 'bg-red-500 text-white shadow-md lya:bg-lya-primary lya:text-lya-surface' 
                            : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 md:hover:bg-red-100 dark:md:hover:bg-red-900/40 lya:bg-lya-primary/10 lya:text-lya-primary lya:hover:bg-lya-primary/20'
                        }`}
                      >
                        <Trash2 size={16} /> Papelera ({cancelledKardex.length})
                      </motion.button>
                    </div>
                    
                    {/* PILAR 1: SCROLL INTERNO */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 lya:bg-lya-surface/95 backdrop-blur-md shadow-sm transition-colors">
                          <tr className="border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-xs uppercase tracking-wider font-bold">
                            <th className="p-5 text-left">Fecha / Hora</th>
                            <th className="p-5 text-left">Insumo</th>
                            <th className="p-5 text-center">Tipo</th>
                            <th className="p-5 text-right">Cantidad</th>
                            <th className="p-5 text-right">Costo Unit.</th>
                            <th className="p-5 text-right">Costo Total</th>
                            <th className="p-5 text-center">Usuario</th>
                            <th className="p-5 text-left max-w-[200px]">Notas</th>
                            <th className="p-5 text-center">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/30">
                          {!isKardexLoading && activeKardex.length === 0 ? (
                            <tr><td colSpan="9" className="text-center p-10 text-gray-400 lya:text-lya-text/40 font-medium">No hay movimientos activos en este periodo.</td></tr>
                          ) : (
                            activeKardex.map((tx) => {
                              const style = getTxStyles(tx.type);
                              const auditMatch = tx.notes?.match(/\[Registrado el: (.*?)\]/);
                              const realAuditDateTime = auditMatch ? auditMatch[1] : null;
                              const displayNotes = tx.notes ? tx.notes.replace(/\[Registrado el: .*?\]\s*/, '') : '-';
                              const accountingDateObj = new Date(tx.createdAt);
                              const accountingDateStr = accountingDateObj.toLocaleDateString();
                              const accountingTimeStr = accountingDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                              return (
                                <tr key={tx.id} className="md:hover:bg-gray-50 dark:md:hover:bg-gray-800/40 lya:hover:bg-lya-bg/50 transition-colors">
                                  <td className="p-5 whitespace-nowrap">
                                    {realAuditDateTime ? (
                                      <div className="flex flex-col gap-1.5">
                                        <div className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text flex items-center gap-2">
                                          {accountingDateStr} 
                                          <span className="text-[9px] font-black text-amber-600 bg-amber-100 dark:bg-amber-900/40 lya:bg-amber-500/10 lya:text-amber-500 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-200 dark:border-amber-800/50 lya:border-amber-500/20">Diferido</span>
                                        </div>
                                        <div className="text-[11px] font-medium text-gray-400 dark:text-gray-500 lya:text-lya-text/50">
                                          Teclado: {realAuditDateTime}
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">{accountingDateStr}</div>
                                        <div className="text-xs text-gray-400 lya:text-lya-text/50 mt-0.5">{accountingTimeStr}</div>
                                      </>
                                    )}
                                  </td>

                                  <td className="p-5">
                                    <div className="font-bold text-gray-800 dark:text-white lya:text-lya-text line-clamp-2">{tx.item?.name || 'Desconocido'}</div>
                                    <div className="text-xs text-gray-400 lya:text-lya-text/50 font-mono mt-0.5">{tx.item?.sku || ''}</div>
                                  </td>
                                  <td className="p-5 text-center">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${style.classes} inline-block transition-colors`}>
                                      {style.label}
                                    </span>
                                  </td>
                                  <td className="p-5 font-black text-gray-900 dark:text-white lya:text-lya-text text-right tabular-nums">
                                    <span className={tx.type === 'IN' || tx.type === 'ADJUSTMENT' ? 'text-emerald-600 dark:text-emerald-400 lya:text-lya-primary' : 'text-red-600 dark:text-red-400 lya:text-red-500'}>
                                      {tx.type === 'IN' || tx.type === 'ADJUSTMENT' ? '+' : '-'}{Number(tx.quantity).toFixed(2)} {tx.item?.unit}
                                    </span>
                                  </td>
                                  <td className="p-5 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 text-right tabular-nums">
                                    ${Number(tx.unitCost).toFixed(2)}
                                  </td>
                                  <td className="p-5 font-bold text-right tabular-nums">
                                    <span className={tx.type === 'IN' || tx.type === 'ADJUSTMENT' ? 'text-emerald-600 dark:text-emerald-400 lya:text-lya-primary' : 'text-red-600 dark:text-red-400 lya:text-red-500'}>
                                      {tx.type === 'IN' || tx.type === 'ADJUSTMENT' ? '+' : '-'}${Number(tx.totalCost).toFixed(2)}
                                    </span>
                                  </td>
                                  <td className="p-5 text-center">
                                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 lya:text-lya-text bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg px-3 py-1 rounded-xl inline-block truncate max-w-[100px] transition-colors">
                                      {tx.user?.username || 'Sistema'}
                                    </div>
                                  </td>
                                  <td className="p-5 max-w-[200px]">
                                    {/* PILAR 4: Textos largos en justificado */}
                                    <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-justify line-clamp-3">
                                      {displayNotes || tx.reference || '-'}
                                    </p>
                                  </td>
                                  <td className="p-5 text-center">
                                    <motion.button
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => setCancelModal({ isOpen: true, txId: tx.id, reason: '' })}
                                      className="text-red-500 md:hover:bg-red-50 dark:md:hover:bg-red-900/30 lya:hover:bg-red-500/10 p-2 rounded-xl transition-colors"
                                      title="Anular Movimiento"
                                    >
                                      <Trash2 size={16} />
                                    </motion.button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALES ADICIONALES */}
      <AnimatePresence>
        {isModalOpen && (
          <NewItemModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onCreate={createItem} 
            showSuccess={(msg) => showNotification(msg, 'success')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedItem && (
          <ItemDetailsModal 
            item={selectedItem}
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            controller={controller}
            showSuccess={(msg) => showNotification(msg, 'success')}
          />
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN DE ANULACIÓN (TEMATIZADO LYA ESTRICTO) */}
      <AnimatePresence>
        {cancelModal.isOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { if (actionLoadingId !== cancelModal.txId) setCancelModal({ isOpen: false, txId: null, reason: '' })}} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[400px] flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 lya:bg-red-500/20 mx-auto rounded-full flex items-center justify-center mb-5 shadow-sm">
                <AlertTriangle size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight text-center">Anular Movimiento</h3>
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-6 leading-relaxed px-2 text-center">
                ¿Seguro que deseas anular este movimiento? El stock será devuelto o descontado de inmediato.
              </p>
              <div className="w-full mb-8">
                <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/50 tracking-widest mb-2 w-full text-center">
                  Motivo de anulación (Opcional)
                </label>
                <input type="text" placeholder="Ej. Error en la cantidad..." value={cancelModal.reason} onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })} className="w-full px-5 py-4 rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-900 dark:text-white lya:text-lya-text text-sm font-medium outline-none focus:ring-2 focus:ring-red-500/50 dark:focus:ring-red-500/40 lya:focus:ring-lya-primary/50 transition-all text-center" />
              </div>
              <div className="flex gap-3 w-full">
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => setCancelModal({ isOpen: false, txId: null, reason: '' })} disabled={actionLoadingId === cancelModal.txId} className="flex-[1] py-4 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/30 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed">Cancelar</motion.button>
                
                {/* PILAR 3: BLOQUEO ASÍNCRONO */}
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmCancel} disabled={actionLoadingId === cancelModal.txId} className="flex-[1.5] py-4 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30 dark:shadow-red-900/40 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:shadow-none disabled:text-gray-500">
                  {actionLoadingId === cancelModal.txId ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Anulando...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} strokeWidth={2.5} />
                      <span>Sí, Anular</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE PAPELERA DE KARDEX (TEMATIZADO LYA ESTRICTO) */}
      <AnimatePresence>
        {isTrashOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsTrashOpen(false)} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-3xl flex flex-col max-h-[85vh] border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 overflow-hidden transition-colors">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50 shrink-0 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 lya:bg-red-500/10 rounded-2xl text-red-500 lya:text-red-500 shadow-sm border border-red-200 dark:border-red-800/50 lya:border-red-500/20"><Trash2 size={24} /></div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 lya:text-lya-text truncate tracking-tight">Papelera de Kardex</h3>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 line-clamp-1">Los movimientos anulados hoy desaparecerán a medianoche</p>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.9 }} onClick={() => setIsTrashOpen(false)} className="p-2.5 text-gray-400 md:hover:text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:hover:text-white lya:bg-lya-bg lya:text-lya-text/40 lya:hover:text-lya-text lya:hover:bg-lya-border/30 rounded-xl transition-all"><X size={20} strokeWidth={2.5} /></motion.button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30 dark:bg-gray-950/20 lya:bg-lya-bg/30 transition-colors">
                {cancelledKardex.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface p-6 rounded-[2rem] shadow-inner mb-4 transition-colors">
                      <Trash2 size={40} className="text-gray-300 dark:text-gray-600 lya:text-lya-text/30" strokeWidth={1.5} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-bold lya:text-lya-text/60 text-lg text-center">No hay movimientos anulados hoy.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {cancelledKardex.map((tx) => (
                      <div key={tx.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[1.5rem] border border-red-100 dark:border-red-900/30 lya:border-red-500/20 opacity-80 md:hover:opacity-100 transition-opacity gap-4 sm:gap-0 shadow-sm">
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="font-bold text-sm text-gray-800 dark:text-gray-200 lya:text-lya-text truncate">{tx.item?.name}</p>
                          <div className="flex flex-col mt-1 gap-1">
                            <span className="text-xs font-medium text-gray-500 lya:text-lya-text/60 whitespace-nowrap">
                              Anulado: {new Date(tx.cancelledAt || tx.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' })}
                            </span>
                            <span className="text-[11px] font-bold text-gray-500 lya:text-lya-text/60 line-clamp-1">
                              Cant: {Number(tx.quantity).toFixed(2)} | Costo: ${Number(tx.totalCost).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        {/* PILAR 3: BLOQUEO ASÍNCRONO Y SPINNER DE ESTILO */}
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => handleRestore(tx.id)} disabled={actionLoadingId === tx.id} className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 lya:bg-emerald-500/10 lya:text-emerald-500 lya:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 shrink-0">
                          {actionLoadingId === tx.id ? <Loader2 size={14} className="animate-spin" /> : <ArchiveRestore size={14} />} 
                          <span className="hidden sm:inline">{actionLoadingId === tx.id ? 'Restaurando' : 'Restaurar'}</span>
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </>
  );
}