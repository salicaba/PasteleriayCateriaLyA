// src/modules/cafeteria/views/MesasPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Grid, ShoppingBag, CheckCircle, Trash2, X, Plus, Store, Loader2, RotateCcw, Zap, Banknote, CreditCard, ArrowRightLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../../api/client';
import { socket } from '../../../api/socket'; 

import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal';
import { NuevoPedidoLlevarModal } from './NuevoPedidoLlevarModal';

const StatCard = ({ title, value, icon: Icon, borderClass, iconColors, onClick, isActive }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl p-4 sm:p-5 shadow-sm border-l-4 flex justify-between items-center cursor-pointer transition-all active:scale-95 hover:shadow-md ${borderClass} ${isActive ? 'ring-1 ring-gray-200 dark:ring-gray-700 lya:ring-lya-border/50 shadow-md opacity-100 scale-[1.02]' : 'opacity-70 hover:opacity-100'}`}
  >
    <div>
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 lya:text-lya-text/60 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text">{value}</h3>
    </div>
    <div className={`p-2 sm:p-3 rounded-xl bg-opacity-10 dark:bg-opacity-20 lya:bg-opacity-20 ${iconColors.bg}`}>
      <Icon size={24} className={iconColors.text} />
    </div>
  </div>
);

export const MesasPage = () => {
  const { 
    mesasSalon, mesasLlevar, isLoading, 
    handleLiberarMesa, handleUpdateTotal, handleUnirMesas, handlePagoParcial,
    nuevoPedidoVitrina, nuevoPedidoLlevar, handleRestoreOrder, handleRestoreItem,
    handleCancelOrder
  } = useMesasController();

  const [selectedMesa, setSelectedMesa] = useState(null);
  const [showLlevarModal, setShowLlevarModal] = useState(false);
  const [activeTab, setActiveTab] = useState('salon'); 
  
  const [orderToCancel, setOrderToCancel] = useState(null);
  const [isCanceling, setIsCanceling] = useState(false);

  // 🔥 ESTADOS PARA BLOQUEAR LOS BOTONES MIENTRAS CARGAN
  const [isCreatingMostrador, setIsCreatingMostrador] = useState(false);
  const [restoringOrderId, setRestoringOrderId] = useState(null);
  const [restoringItemId, setRestoringItemId] = useState(null);

  // 🔥 ESTADOS PARA LA NOTIFICACIÓN TOAST UNIVERSAL
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [dailySummary, setDailySummary] = useState({
    vendidosCount: 0, papeleraCount: 0, vendidosOrders: [], cancelledOrders: [], cancelledItems: [], transactions: []
  });
  const [showPapelera, setShowPapelera] = useState(false);
  const [showVendidos, setShowVendidos] = useState(false);

  const wasActiveRef = useRef(false);

  const fetchSummary = async () => {
    try {
      const res = await client.get('/pos/orders/daily-summary');
      setDailySummary(res.data);
    } catch (error) {
      console.error("Error cargando el resumen del día:", error);
    }
  };

  useEffect(() => {
    fetchSummary();
    socket.on('pos:update', fetchSummary);
    return () => { socket.off('pos:update', fetchSummary); };
  }, []);

  const activeOrderIds = [...mesasSalon, ...mesasLlevar].map(m => m.orderId || m.id).filter(Boolean);

  useEffect(() => {
    if (selectedMesa && !isLoading) {
      const currentId = selectedMesa.orderId || selectedMesa.id;
      const isActive = activeOrderIds.includes(currentId);
      
      if (isActive) {
        wasActiveRef.current = true;
      } else if (wasActiveRef.current && !isActive) {
        setSelectedMesa(null);
      }
    } else {
      wasActiveRef.current = false;
    }
  }, [activeOrderIds, selectedMesa, isLoading]);

  const ingresosTotales = dailySummary.transactions?.filter(t => t.type === 'INCOME') || [];

  // 🔥 FUNCIONES ASÍNCRONAS REPARADAS (Refrescan el resumen automáticamente)
  const onRestoreOrder = async (orderId) => {
    setRestoringOrderId(orderId);
    try {
      await handleRestoreOrder(orderId);
      await fetchSummary(); // <-- ¡ESTO ERA LO QUE FALTABA PARA LIMPIAR LA PAPELERA!
      showToast('Cuenta restaurada con éxito');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error al restaurar la cuenta', 'error');
    } finally {
      setRestoringOrderId(null);
    }
  };

  const onRestoreItem = async (orderId, itemId) => {
    setRestoringItemId(itemId);
    try {
      await handleRestoreItem(orderId, itemId);
      await fetchSummary(); // <-- ¡ESTO TAMBIÉN!
      showToast('Producto restaurado con éxito');
    } catch (error) {
      showToast(error.response?.data?.message || 'Error al restaurar producto', 'error');
    } finally {
      setRestoringItemId(null);
    }
  };

  const handleCreateMostrador = async () => {
    setIsCreatingMostrador(true);
    try {
      const mesaVitrina = await nuevoPedidoVitrina();
      if(mesaVitrina) {
        setSelectedMesa(mesaVitrina);
        showToast('Pedido de mostrador abierto');
      }
    } finally {
      setIsCreatingMostrador(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
        >
          <Store size={40} className="text-orange-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Punto de Venta
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> Sincronizando datos...
        </p>
      </div>
    );
  }

  const mesasOcupadas = mesasSalon.filter(m => m.estado === 'ocupada').length;

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8 transition-colors duration-300">
      
      <div>
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2rem] p-6 md:p-8 mb-8 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-colors duration-300">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 lya:bg-lya-primary/20 text-orange-500 lya:text-lya-primary rounded-2xl flex-shrink-0">
              <Store size={32} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
                Punto de Venta
              </h1>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                Gestión operativa de comandas y pedidos.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setActiveTab('salon')} 
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border ${
                activeTab === 'salon' 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md lya:bg-lya-primary lya:border-lya-primary lya:shadow-lya-primary/30' 
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-100 dark:border-orange-900/30 lya:bg-lya-primary/10 lya:text-lya-primary lya:border-lya-primary/20 lya:hover:bg-lya-primary/20'
              }`}
            >
              <Grid size={18} /> Mesas
            </button>
            
            <button 
              onClick={() => setActiveTab('llevar')} 
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border ${
                activeTab === 'llevar'
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md lya:bg-lya-secondary lya:border-lya-secondary lya:shadow-lya-secondary/30'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/30 lya:bg-lya-secondary/10 lya:text-lya-secondary lya:border-lya-secondary/20 lya:hover:bg-lya-secondary/20'
              }`}
            >
              <ShoppingBag size={18} /> Llevar
            </button>
            
            <button 
              onClick={handleCreateMostrador}
              disabled={isCreatingMostrador}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] ${
                isCreatingMostrador 
                  ? 'bg-amber-400/70 text-amber-950/70 cursor-not-allowed' 
                  : 'bg-amber-400 hover:bg-amber-500 text-amber-950 active:scale-95'
              }`}
            >
              {isCreatingMostrador ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} Mostrador
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard 
            title="Mesas Ocupadas" 
            value={`${mesasOcupadas} / ${mesasSalon.length}`} 
            icon={Grid} 
            borderClass="border-orange-500 lya:border-orange-400 lya:border-lya-primary" 
            iconColors={{ bg: "bg-orange-500 lya:bg-lya-primary", text: "text-orange-500 lya:text-lya-primary" }} 
            onClick={() => { setActiveTab('salon'); setShowVendidos(false); setShowPapelera(false); }}
            isActive={activeTab === 'salon' && !showVendidos && !showPapelera}
          />
          <StatCard 
            title="Para Llevar" 
            value={mesasLlevar.length} 
            icon={ShoppingBag} 
            borderClass="border-blue-500 lya:border-blue-400 lya:border-lya-secondary" 
            iconColors={{ bg: "bg-blue-500 lya:bg-lya-secondary", text: "text-blue-500 lya:text-lya-secondary" }} 
            onClick={() => { setActiveTab('llevar'); setShowVendidos(false); setShowPapelera(false); }}
            isActive={activeTab === 'llevar' && !showVendidos && !showPapelera}
          />
          <StatCard 
            title="Vendidos Hoy" 
            value={ingresosTotales.length} 
            icon={CheckCircle} 
            borderClass="border-[#24d366] lya:border-[#24d366]" 
            iconColors={{ bg: "bg-[#24d366]", text: "text-[#24d366]" }} 
            onClick={() => { setShowVendidos(true); setShowPapelera(false); }}
            isActive={showVendidos}
          />
          <StatCard 
            title="Cancelados Hoy" 
            value={dailySummary.papeleraCount} 
            icon={Trash2} 
            borderClass="border-red-500 lya:border-red-400" 
            iconColors={{ bg: "bg-red-500", text: "text-red-500" }} 
            onClick={() => { setShowPapelera(true); setShowVendidos(false); }}
            isActive={showPapelera}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'salon' && (
          <motion.div key="salon-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <Grid className="text-gray-400" size={20} />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Mesas del Salón</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {mesasSalon.map(mesa => (
                <MesaCard key={mesa.id} mesa={mesa} onClick={() => setSelectedMesa(mesa)} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'llevar' && (
          <motion.div key="llevar-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-2 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="text-gray-400" size={20} />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Pedidos Para Llevar</h3>
              </div>
              <button 
                onClick={() => setShowLlevarModal(true)}
                className="flex items-center gap-1.5 bg-gray-900 dark:bg-white lya:bg-lya-secondary text-white dark:text-gray-900 lya:text-lya-surface px-4 py-2 rounded-xl text-xs font-bold uppercase active:scale-95 transition-transform shadow-sm hover:shadow-md"
              >
                <Plus size={14} /> Nuevo Pedido
              </button>
            </div>

            {mesasLlevar.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2rem] p-8 flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={48} className="mb-3 opacity-50" strokeWidth={1.5} />
                <p className="text-sm font-medium">No hay pedidos activos para llevar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mesasLlevar.map(pedido => (
                  <MesaCard 
                    key={pedido.id} 
                    mesa={pedido} 
                    onClick={() => setSelectedMesa(pedido)} 
                    onCancel={() => setOrderToCancel(pedido)} 
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' && createPortal(
        <>
          {showLlevarModal && (
            <NuevoPedidoLlevarModal 
              isOpen={showLlevarModal}
              onClose={() => setShowLlevarModal(false)} 
              onSubmit={async (param1, param2) => {
                let nombre = 'Cliente';
                let tel = '';
                if (typeof param1 === 'object' && param1 !== null) {
                  nombre = param1.nombreCliente || param1.nombre || 'Cliente';
                  tel = param1.telefono || param1.tel || '';
                } else {
                  nombre = param1 || 'Cliente';
                  tel = param2 || '';
                }
                const nuevaMesa = await nuevoPedidoLlevar(nombre, tel);
                if(nuevaMesa) {
                  setSelectedMesa(nuevaMesa); 
                  showToast('Pedido para llevar creado');
                }
                setShowLlevarModal(false);
              }} 
            />
          )}

          {selectedMesa && (
            <PosModal 
              isOpen={!!selectedMesa} 
              onClose={() => setSelectedMesa(null)} 
              mesa={selectedMesa} 
              todasLasMesas={mesasSalon}
              onTableRelease={handleLiberarMesa} 
              onUpdateTotal={handleUpdateTotal} 
              onUnirMesas={handleUnirMesas} 
              onPagoParcial={handlePagoParcial}
              showToast={showToast} // 🔥 Pasamos el Toast al Modal
            />
          )}

          <AnimatePresence>
            {orderToCancel && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => !isCanceling && setOrderToCancel(null)} 
                  className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" 
                />
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }} 
                  animate={{ scale: 1, opacity: 1, y: 0 }} 
                  exit={{ scale: 0.95, opacity: 0, y: 20 }} 
                  className="relative z-10 w-full max-w-sm bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 p-8 text-center flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 lya:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-5 shadow-sm">
                    {isCanceling ? (
                      <Loader2 size={32} className="animate-spin" />
                    ) : (
                      <Trash2 size={32} strokeWidth={1.5} />
                    )}
                  </div>
                  
                  <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight mb-3">
                    {isCanceling ? 'Eliminando...' : '¿Eliminar Pedido?'}
                  </h3>
                  
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed">
                    Estás a punto de cancelar y enviar a la papelera el pedido <span className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">{orderToCancel.numero}</span>.
                  </p>
                  
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => setOrderToCancel(null)}
                      disabled={isCanceling}
                      className={`flex-1 px-4 py-3.5 rounded-2xl font-bold text-sm bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-600 dark:text-gray-300 lya:text-lya-text transition-colors ${isCanceling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95'}`}
                    >
                      Cancelar
                    </button>
                    <button 
                      disabled={isCanceling}
                      onClick={async () => {
                        setIsCanceling(true); 
                        try {
                          await handleCancelOrder(orderToCancel.orderId, 'Pedido para llevar descartado');
                          await fetchSummary(); // 🔥 Refrescamos la UI
                          showToast('Pedido cancelado correctamente');
                        } catch (error) {
                          showToast(error.response?.data?.message || 'Error al cancelar', 'error');
                        } finally {
                          setIsCanceling(false); 
                          setOrderToCancel(null); 
                        }
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg shadow-red-500/30 transition-all ${isCanceling ? 'bg-red-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 active:scale-95'}`}
                    >
                      {isCanceling ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Espera...</span>
                        </>
                      ) : (
                        'Sí, Eliminar'
                      )}
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showPapelera && (
              <div className="fixed inset-0 z-[9990] flex justify-end overflow-hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPapelera(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-2xl flex flex-col">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0">
                    <div className="flex items-center gap-3 text-red-500">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl"><Trash2 size={24} /></div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">Papelera Hoy</h2>
                    </div>
                    <button onClick={() => setShowPapelera(false)} className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
                    
                    {dailySummary.cancelledOrders.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Cuentas Canceladas</h3>
                        <div className="space-y-3">
                          {dailySummary.cancelledOrders.map(order => {
                            const nombreCuenta = order.cuenta || order.customerName || order.name || 'Cuenta General';
                            const numMesa = order.table?.numero || order.table?.number || '?';
                            
                            const esMesaCompleta = order.cancelReason?.includes('Mesa Completa');

                            let tituloPrincipal = order.ticketId ? order.ticketId : `Mesa #${numMesa}`;
                            let textoInsignia = esMesaCompleta ? 'MESA COMPLETA' : `CUENTA: ${nombreCuenta}`;

                            if (tituloPrincipal.toUpperCase().includes('MOSTRADOR')) {
                              const partesTicket = tituloPrincipal.split(' ');
                              tituloPrincipal = `Mostrador`;
                              textoInsignia = `Folio: ${partesTicket[1] || 'Express'}`;
                            } else if (order.ticketId && order.ticketId.includes(' - ')) {
                              const partesTicket = order.ticketId.split(' - ');
                              tituloPrincipal = partesTicket[0]; 
                              
                              if (partesTicket.length > 1) {
                                const nombreCliente = partesTicket[1];
                                const telefonoCliente = partesTicket[2];
                                textoInsignia = `CUENTA: ${nombreCliente}${telefonoCliente ? ` | CEL: ${telefonoCliente}` : ''}`;
                              }
                            }

                            let cuentasInvolucradas = '';
                            if (esMesaCompleta && order.cancelReason) {
                              const match = order.cancelReason.match(/\(Cuentas:\s*(.*?)\)/);
                              if (match && match[1]) {
                                cuentasInvolucradas = match[1];
                              }
                            }

                            let motivoLimpio = order.cancelReason || 'Sin especificar';
                            if (motivoLimpio.includes(' - Motivo: ')) {
                              motivoLimpio = motivoLimpio.split(' - Motivo: ')[1] || 'Cancelación desde POS';
                            } else if (motivoLimpio.includes(' - Se vaciaron los productos')) {
                              motivoLimpio = 'Se vaciaron los productos automáticamente';
                            } else if (motivoLimpio === 'Pedido para llevar descartado') {
                              motivoLimpio = 'Cancelado desde POS';
                            }

                            return (
                            <div key={order.id} className="p-4 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 rounded-2xl transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-black text-gray-900 dark:text-white lya:text-lya-text text-base">
                                  {tituloPrincipal}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded uppercase">Anulada</span>
                                  <button 
                                    onClick={() => onRestoreOrder(order.id)} 
                                    disabled={restoringOrderId === order.id}
                                    className={`px-2 py-1.5 rounded-lg shadow-sm border transition-all flex items-center gap-1.5 ${
                                      restoringOrderId === order.id 
                                        ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-400 border-orange-200 dark:border-orange-800/50 opacity-70 cursor-wait' 
                                        : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-95'
                                    }`} 
                                    title="Restaurar Cuenta Completa"
                                  >
                                    {restoringOrderId === order.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} 
                                    <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                      {restoringOrderId === order.id ? 'Restaurando...' : 'Restaurar'}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              <div className="mb-2">
                                <div className="inline-flex flex-col bg-white dark:bg-gray-800 lya:bg-lya-bg border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 px-2.5 py-1.5 rounded-lg shadow-sm">
                                  <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {textoInsignia}
                                  </span>
                                  
                                  {esMesaCompleta && cuentasInvolucradas && (
                                    <span className="text-[9px] font-bold mt-1.5 pt-1 border-t border-red-100 dark:border-red-900/50 opacity-90 leading-none">
                                      Cuentas: {cuentasInvolucradas}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-[11px] text-gray-500 leading-snug">Motivo: {motivoLimpio}</p>
                              
                              <div className="flex items-center gap-2 mt-3">
                                <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                  🕒 {new Date(order.cancelledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                </span>
                              </div>

                            </div>
                          )})}
                        </div>
                      </div>
                    )}

                    {dailySummary.cancelledItems.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Productos Cancelados</h3>
                        <div className="space-y-3">
                          {dailySummary.cancelledItems.map(item => {
                            const ordenRef = item.parentOrder || [...mesasSalon, ...mesasLlevar, selectedMesa, ...dailySummary.vendidosOrders, ...dailySummary.cancelledOrders]
                                .filter(Boolean)
                                .find(o => (o.orderId || o.id) === item.orderId);

                            const canRestore = ordenRef && ordenRef.status !== 'CANCELLED' && ordenRef.status !== 'CLOSED';

                            let nombreOrigen = 'Origen Desconocido';
                            let orderTypeContext = 'SALON'; 
                            let cuentaMostrar = item.cuenta || 'General';

                            if (ordenRef) {
                                const ticketId = ordenRef.ticketId || '';
                                
                                if (ticketId.toUpperCase().includes('MOSTRADOR')) {
                                    orderTypeContext = 'MOSTRADOR';
                                    const partes = ticketId.split(' ');
                                    nombreOrigen = `Mostrador`;
                                    cuentaMostrar = `Folio: ${partes[1] || 'Express'}`;
                                } else if (ticketId.includes(' - ')) {
                                    orderTypeContext = 'LLEVAR';
                                    const partes = ticketId.split(' - ');
                                    nombreOrigen = partes[0]; 
                                    
                                    if (partes.length > 1 && cuentaMostrar === 'General') {
                                        cuentaMostrar = partes[1]; 
                                    }
                                } else if (ticketId.toUpperCase().includes('LLEVAR')) {
                                    orderTypeContext = 'LLEVAR';
                                    nombreOrigen = ticketId;
                                    if (cuentaMostrar === 'General') {
                                        cuentaMostrar = ordenRef.nombreCliente || ordenRef.customerName || ordenRef.name || 'General';
                                    }
                                } else {
                                    orderTypeContext = 'SALON';
                                    nombreOrigen = `Mesa #${ordenRef.table?.numero || ordenRef.table?.number || ordenRef.numero || '?'}`;
                                    if (cuentaMostrar === 'General') {
                                       cuentaMostrar = 'Cuenta General';
                                    }
                                }
                            }

                            let textoCerrado = 'Mesa Cerrada';
                            if (orderTypeContext === 'LLEVAR') textoCerrado = 'Pedido Cerrado';
                            if (orderTypeContext === 'MOSTRADOR') textoCerrado = 'Ticket Cerrado';

                            let motivoLimpioItem = item.cancelReason || 'Sin especificar';
                            if (motivoLimpioItem.includes(' - Motivo: ')) {
                              motivoLimpioItem = motivoLimpioItem.split(' - Motivo: ')[1] || 'Cancelación desde POS';
                            } else if (motivoLimpioItem.includes(' - Se vaciaron los productos')) {
                              motivoLimpioItem = 'Se vaciaron los productos automáticamente';
                            } else if (motivoLimpioItem === 'Pedido para llevar descartado') {
                              motivoLimpioItem = 'Cancelado desde POS';
                            }

                            return (
                            <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-bg rounded-2xl flex items-center justify-between opacity-90 transition-opacity">
                              <div className="flex-1 pr-3">
                                <p className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text text-sm"><span className="text-red-500">{item.quantity}x</span> {item.product?.name}</p>
                                
                                <div className="mt-1.5 mb-1 inline-flex items-center bg-gray-100 dark:bg-gray-700/50 lya:bg-lya-surface rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30">
                                  <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{nombreOrigen}</span>
                                  <span className="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
                                  <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                    {orderTypeContext === 'MOSTRADOR' ? cuentaMostrar : `Cta: ${cuentaMostrar}`}
                                  </span>
                                </div>
                                
                                <p className="text-[11px] text-gray-500 leading-snug mt-1">Motivo: {motivoLimpioItem}</p>

                                <div className="flex items-center gap-2 mt-2">
                                  <span className="bg-gray-100 dark:bg-gray-700/50 lya:bg-lya-surface text-gray-500 dark:text-gray-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                    🕒 {new Date(item.cancelledAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                </div>

                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="text-sm font-black text-gray-400 line-through">${Number(item.subtotal).toFixed(2)}</span>
                                {canRestore ? (
                                    <button 
                                        onClick={() => onRestoreItem(item.orderId, item.id)} 
                                        disabled={restoringItemId === item.id}
                                        className={`px-2 py-1.5 rounded-xl border shadow-sm transition-all flex items-center gap-1.5 ${
                                          restoringItemId === item.id 
                                            ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-400 border-orange-200 dark:border-orange-800/50 opacity-70 cursor-wait' 
                                            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-95'
                                        }`} 
                                        title="Restaurar Producto a la Orden Original"
                                    >
                                        {restoringItemId === item.id ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} 
                                        <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                          {restoringItemId === item.id ? 'Restaurando...' : 'Restaurar'}
                                        </span>
                                    </button>
                                ) : (
                                    <span 
                                        className="text-[9px] font-black text-gray-400 uppercase bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface px-2 py-1 rounded-md" 
                                        title="No se puede restaurar porque la cuenta/mesa ya fue cerrada o finalizada."
                                    >
                                        {textoCerrado}
                                    </span>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      </div>
                    )}

                    {dailySummary.cancelledOrders.length === 0 && dailySummary.cancelledItems.length === 0 && (
                      <div className="text-center text-gray-400 mt-10">
                        <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">Día limpio</p>
                        <p className="text-xs">No hay cancelaciones el día de hoy.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {showVendidos && (
              <div className="fixed inset-0 z-[9990] flex justify-end overflow-hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVendidos(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-2xl flex flex-col">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0">
                    <div className="flex items-center gap-3 text-[#24d366]">
                      <div className="p-2 bg-[#24d366]/10 rounded-xl"><CheckCircle size={24} /></div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">Flujo de Caja Hoy</h2>
                    </div>
                    <button onClick={() => setShowVendidos(false)} className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar pb-10">
                    
                    {ingresosTotales.length > 0 ? (
                      ingresosTotales.map(tx => {
                        const esReembolso = Number(tx.amount) < 0;
                        return (
                        <div key={tx.id} className={`p-4 border rounded-2xl flex justify-between items-start group transition-colors shadow-sm ${esReembolso ? 'border-red-100 dark:border-red-900/30 lya:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 lya:bg-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-green-100 dark:border-green-900/30 lya:border-emerald-900/50 bg-green-50/50 dark:bg-green-900/10 lya:bg-emerald-900/10 hover:bg-green-50 dark:hover:bg-green-900/20'}`}>
                          <div className="flex gap-3 w-full pr-3">
                            <div className={`p-2.5 rounded-xl shadow-sm shrink-0 h-10 w-10 flex items-center justify-center border ${esReembolso ? 'bg-white dark:bg-gray-800 lya:bg-lya-bg text-red-500 border-red-100 dark:border-red-900/50 lya:border-red-900/50' : 'bg-white dark:bg-gray-800 lya:bg-lya-bg text-[#24d366] border-green-100 dark:border-green-900/50 lya:border-emerald-900/50'}`}>
                              {esReembolso ? <RotateCcw size={20} /> : tx.paymentMethod === 'CASH' ? <Banknote size={20} /> : tx.paymentMethod === 'CARD' ? <CreditCard size={20} /> : <ArrowRightLeft size={20} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`font-black mb-0.5 text-sm tracking-tight ${esReembolso ? 'text-red-600 dark:text-red-400 lya:text-red-400' : 'text-gray-900 dark:text-white lya:text-lya-text'}`}>
                                {tx.folio || (esReembolso ? 'Reembolso' : 'Cobro Exitoso')}
                              </p>
                              
                              {(() => {
                                const partes = (tx.description || '').split(' | ');
                                const descOriginal = partes[0];
                                const modificaciones = partes.slice(1);
                                
                                return (
                                  <div className="flex flex-col gap-1 mb-1">
                                    <p className="text-[10px] text-gray-500 font-medium leading-snug">
                                      {descOriginal}
                                    </p>
                                    {modificaciones.length > 0 && (
                                      <div className="flex flex-col gap-1 mt-0.5">
                                        {modificaciones.map((mod, i) => {
                                          const isRestaurado = mod.includes('📈');
                                          return (
                                            <span key={i} className={`text-[9px] font-black px-2 py-0.5 rounded-md border w-fit flex items-center shadow-sm ${
                                              isRestaurado 
                                                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50' 
                                                : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                                            }`}>
                                              {mod}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              <div className="flex items-center gap-2 mt-1.5">
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${esReembolso ? 'text-red-500 bg-red-500/10' : 'text-[#24d366] bg-[#24d366]/10'}`}>
                                  {esReembolso ? 'Cancelación' : (tx.paymentMethod === 'CASH' ? 'Efectivo' : tx.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia')}
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold">
                                  {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className={`text-lg font-black shrink-0 ${esReembolso ? 'text-red-500' : 'text-[#24d366]'}`}>
                            {esReembolso ? `-$${Math.abs(tx.amount).toFixed(2)}` : `+$${Number(tx.amount).toFixed(2)}`}
                          </span>
                        </div>
                      )})
                    ) : (
                      <div className="text-center text-gray-400 mt-10">
                        <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">Aún no hay ventas</p>
                        <p className="text-xs">Los cobros y reembolsos aparecerán aquí detallados.</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* NOTIFICACIÓN FLOTANTE PERSONALIZADA (TOAST CENTRADO ARRIBA) */}
          <AnimatePresence>
            {toastMessage && (
              <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
                <motion.div 
                  initial={{ opacity: 0, y: -50, scale: 0.9 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 pointer-events-auto"
                >
                  <div className={`p-1.5 rounded-full shrink-0 ${toastType === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary' : 'bg-red-100 dark:bg-red-500/20 text-red-500'}`}>
                    {toastType === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  </div>
                  <span className="text-sm">{toastMessage}</span>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
};