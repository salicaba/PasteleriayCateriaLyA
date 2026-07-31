import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackagePlus, Search, AlertCircle, Boxes, Loader2, CheckCircle2, TrendingUp, History, Calendar, Wallet, ChevronDown } from 'lucide-react';
import { useInventoryController } from '../controllers/useInventoryController';
import NewItemModal from './NewItemModal';
import ItemDetailsModal from './ItemDetailsModal';

const InventoryLoader = ({ className = "bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg" }) => (
  <div className={`h-full w-full flex flex-col items-center justify-center relative z-10 transition-colors duration-300 ${className}`}>
    <motion.div
      animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
    >
      <Boxes size={40} className="text-blue-500 dark:text-blue-400 lya:text-lya-secondary" />
    </motion.div>
    <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
      Cargando Datos
    </h2>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
      <Loader2 size={16} className="animate-spin text-blue-500 dark:text-blue-400 lya:text-lya-secondary" /> Sincronizando registros...
    </p>
  </div>
);

// Utilidad precisa para cálculo de fechas
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
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Día 0 del próximo mes = Último día del mes actual
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
    globalKardex, globalKpiSpent, isKardexLoading, fetchGlobalKardex 
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
  
  const [successMessage, setSuccessMessage] = useState('');
  const dropdownRef = useRef(null);

  const showSuccess = (msg) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000); 
  };

  // Cierra el menú desplegable al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // MOTOR DE CARGA INTELIGENTE (Kardex Global)
  useEffect(() => {
    if (activeTab === 'kardex') {
      if (timeFilter === 'custom') {
        // Solo carga si ambas fechas están seleccionadas
        if (customDates.start && customDates.end) {
          fetchGlobalKardex(customDates.start, customDates.end);
        }
      } else {
        const { startDate, endDate } = getDates(timeFilter);
        fetchGlobalKardex(startDate, endDate);
      }
    }
  }, [activeTab, timeFilter, customDates.start, customDates.end, fetchGlobalKardex]);

  // 🔥 AQUÍ ESTÁ LA MAGIA: Si el catálogo O el kardex están cargando, mostramos la pantalla completa
  if (isLoading || isKardexLoading) return <InventoryLoader />;

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const currentTotalWarehouseValue = inventory.reduce((total, item) => {
    return total + (parseFloat(item.currentStock) * parseFloat(item.averageCost));
  }, 0);

  const getTxStyles = (type) => {
    const styles = {
      IN: { label: 'Entrada', classes: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
      OUT: { label: 'Salida', classes: 'text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800' },
      CONSUMPTION: { label: 'Consumo', classes: 'text-purple-700 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800' },
      WASTE: { label: 'Merma', classes: 'text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800' },
      ADJUSTMENT: { label: 'Ajuste', classes: 'text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    };
    return styles[type] || { label: type, classes: 'text-gray-700 bg-gray-100 border-gray-200' };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
      <header className="flex flex-col gap-4 mb-6 shrink-0 z-10 relative">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors duration-300">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <div className="bg-blue-500 dark:bg-blue-600 lya:bg-lya-secondary text-white p-3 rounded-2xl shadow-md shadow-blue-500/20 dark:shadow-blue-900/30">
              <Boxes size={28} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Gestión de Almacén</h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Controla existencias, movimientos y valorización</p>
            </div>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg p-1 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => setActiveTab('catalog')}
              className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 md:hover:text-gray-200'}`}
            >
              Catálogo
            </button>
            <button
              onClick={() => setActiveTab('kardex')}
              className={`flex-1 md:flex-none px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${activeTab === 'kardex' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 md:hover:text-gray-200'}`}
            >
              Kardex Global
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar rounded-[2rem] flex flex-col gap-6 pb-20">
        
        {/* VISTA 1: CATÁLOGO */}
        {activeTab === 'catalog' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-900">
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar insumo por nombre o SKU..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-800 dark:text-white transition-all" 
                />
              </div>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsModalOpen(true)}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 md:hover:shadow-lg md:hover:-translate-y-0.5 text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-blue-500/30 transition-all flex items-center justify-center space-x-2"
              >
                <PackagePlus size={20} /> <span>Añadir Insumo</span>
              </motion.button>
            </div>

            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 dark:bg-gray-950/50 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                    <th className="p-5">SKU / Nombre</th>
                    <th className="p-5">Unidad</th>
                    <th className="p-5">Stock Actual</th>
                    <th className="p-5">Costo Promedio</th>
                    <th className="p-5">Costo Total</th>
                    <th className="p-5 text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredInventory.length === 0 ? (
                    <tr><td colSpan="6" className="text-center p-10 text-gray-400 font-medium">No se encontraron insumos.</td></tr>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {filteredInventory.map((item, index) => {
                        const isLowStock = parseFloat(item.currentStock) <= parseFloat(item.minimumStock);
                        return (
                          <motion.tr 
                            key={item.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.1) }}
                            onClick={() => setSelectedItem(item)}
                            className="md:hover:bg-gray-50 dark:md:hover:bg-gray-800/40 transition-colors cursor-pointer"
                          >
                            <td className="p-5">
                              <div className="font-bold text-base text-gray-800 dark:text-gray-100">{item.name}</div>
                              <div className="text-xs text-gray-400 font-mono mt-1">{item.sku || 'Sin SKU'}</div>
                            </td>
                            <td className="p-5">
                              <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                {item.unit}
                              </span>
                            </td>
                            <td className="p-5 font-black text-lg text-gray-900 dark:text-white">
                              {Number(item.currentStock).toFixed(2)}
                            </td>
                            <td className="p-5">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                ${Number(item.averageCost).toFixed(2)}
                              </span>
                            </td>
                            <td className="p-5">
                              <span className="font-black text-gray-800 dark:text-gray-200">
                                ${(Number(item.currentStock) * Number(item.averageCost)).toFixed(2)}
                              </span>
                            </td>
                            <td className="p-5 text-center">
                              <div className="flex justify-center">
                                {isLowStock ? (
                                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30">
                                    <AlertCircle size={14} /> Bajo Stock
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30">
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

        {/* VISTA 2: KARDEX GLOBAL */}
        {activeTab === 'kardex' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col gap-6">
            
            {/* Controles de Filtro con Menú Desplegable (SIEMPRE VISIBLES) */}
            <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-4 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 flex flex-wrap gap-4 items-center">
              
              <div className="relative" ref={dropdownRef}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsDateMenuOpen(!isDateMenuOpen)}
                  className="flex items-center justify-between w-48 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-gray-200 transition-colors md:hover:bg-gray-100 dark:md:hover:bg-gray-700"
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
                      className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-[#1f2937] border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl z-50 overflow-hidden"
                    >
                      {Object.entries(filterLabels).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setTimeFilter(key);
                            setIsDateMenuOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-medium transition-colors md:hover:bg-gray-50 dark:md:hover:bg-gray-700 ${timeFilter === key ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-700 dark:text-gray-300'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {timeFilter === 'custom' && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                  <input type="date" value={customDates.start} onChange={e => setCustomDates({...customDates, start: e.target.value})} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" />
                  <span className="text-gray-400 font-bold">-</span>
                  <input type="date" value={customDates.end} onChange={e => setCustomDates({...customDates, end: e.target.value})} className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" />
                </motion.div>
              )}
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-white dark:to-gray-200 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-white dark:text-gray-900">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Wallet size={120} /></div>
                <div className="relative z-10">
                  <p className="text-gray-300 dark:text-gray-600 font-bold mb-2">Gasto en Insumos (Periodo)</p>
                  <h3 className="text-4xl lg:text-5xl font-black truncate">${globalKpiSpent.toFixed(2)}</h3>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={120} className="text-blue-500" /></div>
                <div className="relative z-10">
                  <p className="text-gray-500 dark:text-gray-400 font-bold mb-2">Costo Total Valorizado (Almacén Actual)</p>
                  <h3 className="text-4xl lg:text-5xl font-black text-gray-900 dark:text-white truncate">${currentTotalWarehouseValue.toFixed(2)}</h3>
                </div>
              </div>
            </div>

            {/* Tabla del Kardex */}
            <div className="flex-1 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 flex items-center gap-3">
                <History className="text-gray-400" />
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Movimientos Globales</h3>
              </div>
              
              <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-sm">
                    <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider font-bold">
                      <th className="p-5">Fecha / Hora</th>
                      <th className="p-5">Insumo</th>
                      <th className="p-5">Tipo</th>
                      <th className="p-5">Cantidad</th>
                      <th className="p-5">Costo Unit.</th>
                      <th className="p-5">Costo Total</th>
                      <th className="p-5">Usuario</th>
                      <th className="p-5 max-w-[200px]">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {globalKardex.length === 0 ? (
                      <tr><td colSpan="8" className="text-center p-10 text-gray-400 font-medium">No hay movimientos en este periodo.</td></tr>
                    ) : (
                      globalKardex.map((tx) => {
                        const style = getTxStyles(tx.type);
                        return (
                          <tr key={tx.id} className="md:hover:bg-gray-50 dark:md:hover:bg-gray-800/40 transition-colors">
                            <td className="p-5 whitespace-nowrap">
                              <div className="font-bold text-gray-800 dark:text-gray-200">{new Date(tx.createdAt).toLocaleDateString()}</div>
                              <div className="text-xs text-gray-400">{new Date(tx.createdAt).toLocaleTimeString()}</div>
                            </td>
                            <td className="p-5">
                              <div className="font-bold text-gray-800 dark:text-white line-clamp-2">{tx.InventoryItem?.name || 'Desconocido'}</div>
                              <div className="text-xs text-gray-400 font-mono mt-0.5">{tx.InventoryItem?.sku || ''}</div>
                            </td>
                            <td className="p-5">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${style.classes}`}>
                                {style.label}
                              </span>
                            </td>
                            <td className="p-5 font-black text-gray-900 dark:text-white">
                              {tx.type === 'IN' || tx.type === 'ADJUSTMENT' ? '+' : '-'}{Number(tx.quantity).toFixed(2)} {tx.InventoryItem?.unit}
                            </td>
                            <td className="p-5 text-gray-600 dark:text-gray-400">
                              ${Number(tx.unitCost).toFixed(2)}
                            </td>
                            <td className="p-5 font-bold text-gray-800 dark:text-gray-200">
                              ${Number(tx.totalCost).toFixed(2)}
                            </td>
                            <td className="p-5">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-xl inline-block">
                                {tx.user?.username || 'Sistema'}
                              </div>
                            </td>
                            <td className="p-5 max-w-[200px]">
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-justify line-clamp-2">
                                {tx.notes || tx.reference || '-'}
                              </p>
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

      {/* MODALES Y NOTIFICACIONES */}
      <AnimatePresence>
        {isModalOpen && (
          <NewItemModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onCreate={createItem} 
            showSuccess={showSuccess}
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
            showSuccess={showSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(successMessage || successScreen?.isOpen) && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 pointer-events-auto"
            >
              <div className="bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 p-1.5 rounded-full shrink-0">
                <CheckCircle2 size={20} className="text-emerald-500 lya:text-lya-primary" />
              </div>
              <div className="flex flex-col">
                  <span className="text-sm text-center">{successMessage || successScreen?.title || 'Acción exitosa'}</span>
                  {successScreen?.subtitle && <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 leading-none mt-0.5 text-center">{successScreen.subtitle}</span>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}