// src/modules/cafeteria/views/MesasPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Grid, ShoppingBag, CheckCircle, Trash2, X, Plus, Store, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../../api/client';
import { socket } from '../../../api/socket'; 

// IMPORTA TUS COMPONENTES (Ajusta las rutas si es necesario)
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal';
import { NuevoPedidoLlevarModal } from './NuevoPedidoLlevarModal';

const StatCard = ({ title, value, icon: Icon, borderClass, iconColors, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-900 rounded-2xl p-5 shadow-sm border-l-4 flex justify-between items-center cursor-pointer transition-all active:scale-95 hover:shadow-md ${borderClass}`}
  >
    <div>
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 dark:text-white">{value}</h3>
    </div>
    <div className={`p-3 rounded-xl bg-opacity-10 dark:bg-opacity-20 ${iconColors.bg}`}>
      <Icon size={24} className={iconColors.text} />
    </div>
  </div>
);

export const MesasPage = () => {
  const { 
    mesasSalon, mesasLlevar, isLoading, 
    handleLiberarMesa, handleUpdateTotal, handleUnirMesas, handlePagoParcial 
  } = useMesasController();

  const [selectedMesa, setSelectedMesa] = useState(null);
  const [showLlevarModal, setShowLlevarModal] = useState(false);
  
  // 🔥 ESTADOS DEL DASHBOARD
  const [dailySummary, setDailySummary] = useState({
    vendidosCount: 0, papeleraCount: 0, vendidosOrders: [], cancelledOrders: [], cancelledItems: []
  });
  const [showPapelera, setShowPapelera] = useState(false);
  const [showVendidos, setShowVendidos] = useState(false);

  // 🔥 REFS PARA EL SCROLL
  const mesasRef = useRef(null);
  const llevarRef = useRef(null);

  // Obtener resumen del día
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

  const scrollTo = (ref) => {
    if (ref.current) {
      const offset = 80; // Margen superior para que no quede pegado
      const top = ref.current.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  // 🔥 PANTALLA DE CARGA GLOBAL (IGUAL AL RESTO DEL SISTEMA)
  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800"
        >
          <Store size={40} className="text-orange-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Punto de Venta
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500" /> Sincronizando datos...
        </p>
      </div>
    );
  }

  const mesasOcupadas = mesasSalon.filter(m => m.estado === 'ocupada').length;

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8">
      
      {/* 🚀 CABECERA Y TARJETAS DEL DASHBOARD */}
      <div>
        
        {/* 🔥 ENCABEZADO CON CONTENEDOR TIPO "CONTROL QR" */}
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2rem] p-6 md:p-8 mb-8 shadow-sm flex items-center gap-5">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-2xl flex-shrink-0">
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
        
        {/* 4 COLUMNAS DE TARJETAS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Mesas Ocupadas" 
            value={`${mesasOcupadas} / ${mesasSalon.length}`} 
            icon={Grid} 
            borderClass="border-orange-500" 
            iconColors={{ bg: "bg-orange-500", text: "text-orange-500" }} 
            onClick={() => scrollTo(mesasRef)}
          />
          <StatCard 
            title="Para Llevar" 
            value={mesasLlevar.length} 
            icon={ShoppingBag} 
            borderClass="border-blue-500" 
            iconColors={{ bg: "bg-blue-500", text: "text-blue-500" }} 
            onClick={() => scrollTo(llevarRef)}
          />
          <StatCard 
            title="Vendidos Hoy" 
            value={dailySummary.vendidosCount} 
            icon={CheckCircle} 
            borderClass="border-[#24d366]" 
            iconColors={{ bg: "bg-[#24d366]", text: "text-[#24d366]" }} 
            onClick={() => setShowVendidos(true)}
          />
          <StatCard 
            title="Papelera" 
            value={dailySummary.papeleraCount} 
            icon={Trash2} 
            borderClass="border-red-500" 
            iconColors={{ bg: "bg-red-500", text: "text-red-500" }} 
            onClick={() => setShowPapelera(true)}
          />
        </div>
      </div>

      {/* 🪑 SECCIÓN DE MESAS */}
      <div ref={mesasRef} className="pt-2">
        <div className="flex items-center gap-2 mb-4">
          <Grid className="text-gray-400" size={20} />
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Mesas</h3>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mesasSalon.map(mesa => (
            <MesaCard key={mesa.id} mesa={mesa} onClick={() => setSelectedMesa(mesa)} />
          ))}
        </div>
      </div>

      {/* 🛍️ SECCIÓN PARA LLEVAR */}
      <div ref={llevarRef} className="pt-2 pb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-gray-400" size={20} />
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Para Llevar</h3>
          </div>
          <button 
            onClick={() => setShowLlevarModal(true)}
            className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-xs font-bold uppercase active:scale-95 transition-transform"
          >
            <Plus size={14} /> Nuevo
          </button>
        </div>

        {mesasLlevar.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 flex flex-col items-center justify-center text-gray-400">
            <ShoppingBag size={48} className="mb-3 opacity-50" strokeWidth={1.5} />
            <p className="text-sm font-medium">No hay pedidos activos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mesasLlevar.map(pedido => (
              <MesaCard key={pedido.id} mesa={pedido} onClick={() => setSelectedMesa(pedido)} />
            ))}
          </div>
        )}
      </div>

      {/* MODALES DEL FLUJO NORMAL */}
      {showLlevarModal && (
        <NuevoPedidoLlevarModal onClose={() => setShowLlevarModal(false)} onSubmit={(data) => {
            const tempMesa = { id: `temp-${Date.now()}`, zona: 'llevar', numero: data.nombreCliente };
            setSelectedMesa(tempMesa);
            setShowLlevarModal(false);
        }} />
      )}

      {selectedMesa && (
        <PosModal 
          isOpen={!!selectedMesa} onClose={() => setSelectedMesa(null)} mesa={selectedMesa} todasLasMesas={mesasSalon}
          onTableRelease={handleLiberarMesa} onUpdateTotal={handleUpdateTotal} onUnirMesas={handleUnirMesas} onPagoParcial={handlePagoParcial}
        />
      )}

      {/* 🔴 MODAL DE PAPELERA (CANCELADOS) */}
      <AnimatePresence>
        {showPapelera && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPapelera(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 text-red-500">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl"><Trash2 size={24} /></div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">Papelera Hoy</h2>
                </div>
                <button onClick={() => setShowPapelera(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                
                {/* Órdenes completas canceladas */}
                {dailySummary.cancelledOrders.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Cuentas Canceladas</h3>
                    <div className="space-y-3">
                      {dailySummary.cancelledOrders.map(order => (
                        <div key={order.id} className="p-4 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 rounded-2xl">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-gray-900 dark:text-white">{order.ticketId || `Mesa ${order.table?.number}`}</span>
                            <span className="text-xs font-black text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded uppercase">Anulada</span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-snug">Motivo: {order.cancelReason || 'Sin especificar'}</p>
                          <p className="text-[10px] text-gray-400 mt-2">{new Date(order.cancelledAt).toLocaleTimeString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Productos individuales cancelados */}
                {dailySummary.cancelledItems.length > 0 && (
                  <div>
                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Productos Cancelados</h3>
                    <div className="space-y-3">
                      {dailySummary.cancelledItems.map(item => (
                        <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-between opacity-80 grayscale">
                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-200 text-sm"><span className="text-red-500">{item.quantity}x</span> {item.product?.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase mt-0.5">Cuenta: {item.cuenta}</p>
                            <p className="text-[10px] text-gray-400 mt-1 italic">"{item.cancelReason || 'Sin motivo'}"</p>
                          </div>
                          <span className="text-sm font-black text-gray-400 line-through">${Number(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
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

      {/* 🟢 MODAL DE VENDIDOS HOY */}
      <AnimatePresence>
        {showVendidos && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowVendidos(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative w-full max-w-md h-full bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-3 text-[#24d366]">
                  <div className="p-2 bg-[#24d366]/10 rounded-xl"><CheckCircle size={24} /></div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">Cuentas Pagadas Hoy</h2>
                </div>
                <button onClick={() => setShowVendidos(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                
                {dailySummary.vendidosOrders.length > 0 ? (
                  dailySummary.vendidosOrders.map(order => (
                    <div key={order.id} className="p-4 border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 rounded-2xl flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900 dark:text-white mb-0.5">{order.ticketId || `Mesa ${order.table?.number}`}</p>
                        <p className="text-[10px] text-gray-500 flex gap-2">
                           <span className="font-black text-[#24d366] uppercase">{order.status}</span>
                           • {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className="text-lg font-black text-[#24d366]">${Number(order.totalAmount).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 mt-10">
                    <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold">Aún no hay ventas</p>
                    <p className="text-xs">Las cuentas cobradas aparecerán aquí.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};