// src/modules/cafeteria/views/MesasPage.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Grid, ShoppingBag, CheckCircle, Trash2, X, Plus, Store, Loader2, RotateCcw, Zap, Banknote, CreditCard, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import client from '../../../api/client';
import { socket } from '../../../api/socket'; 

// IMPORTA TUS COMPONENTES
import { useMesasController } from '../controllers/useMesasController';
import { MesaCard } from './MesaCard';
import { PosModal } from './PosModal';
import { NuevoPedidoLlevarModal } from './NuevoPedidoLlevarModal';

const StatCard = ({ title, value, icon: Icon, borderClass, iconColors, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 shadow-sm border-l-4 flex justify-between items-center cursor-pointer transition-all active:scale-95 hover:shadow-md ${borderClass}`}
  >
    <div>
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{value}</h3>
    </div>
    <div className={`p-2 sm:p-3 rounded-xl bg-opacity-10 dark:bg-opacity-20 ${iconColors.bg}`}>
      <Icon size={24} className={iconColors.text} />
    </div>
  </div>
);

export const MesasPage = () => {
  const { 
    mesasSalon, mesasLlevar, isLoading, 
    handleLiberarMesa, handleUpdateTotal, handleUnirMesas, handlePagoParcial,
    nuevoPedidoVitrina, nuevoPedidoLlevar, handleRestoreOrder, handleRestoreItem
  } = useMesasController();

  const [selectedMesa, setSelectedMesa] = useState(null);
  const [showLlevarModal, setShowLlevarModal] = useState(false);
  const [activeTab, setActiveTab] = useState('salon'); 
  
  const [dailySummary, setDailySummary] = useState({
    vendidosCount: 0, papeleraCount: 0, vendidosOrders: [], cancelledOrders: [], cancelledItems: [], transactions: []
  });
  const [showPapelera, setShowPapelera] = useState(false);
  const [showVendidos, setShowVendidos] = useState(false);

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

  // 🔥 LÓGICA DE PROTECCIÓN MATEMÁTICA PARA LA PAPELERA
  const activeOrderIds = [...mesasSalon, ...mesasLlevar].map(m => m.orderId || m.id).filter(Boolean);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-8">
      
      <div>
        <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2rem] p-6 md:p-8 mb-8 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
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

          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setActiveTab('salon')} 
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border ${
                activeTab === 'salon' 
                  ? 'bg-orange-500 text-white border-orange-500 shadow-md' 
                  : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-100 dark:border-orange-900/30'
              }`}
            >
              <Grid size={18} /> Mesas
            </button>
            
            <button 
              onClick={() => setActiveTab('llevar')} 
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border ${
                activeTab === 'llevar'
                  ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/30'
              }`}
            >
              <ShoppingBag size={18} /> Llevar
            </button>
            
            <button 
              onClick={async () => {
                const mesaVitrina = await nuevoPedidoVitrina();
                if(mesaVitrina) setSelectedMesa(mesaVitrina);
              }} 
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-950 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] active:scale-95"
            >
              <Zap size={18} /> Mostrador
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard 
            title="Mesas Ocupadas" 
            value={`${mesasOcupadas} / ${mesasSalon.length}`} 
            icon={Grid} 
            borderClass="border-orange-500" 
            iconColors={{ bg: "bg-orange-500", text: "text-orange-500" }} 
            onClick={() => setActiveTab('salon')}
          />
          <StatCard 
            title="Para Llevar" 
            value={mesasLlevar.length} 
            icon={ShoppingBag} 
            borderClass="border-blue-500" 
            iconColors={{ bg: "bg-blue-500", text: "text-blue-500" }} 
            onClick={() => setActiveTab('llevar')}
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

      <AnimatePresence mode="wait">
        {activeTab === 'salon' && (
          <motion.div key="salon-view" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="pt-2">
            <div className="flex items-center gap-2 mb-4">
              <Grid className="text-gray-400" size={20} />
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Mesas del Salón</h3>
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
                <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">Pedidos Para Llevar</h3>
              </div>
              <button 
                onClick={() => setShowLlevarModal(true)}
                className="flex items-center gap-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 rounded-xl text-xs font-bold uppercase active:scale-95 transition-transform shadow-sm hover:shadow-md"
              >
                <Plus size={14} /> Nuevo Pedido
              </button>
            </div>

            {mesasLlevar.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-8 flex flex-col items-center justify-center text-gray-400">
                <ShoppingBag size={48} className="mb-3 opacity-50" strokeWidth={1.5} />
                <p className="text-sm font-medium">No hay pedidos activos para llevar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {mesasLlevar.map(pedido => (
                  <MesaCard key={pedido.id} mesa={pedido} onClick={() => setSelectedMesa(pedido)} />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🔥 LIBERANDO LOS MODALES CON CREATEPORTAL */}
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
                if(nuevaMesa) setSelectedMesa(nuevaMesa); 
                setShowLlevarModal(false);
              }} 
            />
          )}

          {selectedMesa && (
            <PosModal 
              isOpen={!!selectedMesa} onClose={() => setSelectedMesa(null)} mesa={selectedMesa} todasLasMesas={mesasSalon}
              onTableRelease={handleLiberarMesa} onUpdateTotal={handleUpdateTotal} onUnirMesas={handleUnirMesas} onPagoParcial={handlePagoParcial}
            />
          )}

          <AnimatePresence>
            {showPapelera && (
              <div className="fixed inset-0 z-[9990] flex justify-end overflow-hidden">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPapelera(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-3 text-red-500">
                      <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl"><Trash2 size={24} /></div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white">Papelera Hoy</h2>
                    </div>
                    <button onClick={() => setShowPapelera(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
                    
                    {dailySummary.cancelledOrders.length > 0 && (
                      <div>
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Cuentas Canceladas</h3>
                        <div className="space-y-3">
                          {dailySummary.cancelledOrders.map(order => {
                            return (
                            <div key={order.id} className="p-4 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 rounded-2xl transition-all">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-gray-900 dark:text-white">{order.ticketId || `Mesa ${order.table?.number}`}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded uppercase">Anulada</span>
                                  {/* 🔥 BOTÓN SIEMPRE VISIBLE */}
                                  <button 
                                    onClick={() => handleRestoreOrder(order.id)} 
                                    className="px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg shadow-sm border border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-95 transition-all flex items-center gap-1.5" 
                                    title="Restaurar Cuenta Completa"
                                  >
                                    <RotateCcw size={14} /> <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Restaurar</span>
                                  </button>
                                </div>
                              </div>
                              <p className="text-[11px] text-gray-500 leading-snug">Motivo: {order.cancelReason || 'Sin especificar'}</p>
                              <p className="text-[10px] text-gray-400 mt-2">{new Date(order.cancelledAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
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
                            const canRestore = activeOrderIds.includes(item.orderId);

                            // 🔥 BÚSQUEDA DEL ORIGEN DE LA MESA
                            let nombreOrigen = 'Origen Desconocido';
                            const mesaActiva = [...mesasSalon, ...mesasLlevar].find(m => (m.orderId || m.id) === item.orderId);
                            
                            if (mesaActiva) {
                                nombreOrigen = mesaActiva.zona === 'salon' ? `Mesa ${mesaActiva.numero}` : (mesaActiva.ticketId || `Llevar ${mesaActiva.numero}`);
                            } else {
                                const ordenCerrada = [...dailySummary.vendidosOrders, ...dailySummary.cancelledOrders].find(o => o.id === item.orderId);
                                if (ordenCerrada) {
                                    nombreOrigen = ordenCerrada.orderType === 'LLEVAR' ? ordenCerrada.ticketId : `Mesa ${ordenCerrada.table?.number || '?'}`;
                                }
                            }

                            return (
                            <div key={item.id} className="p-4 border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-between opacity-90 transition-opacity">
                              <div className="flex-1 pr-3">
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm"><span className="text-red-500">{item.quantity}x</span> {item.product?.name}</p>
                                
                                {/* 🔥 ORIGEN VISIBLE */}
                                <div className="mt-1.5 mb-1 inline-flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700">
                                  <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{nombreOrigen}</span>
                                  <span className="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
                                  <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Cta: {item.cuenta}</span>
                                </div>
                                
                                <p className="text-[10px] text-gray-400 italic leading-snug">"{item.cancelReason || 'Sin motivo'}"</p>
                              </div>
                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span className="text-sm font-black text-gray-400 line-through">${Number(item.subtotal).toFixed(2)}</span>
                                {canRestore ? (
                                    /* 🔥 BOTÓN SIEMPRE VISIBLE Y ESTILIZADO */
                                    <button 
                                        onClick={() => handleRestoreItem(item.orderId, item.id)} 
                                        className="px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl border border-orange-200 dark:border-orange-800/50 shadow-sm hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-95 transition-all flex items-center gap-1.5" 
                                        title="Restaurar Producto a la Orden Original"
                                    >
                                        <RotateCcw size={16} /> <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">Restaurar</span>
                                    </button>
                                ) : (
                                    <span 
                                        className="text-[9px] font-black text-gray-400 uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md" 
                                        title="No se puede restaurar porque la cuenta/mesa ya fue cerrada o finalizada."
                                    >
                                        Mesa Cerrada
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
                <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-3 text-[#24d366]">
                      <div className="p-2 bg-[#24d366]/10 rounded-xl"><CheckCircle size={24} /></div>
                      <h2 className="text-xl font-black text-gray-900 dark:text-white">Cuentas Pagadas Hoy</h2>
                    </div>
                    <button onClick={() => setShowVendidos(false)} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar pb-10">
                    
                    {dailySummary.transactions?.filter(t => t.type === 'INCOME').length > 0 ? (
                      dailySummary.transactions.filter(t => t.type === 'INCOME').map(tx => (
                        <div key={tx.id} className="p-4 border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-900/10 rounded-2xl flex justify-between items-center group hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-[#24d366] shrink-0 border border-green-100 dark:border-green-900/50">
                              {tx.paymentMethod === 'CASH' ? <Banknote size={20} /> : tx.paymentMethod === 'CARD' ? <CreditCard size={20} /> : <ArrowRightLeft size={20} />}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-gray-900 dark:text-white mb-0.5 text-sm tracking-tight">{tx.folio || 'Cobro Exitoso'}</p>
                              <p className="text-[10px] text-gray-500 font-medium truncate max-w-[180px] sm:max-w-[220px]" title={tx.description}>
                                {tx.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-[#24d366] bg-[#24d366]/10 px-1.5 py-0.5 rounded uppercase tracking-widest">
                                  {tx.paymentMethod === 'CASH' ? 'Efectivo' : tx.paymentMethod === 'CARD' ? 'Tarjeta' : 'Transferencia'}
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold">
                                  {new Date(tx.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </div>
                            </div>
                          </div>
                          <span className="text-lg font-black text-[#24d366] shrink-0">+${Number(tx.amount).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-400 mt-10">
                        <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="font-bold">Aún no hay ventas</p>
                        <p className="text-xs">Las cuentas cobradas aparecerán aquí detalladas.</p>
                      </div>
                    )}
                  </div>
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