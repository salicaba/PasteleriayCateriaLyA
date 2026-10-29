// src/modules/cafeteria/views/modals/PapeleraModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, X, CheckCircle, PackageX, Receipt } from 'lucide-react';

export const PapeleraModal = ({
  isOpen,
  onClose,
  dailySummary,
  mesasSalon = [],
  mesasLlevar = [],
  selectedMesa
}) => {
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
      origin = `Mesa #${tableNum || '?'}`;
    }

    if (name.toUpperCase().startsWith('LLEVAR')) name = 'General';

    if (name.includes(' | ')) {
      const parts = name.split(' | ');
      name = parts[0].trim();
      if (!phone && parts[1]) phone = parts[1].replace(/Cel:/i, '').trim();
    } else if (name.includes(' - ')) {
      const parts = name.split(' - ');
      name = parts[0].trim();
      if (!phone && parts[1]) phone = parts[1].replace(/Cel:/i, '').trim();
    }

    return { origin, name, phone };
  };

  const cancelledOrders = dailySummary?.cancelledOrders || [];
  const cancelledItems = dailySummary?.cancelledItems || [];

  // IDs de órdenes que fueron anuladas por completo
  const fullyCancelledOrderIds = new Set(cancelledOrders.map(o => o.id));

  // 1. Cuentas anuladas completas (ordenadas de más reciente a más antigua) con sus productos anidados
  const cancelledAccountsWithItems = [...cancelledOrders]
    .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt))
    .map(order => {
      const itemsOfOrder = cancelledItems.filter(item => item.orderId === order.id);
      const totalCancelledOrderAmount = itemsOfOrder.reduce(
        (sum, item) => sum + Number(item.subtotal || 0),
        0
      );
      return {
        ...order,
        nestedItems: itemsOfOrder,
        totalCancelledOrderAmount
      };
    });

  // 2. Productos cancelados de forma individual/parcial (su cuenta padre sigue activa o fue pagada, NO anulada)
  const partialCancelledItems = cancelledItems
    .filter(item => !fullyCancelledOrderIds.has(item.orderId))
    .sort((a, b) => new Date(b.cancelledAt) - new Date(a.cancelledAt));

  // KPIs de resumen para el encabezado de la papelera
  const totalUnidadesCanceladas = cancelledItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  );
  const montoTotalAnulado = cancelledItems.reduce(
    (sum, item) => sum + Number(item.subtotal || 0),
    0
  );

  const hasAnyCancellation =
    cancelledAccountsWithItems.length > 0 || partialCancelledItems.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9990] flex justify-end overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-2xl flex flex-col"
          >
            {/* ENCABEZADO */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0">
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text leading-tight">
                    Papelera Hoy
                  </h2>
                  <p className="text-xs font-medium text-gray-400">
                    Auditoría de productos y cuentas anuladas
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-10">
              {/* RESUMEN EJECUTIVO DE MERMA / ANULACIONES */}
              {hasAnyCancellation && (
                <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/60 lya:bg-lya-bg border border-gray-200/70 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                      <PackageX size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Prod. Cancelados
                      </p>
                      <p className="text-base font-black text-gray-900 dark:text-white lya:text-lya-text">
                        {totalUnidadesCanceladas} {totalUnidadesCanceladas === 1 ? 'unidad' : 'unidades'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <Receipt size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Monto Anulado
                      </p>
                      <p className="text-base font-black text-red-500 line-through">
                        ${montoTotalAnulado.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 1. CUENTAS ANULADAS COMPLETAS (CON SUS PRODUCTOS ADENTRO)                 */}
              {/* ========================================================================= */}
              {cancelledAccountsWithItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest">
                      Cuentas Anuladas ({cancelledAccountsWithItems.length})
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {cancelledAccountsWithItems.map(order => {
                      const numMesa =
                        order.table?.numero ||
                        order.table?.number ||
                        order.parentOrder?.table?.numero ||
                        '?';
                      const esMesaCompleta = order.cancelReason?.includes('Mesa Completa');

                      const fallbackName =
                        order.cuenta ||
                        order.customerName ||
                        order.name ||
                        order.nombreCliente ||
                        'General';
                      const rawTicketId = order.ticketId || '';

                      const {
                        origin: tituloPrincipal,
                        name: cNameAcc,
                        phone: cPhoneAcc
                      } = parseTicketData(rawTicketId, fallbackName, numMesa);

                      let textoInsignia = '';
                      if (esMesaCompleta) {
                        textoInsignia = 'MESA COMPLETA';
                      } else if (cNameAcc.toUpperCase().includes('FOLIO:')) {
                        textoInsignia = cNameAcc;
                      } else if (
                        cNameAcc.toUpperCase() === 'GENERAL' ||
                        cNameAcc.toUpperCase() === 'CUENTA GENERAL'
                      ) {
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
                        motivoLimpio =
                          motivoLimpio.split(' - Motivo: ')[1] || 'Cancelación desde POS';
                      } else if (motivoLimpio.includes(' - Se vaciaron los productos')) {
                        motivoLimpio = 'Se vaciaron todos los productos de la cuenta';
                      } else if (motivoLimpio === 'Pedido para llevar descartado') {
                        motivoLimpio = 'Cancelado desde POS';
                      }

                      return (
                        <div
                          key={order.id}
                          className="p-4 border border-red-200/80 dark:border-red-900/40 bg-red-50/70 dark:bg-red-950/20 rounded-2xl transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-black text-gray-900 dark:text-white lya:text-lya-text text-base">
                              {tituloPrincipal}
                            </span>
                            <div className="flex items-center gap-2">
                              {order.totalCancelledOrderAmount > 0 && (
                                <span className="text-xs font-black text-gray-400 line-through">
                                  ${order.totalCancelledOrderAmount.toFixed(2)}
                                </span>
                              )}
                              <span className="text-[10px] font-black text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded uppercase">
                                Cuenta Anulada
                              </span>
                            </div>
                          </div>

                          <div className="mb-3">
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

                          {/* 🔥 DESGLOSE DE PRODUCTOS PERTENECIENTES A ESTA CUENTA ANULADA */}
                          {order.nestedItems.length > 0 ? (
                            <div className="mb-3 bg-white/90 dark:bg-gray-900/60 lya:bg-lya-bg rounded-xl p-2.5 border border-red-100 dark:border-red-900/30 space-y-1.5">
                              <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                Productos en esta cuenta ({order.nestedItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0)})
                              </p>
                              {order.nestedItems.map(item => (
                                <div
                                  key={item.id}
                                  className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                                >
                                  <div className="flex items-center gap-1.5 pr-2">
                                    <span className="font-black text-red-500">
                                      {item.quantity}x
                                    </span>
                                    <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text">
                                      {item.product?.name || 'Producto'}
                                    </span>
                                    {item.cuenta &&
                                      item.cuenta.toUpperCase() !== 'GENERAL' &&
                                      item.cuenta.toUpperCase() !== 'CUENTA GENERAL' && (
                                        <span className="text-[9px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">
                                          {item.cuenta}
                                        </span>
                                      )}
                                  </div>
                                  <span className="font-bold text-gray-400 line-through shrink-0">
                                    ${Number(item.subtotal || 0).toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] italic text-gray-400 mb-2">
                              Cuenta descartada sin productos registrados
                            </p>
                          )}

                          <p className="text-[11px] text-gray-500 leading-snug">
                            Motivo: {motivoLimpio}
                          </p>
                          <div className="flex items-center gap-2 mt-2.5">
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                              🕒{' '}
                              {new Date(order.cancelledAt).toLocaleTimeString('es-MX', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* 2. PRODUCTOS CANCELADOS PARCIALES (DE CUENTAS QUE SIGUIERON ACTIVAS)      */}
              {/* ========================================================================= */}
              {partialCancelledItems.length > 0 && (
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">
                    Productos Cancelados Individuales ({partialCancelledItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0)})
                  </h3>
                  <div className="space-y-3">
                    {partialCancelledItems.map(item => {
                      const ordenRef =
                        item.parentOrder ||
                        [
                          ...mesasSalon,
                          ...mesasLlevar,
                          selectedMesa,
                          ...(dailySummary?.vendidosOrders || []),
                          ...cancelledOrders
                        ]
                          .filter(Boolean)
                          .find(o => (o.orderId || o.id) === item.orderId);

                      let fallbackName = item.cuenta || 'General';
                      if (ordenRef && fallbackName === 'General') {
                        fallbackName =
                          ordenRef.nombreCliente ||
                          ordenRef.customerName ||
                          ordenRef.name ||
                          ordenRef.cuenta ||
                          'General';
                      }

                      let tituloPrincipal = 'Origen Desconocido';
                      let cNameAcc = fallbackName;
                      let cPhoneAcc = '';

                      if (ordenRef) {
                        const numMesa =
                          ordenRef.table?.numero || ordenRef.table?.number || '?';
                        const rawTicketId = ordenRef.ticketId || '';
                        const parsed = parseTicketData(rawTicketId, fallbackName, numMesa);
                        tituloPrincipal = parsed.origin;
                        cNameAcc = parsed.name;
                        cPhoneAcc = parsed.phone;
                      }

                      let textoInsignia = '';
                      if (cNameAcc.toUpperCase().includes('FOLIO:')) {
                        textoInsignia = cNameAcc;
                      } else if (
                        cNameAcc.toUpperCase() === 'GENERAL' ||
                        cNameAcc.toUpperCase() === 'CUENTA GENERAL'
                      ) {
                        textoInsignia = 'Cuenta General';
                      } else {
                        textoInsignia = `Cta: ${cNameAcc}${cPhoneAcc ? ` | Cel: ${cPhoneAcc}` : ''}`;
                      }

                      let motivoLimpioItem = item.cancelReason || 'Sin especificar';
                      if (motivoLimpioItem.includes(' - Motivo: ')) {
                        motivoLimpioItem =
                          motivoLimpioItem.split(' - Motivo: ')[1] || 'Cancelación desde POS';
                      } else if (motivoLimpioItem.includes(' - Se vaciaron los productos')) {
                        motivoLimpioItem = 'Se vaciaron los productos automáticamente';
                      } else if (motivoLimpioItem === 'Pedido para llevar descartado') {
                        motivoLimpioItem = 'Cancelado desde POS';
                      }

                      return (
                        <div
                          key={item.id}
                          className="p-4 border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-bg rounded-2xl flex items-center justify-between opacity-95 transition-opacity"
                        >
                          <div className="flex-1 pr-3">
                            <p className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text text-sm">
                              <span className="text-red-500 font-black">{item.quantity}x</span>{' '}
                              {item.product?.name}
                            </p>
                            <div className="mt-1.5 mb-1 inline-flex items-center bg-gray-100 dark:bg-gray-700/50 lya:bg-lya-surface rounded-lg px-2 py-1 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30">
                              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                {tituloPrincipal}
                              </span>
                              <span className="mx-1.5 text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-[9px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                {textoInsignia}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 leading-snug mt-1">
                              Motivo: {motivoLimpioItem}
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="bg-gray-100 dark:bg-gray-700/50 lya:bg-lya-surface text-gray-500 dark:text-gray-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                🕒{' '}
                                {new Date(item.cancelledAt).toLocaleTimeString('es-MX', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className="text-sm font-black text-gray-400 line-through">
                              ${Number(item.subtotal).toFixed(2)}
                            </span>
                            <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase bg-amber-500/10 px-2 py-1 rounded-md">
                              Cancelación Parcial
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!hasAnyCancellation && (
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