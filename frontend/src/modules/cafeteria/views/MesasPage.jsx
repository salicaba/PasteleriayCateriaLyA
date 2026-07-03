// src/modules/cafeteria/views/MesasPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Grid, ShoppingBag, Plus, Store, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../../api/client';
import { socket } from '../../../api/socket'; 

import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal';
import { NuevoPedidoLlevarModal } from './NuevoPedidoLlevarModal';

import { MesasHeader } from './components/MesasHeader';
import { CancelOrderModal } from './modals/CancelOrderModal';
import { PapeleraModal } from './modals/PapeleraModal';
import { VentasHoyModal } from './modals/VentasHoyModal';

export const MesasPage = ({ globalScroll }) => {
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

  const [isCreatingMostrador, setIsCreatingMostrador] = useState(false);
  const [restoringOrderId, setRestoringOrderId] = useState(null);
  const [restoringItemId, setRestoringItemId] = useState(null);

  // --- SISTEMA DE NOTIFICACIONES NEO-BENTO NATIVO ---
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3500);
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

  const onRestoreOrder = async (orderId) => {
    setRestoringOrderId(orderId);
    try {
      await handleRestoreOrder(orderId);
      setDailySummary(prev => ({
        ...prev,
        cancelledOrders: prev.cancelledOrders.filter(o => o.id !== orderId)
      }));
      showToast('Cuenta restaurada con éxito', 'success'); 
      fetchSummary(); 
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
      setDailySummary(prev => ({
        ...prev,
        cancelledItems: prev.cancelledItems.filter(i => i.id !== itemId)
      }));
      showToast('Producto restaurado con éxito', 'success'); 
      fetchSummary(); 
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
        showToast('Cuenta de mostrador abierta', 'success');
      }
    } finally {
      setIsCreatingMostrador(false);
    }
  };

  const confirmCancelOrder = async (orderId) => {
    setIsCanceling(true); 
    try {
      await handleCancelOrder(orderId, 'Cuenta cancelada desde POS');
      showToast('Cuenta eliminada correctamente', 'success'); 
    } catch (error) {
      showToast(error.response?.data?.message || 'Error al cancelar', 'error');
    } finally {
      setIsCanceling(false); 
      setOrderToCancel(null); 
      fetchSummary(); 
    }
  };

  // 🔥 PANTALLA DE CARGA CORREGIDA: Eliminamos el min-h-[80vh] y aseguramos flex-1, h-full y w-full
  if (isLoading) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
        >
          <Store size={40} className="text-orange-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center">
          Cargando Punto de Venta
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 text-center">
          <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> Sincronizando datos...
        </p>
      </div>
    );
  }

  const mesasOcupadas = mesasSalon.filter(m => m.estado === 'ocupada').length;

  return (
    /* 🔥 CONTENEDOR PRINCIPAL: Aseguramos el flex-1 para que llene todo el espacio sin dejar huecos */
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col flex-1 w-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300 ${globalScroll ? 'min-h-full' : 'h-full overflow-hidden'}`}
    >
      
      {/* NOTIFICACIONES NATIVAS NEO-BENTO */}
      <AnimatePresence>
        {toastMessage && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center justify-center gap-3 font-bold border pointer-events-auto transition-colors max-w-md w-full sm:w-auto ${
                toastType === 'error' ? 'border-red-100 dark:border-red-900/30 lya:border-red-500/30' : 'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                toastType === 'error' 
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-500' 
                  : 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
              }`}>
                {toastType === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="flex flex-col items-center justify-center text-center w-full">
                  <span className="text-sm leading-tight text-center">{toastMessage}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <MesasHeader 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        handleCreateMostrador={handleCreateMostrador}
        isCreatingMostrador={isCreatingMostrador}
        mesasOcupadas={mesasOcupadas}
        mesasSalonLength={mesasSalon.length}
        mesasLlevarLength={mesasLlevar.length}
        ingresosTotalesLength={ingresosTotales.length}
        papeleraCount={dailySummary.papeleraCount}
        showVendidos={showVendidos}
        setShowVendidos={setShowVendidos}
        showPapelera={showPapelera}
        setShowPapelera={setShowPapelera}
      />

      <div className={`flex-1 w-full relative px-4 md:px-6 pb-6 ${globalScroll ? '' : 'overflow-y-auto custom-scrollbar'}`}>
        <AnimatePresence mode="wait">
          {activeTab === 'salon' && (
            <motion.div key="salon-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-2">
              <div className="flex items-center gap-2 mb-4 px-2">
                <Grid className="text-gray-400" size={20} />
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Mesas del Salón</h3>
              </div>
              
              {/* ESTADO VACÍO PARA SALÓN */}
              {mesasSalon.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-gray-400 shadow-sm mt-2">
                  <Store size={48} className="mb-3 opacity-50 text-gray-300 dark:text-gray-600 lya:text-lya-text/40" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-center text-gray-500 dark:text-gray-400 lya:text-lya-text/60">No hay mesas en el salón en este momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {mesasSalon.map(mesa => (
                    <MesaCard key={mesa.id} mesa={mesa} onClick={() => setSelectedMesa(mesa)} />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'llevar' && (
            <motion.div key="llevar-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-2">
              <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-gray-400" size={20} />
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Cuentas Para Llevar</h3>
                </div>
                <button 
                  onClick={() => setShowLlevarModal(true)}
                  className="flex items-center justify-center gap-1.5 bg-gray-900 dark:bg-white lya:bg-lya-secondary text-white dark:text-gray-900 lya:text-lya-surface px-4 py-2 rounded-xl text-xs font-bold uppercase active:scale-95 transition-transform shadow-sm hover:shadow-md"
                >
                  <Plus size={14} /> Nueva Cuenta
                </button>
              </div>

              {/* ESTADO VACÍO PARA LLEVAR */}
              {mesasLlevar.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-gray-400 shadow-sm mt-2">
                  <ShoppingBag size={48} className="mb-3 opacity-50 text-gray-300 dark:text-gray-600 lya:text-lya-text/40" strokeWidth={1.5} />
                  <p className="text-sm font-bold text-center text-gray-500 dark:text-gray-400 lya:text-lya-text/60">No hay cuentas activas para llevar en este momento.</p>
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
      </div>

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
                  showToast('Cuenta para llevar creada', 'success');
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
              showToast={showToast} 
            />
          )}

          <CancelOrderModal 
            orderToCancel={orderToCancel}
            isCanceling={isCanceling}
            onClose={() => setOrderToCancel(null)}
            onConfirm={confirmCancelOrder}
          />

          <PapeleraModal 
            isOpen={showPapelera}
            onClose={() => setShowPapelera(false)}
            dailySummary={dailySummary}
            mesasSalon={mesasSalon}
            mesasLlevar={mesasLlevar}
            selectedMesa={selectedMesa}
            onRestoreOrder={onRestoreOrder}
            restoringOrderId={restoringOrderId}
            onRestoreItem={onRestoreItem}
            restoringItemId={restoringItemId}
          />

          <VentasHoyModal 
            isOpen={showVendidos}
            onClose={() => setShowVendidos(false)}
            ingresosTotales={ingresosTotales}
          />
        </>,
        document.body
      )}
    </motion.div>
  );
};