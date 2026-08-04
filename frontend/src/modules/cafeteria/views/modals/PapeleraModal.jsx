// src/modules/cafeteria/views/modals/PapeleraModal.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, RotateCcw, Loader2, CheckCircle } from 'lucide-react';

export const PapeleraModal = ({
  isOpen,
  onClose,
  dailySummary,
  mesasSalon,
  mesasLlevar,
  selectedMesa,
  onRestoreOrder,
  restoringOrderId,
  onRestoreItem,
  restoringItemId
}) => {
  // 🔥 ESTADO LOCAL: Controla la carga cuando restauramos una cuenta virtual completa
  const [restoringVirtualId, setRestoringVirtualId] = useState(null);

  // 🔥 HELPER INTELIGENTE MEJORADO: Siempre exige el número de mesa como respaldo
  const parseTicketData = (ticketId, fallbackName, tableNum) => {
    let origin = ticketId || '';
    let name = fallbackName || 'General';
    let phone = '';

    if (origin.toUpperCase().includes('MOSTRADOR')) {
        const parts = origin.split(' ');
        origin = 'Cuenta Mostrador';
        name = `Folio: ${parts[1] || 'Express'}`;
    } else if (origin.toUpperCase().includes('LLEVAR')) {
        const separator = origin.includes(' - ') ? ' - ' : ' | ';
        const parts = origin.split(separator);
        
        origin = parts[0].trim();
        origin = origin.toUpperCase().includes('PEDIDO') ? origin : `Pedido ${origin}`;
        
        if (parts.length > 1) name = parts[1].trim();
        if (parts.length > 2) phone = parts[2].trim();
    } else {
        // 🔥 FIX: Si no es Llevar ni Mostrador, ES SALÓN. Forzamos el título de la Mesa.
        origin = `Mesa #${tableNum || '?'}`;
    }

    if (name.toUpperCase().startsWith('LLEVAR')) name = 'General';
    
    if (name.includes(' | ')) {
        const parts = name.split(' | ');
        name = parts[0].trim();
        if(!phone && parts[1]) phone = parts[1].replace(/Cel:/i, '').trim();
    } else if (name.includes(' - ')) {
        const parts = name.split(' - ');
        name = parts[0].trim();
        if(!phone && parts[1]) phone = parts[1].replace(/Cel:/i, '').trim();
    }
    
    return { origin, name, phone };
  };

  // 🔥 FUNCIÓN MAESTRA: Restaura todos los items de una cuenta virtual automáticamente
  const handleRestoreVirtualAccount = async (virtualOrder) => {
    setRestoringVirtualId(virtualOrder.id);
    const itemsToRestore = dailySummary.cancelledItems.filter(item => 
      item.orderId === virtualOrder.realOrderId && 
      (item.cuenta || 'General') === virtualOrder.cuenta
    );

    for (const item of itemsToRestore) {
      try {
        await onRestoreItem(item.orderId, item.id);
        await new Promise(r => setTimeout(r, 200)); 
      } catch (error) {
        console.error("Error al restaurar item virtual:", error);
      }
    }
    setRestoringVirtualId(null);
  };

  const fullyCancelledOrderIds = dailySummary.cancelledOrders.map(o => o.id);
  const orphanedItems = dailySummary.cancelledItems.filter(item => !fullyCancelledOrderIds.includes(item.orderId));

  const virtualOrdersMap = {};
  orphanedItems.forEach(item => {
    const cuenta = item.cuenta || 'General';
    const key = `${item.orderId}_${cuenta}`;
    if (!virtualOrdersMap[key]) {
        const parentOrder = item.parentOrder || [...mesasSalon, ...mesasLlevar, selectedMesa, ...dailySummary.vendidosOrders].filter(Boolean).find(o => (o.orderId || o.id) === item.orderId);
        virtualOrdersMap[key] = {
            id: key, 
            isVirtual: true,
            realOrderId: item.orderId,
            cuenta: cuenta,
            cancelReason: item.cancelReason,
            cancelledAt: item.cancelledAt,
            table: parentOrder?.table,
            ticketId: parentOrder?.ticketId,
            parentOrder: parentOrder
        };
    }
  });

  const virtualOrders = Object.values(virtualOrdersMap);
  const allCancelledAccounts = [...dailySummary.cancelledOrders, ...virtualOrders].sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex justify-end overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0">
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl"><Trash2 size={24} /></div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">Papelera Hoy</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-500" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
              {/* ========================================================================= */}
              {/* CUENTAS CANCELADAS (REALES + VIRTUALES) */}
              {/* ========================================================================= */}
              {allCancelledAccounts.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Cuentas Canceladas</h3>
                  <div className="space-y-3">
                    {allCancelledAccounts.map(order => {
                      const numMesa = order.table?.numero || order.table?.number || order.parentOrder?.table?.numero || '?';
                      const esMesaCompleta = order.cancelReason?.includes('Mesa Completa');

                      const fallbackName = order.cuenta || order.customerName || order.name || order.nombreCliente || 'General';
                      const rawTicketId = order.ticketId || '';
                      
                      // 🔥 Pasamos numMesa al filtro para que siempre sepa de dónde viene
                      const { origin: tituloPrincipal, name: cNameAcc, phone: cPhoneAcc } = parseTicketData(rawTicketId, fallbackName, numMesa);

                      let textoInsignia = '';
                      if (esMesaCompleta) {
                          textoInsignia = 'MESA COMPLETA';
                      } else if (cNameAcc.toUpperCase().includes('FOLIO:')) {
                          textoInsignia = cNameAcc;
                      } else if (cNameAcc.toUpperCase() === 'GENERAL' || cNameAcc.toUpperCase() === 'CUENTA GENERAL') {
                          textoInsignia = 'Cuenta General';
                      } else {
                          textoInsignia = `Cta: ${cNameAcc}${cPhoneAcc ? ` | Cel: ${cPhoneAcc}` : ''}`;
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
                              
                              {order.isVirtual ? (
                                <button 
                                  onClick={() => handleRestoreVirtualAccount(order)} 
                                  disabled={restoringVirtualId === order.id}
                                  className={`px-2 py-1.5 rounded-lg shadow-sm border transition-all flex items-center gap-1.5 ${
                                    restoringVirtualId === order.id 
                                      ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-400 border-orange-200 dark:border-orange-800/50 opacity-70 cursor-wait' 
                                      : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 dark:hover:bg-orange-900/40 active:scale-95'
                                  }`} 
                                  title="Restaurar Cuenta Específica"
                                >
                                  {restoringVirtualId === order.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} 
                                  <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                    {restoringVirtualId === order.id ? 'Restaurando...' : 'Restaurar'}
                                  </span>
                                </button>
                              ) : (
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
                              )}
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
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* PRODUCTOS CANCELADOS INDIVIDUALMENTE */}
              {/* ========================================================================= */}
              {dailySummary.cancelledItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">Productos Cancelados</h3>
                  <div className="space-y-3">
                    {dailySummary.cancelledItems.map(item => {
                      const ordenRef = item.parentOrder || [...mesasSalon, ...mesasLlevar, selectedMesa, ...dailySummary.vendidosOrders, ...dailySummary.cancelledOrders]
                          .filter(Boolean)
                          .find(o => (o.orderId || o.id) === item.orderId);

                      const canRestore = ordenRef && ordenRef.status !== 'CANCELLED' && ordenRef.status !== 'CLOSED';
                      
                      let fallbackName = item.cuenta || 'General';
                      if (ordenRef && fallbackName === 'General') {
                          fallbackName = ordenRef.nombreCliente || ordenRef.customerName || ordenRef.name || ordenRef.cuenta || 'General';
                      }

                      let tituloPrincipal = 'Origen Desconocido';
                      let cNameAcc = fallbackName;
                      let cPhoneAcc = '';

                      if (ordenRef) {
                          const numMesa = ordenRef.table?.numero || ordenRef.table?.number || '?';
                          const rawTicketId = ordenRef.ticketId || '';
                          const parsed = parseTicketData(rawTicketId, fallbackName, numMesa);
                          tituloPrincipal = parsed.origin;
                          cNameAcc = parsed.name;
                          cPhoneAcc = parsed.phone;
                      }

                      let textoInsignia = '';
                      if (cNameAcc.toUpperCase().includes('FOLIO:')) {
                          textoInsignia = cNameAcc;
                      } else if (cNameAcc.toUpperCase() === 'GENERAL' || cNameAcc.toUpperCase() === 'CUENTA GENERAL') {
                          textoInsignia = 'Cuenta General';
                      } else {
                          textoInsignia = `Cta: ${cNameAcc}${cPhoneAcc ? ` | Cel: ${cPhoneAcc}` : ''}`;
                      }

                      let textoCerrado = tituloPrincipal.toUpperCase().includes('MESA') ? 'Mesa Cerrada' : 'Cuenta Cerrada';
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
                              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">{tituloPrincipal}</span>
                              <span className="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                {textoInsignia}
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
                      )
                    })}
                  </div>
                </div>
              )}

              {allCancelledAccounts.length === 0 && dailySummary.cancelledItems.length === 0 && (
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
  );
};