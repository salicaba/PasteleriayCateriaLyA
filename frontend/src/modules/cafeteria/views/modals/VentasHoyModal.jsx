// src/modules/cafeteria/views/modals/VentasHoyModal.jsx
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  X,
  RotateCcw,
  Banknote,
  CreditCard,
  ArrowRightLeft,
  ShoppingBag,
  Receipt,
  Coffee,
  CakeSlice
} from 'lucide-react';

const parseCleanAccount = (str) => {
  if (!str) return 'General';
  let s = String(str);
  if (s.includes(' | ')) s = s.split(' | ')[0].trim();
  if (s.includes(' - ')) {
    const parts = s.split(' - ');
    const possiblePhone = parts[parts.length - 1].replace(/\D/g, '');
    if (possiblePhone.length >= 10) s = parts.slice(0, -1).join(' - ').trim();
  }
  return s || 'General';
};

const isPasteleriaDept = (dept) => {
  if (!dept) return false;
  return String(dept)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes('PASTELERIA');
};

export const VentasHoyModal = ({
  isOpen,
  onClose,
  ingresosTotales = [],
  vendidosOrders = []
}) => {
  // 🔥 Agrupamos transacciones mixtas (CAF-xxxxxx + PAS-xxxxxx) en una sola tarjeta de venta
  const groupedSales = useMemo(() => {
    const validTxs = (ingresosTotales || []).filter(
      (tx) => tx.status !== 'CANCELLED' && Number(tx.amount) !== 0
    );

    const groupsMap = new Map();

    validTxs.forEach((tx) => {
      const rawFolio = String(tx.folio || '');
      const isPosFolio = rawFolio.startsWith('CAF-') || rawFolio.startsWith('PAS-');
      const baseFolio = isPosFolio ? rawFolio.replace(/^(CAF-|PAS-)/, '') : null;

      // Clave única por cobro (une CAF-123456 y PAS-123456 en un mismo registro)
      const groupKey = baseFolio ? `POS_${baseFolio}` : `TX_${tx.id}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          id: groupKey,
          baseFolio,
          folios: [],
          referenceId: tx.referenceId,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          totalAmount: 0,
          cafeteriaAmount: 0,
          pasteleriaAmount: 0,
          descriptions: [],
          modificaciones: [],
          rawTransactions: []
        });
      }

      const group = groupsMap.get(groupKey);
      const amt = Number(tx.amount) || 0;

      if (tx.folio && !group.folios.includes(tx.folio)) {
        group.folios.push(tx.folio);
      }

      group.totalAmount += amt;
      if (tx.source === 'PASTELERIA') {
        group.pasteleriaAmount += amt;
      } else {
        group.cafeteriaAmount += amt;
      }

      const partes = String(tx.description || '').split(' | ');
      const descOriginal = partes[0]?.trim();
      const mods = partes.slice(1).filter((m) => !m.includes('Ticket Mixto'));

      if (descOriginal && !group.descriptions.includes(descOriginal)) {
        group.descriptions.push(descOriginal);
      }
      mods.forEach((m) => {
        if (!group.modificaciones.includes(m)) group.modificaciones.push(m);
      });

      group.rawTransactions.push(tx);
    });

    return Array.from(groupsMap.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [ingresosTotales]);

  // 📊 KPIs del Resumen Ejecutivo Superior
  const summaryMetrics = useMemo(() => {
    let totalNeto = 0;
    let totalCafeteria = 0;
    let totalPasteleria = 0;

    groupedSales.forEach((sale) => {
      totalNeto += sale.totalAmount;
      totalCafeteria += sale.cafeteriaAmount;
      totalPasteleria += sale.pasteleriaAmount;
    });

    return {
      totalVentasCount: groupedSales.length,
      totalNeto,
      totalCafeteria,
      totalPasteleria
    };
  }, [groupedSales]);

  // Helper para extraer origen, cuenta y productos vendidos de cada cobro
  const resolveSaleDetails = (sale) => {
    const mainDesc = sale.descriptions[0] || '';
    const orderObj = (vendidosOrders || []).find((o) => o.id === sale.referenceId);

    // Detectar si fue cobro de una cuenta específica ("Cuenta: Nombre")
    let cuentaPagada = null;
    const cuentaMatch = mainDesc.match(/Cuenta:\s*([^\[\|]+?)(?:\s+\[Promo|\s+(?:CAF|PAS)-|$)/i);
    if (cuentaMatch && cuentaMatch[1]) {
      cuentaPagada = cuentaMatch[1].trim();
    }

    // Detectar descuento de promoción aplicado al ticket
    let promoText = null;
    const promoMatch = mainDesc.match(/\[(Promo\s*-\$[\d.]+)\]/i);
    if (promoMatch && promoMatch[1]) {
      promoText = promoMatch[1];
    }

    // Título principal (Mesa #X, Mostrador, Para Llevar #X o Pedido Pastelería)
    let tituloOrigen = 'Cobro Registrado';
    const parenMatch = mainDesc.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1]) {
      tituloOrigen = parenMatch[1];
    } else if (String(sale.referenceId || '').startsWith('PED-')) {
      tituloOrigen = `Pedido ${sale.referenceId}`;
    } else if (orderObj?.table?.number) {
      tituloOrigen = `Mesa #${orderObj.table.number}`;
    } else if (orderObj?.ticketId) {
      tituloOrigen = orderObj.ticketId.toUpperCase().includes('MOSTRADOR')
        ? 'Mostrador'
        : orderObj.ticketId.split(' - ')[0];
    }

    // Subtítulo de la cuenta o cliente
    let etiquetaCuenta = cuentaPagada ? `Cuenta: ${cuentaPagada}` : 'Cuenta General';
    if (String(sale.referenceId || '').startsWith('PED-')) {
      const clienteMatch = mainDesc.match(/Pedido:\s*(.*?)\s+PED-/i);
      etiquetaCuenta = clienteMatch?.[1]
        ? `Cliente: ${clienteMatch[1]}`
        : 'Anticipo / Abono Pastelería';
    }

    // Productos asociados a esta venta
    let itemsVendidos = [];
    if (orderObj && Array.isArray(orderObj.items)) {
      const activeOrderItems = orderObj.items.filter(
        (i) => i.status === 'ACTIVE' || !i.status
      );
      if (cuentaPagada) {
        itemsVendidos = activeOrderItems.filter(
          (i) =>
            parseCleanAccount(i.cuenta).toLowerCase() === cuentaPagada.toLowerCase()
        );
      } else {
        itemsVendidos = activeOrderItems;
      }
    }

    return {
      tituloOrigen,
      etiquetaCuenta,
      promoText,
      itemsVendidos,
       limpiarDesc: mainDesc
        .replace(/\s*(CAF|PAS)-\d+/g, '')
        .replace(/\s*\[Promo\s*-\$[\d.]+\]/i, '')
        .trim()
    };
  };

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
              <div className="flex items-center gap-3 text-[#24d366]">
                <div className="p-2 bg-[#24d366]/10 rounded-xl">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text leading-tight">
                    Vendidos Hoy
                  </h2>
                  <p className="text-xs font-medium text-gray-400">
                    Flujo de cobros y desglose por caja
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
              {/* RESUMEN EJECUTIVO SUPERIOR */}
              {groupedSales.length > 0 && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/60 lya:bg-lya-bg border border-gray-200/70 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-[#24d366]/10 text-[#24d366]">
                        <ShoppingBag size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Ventas Realizadas
                        </p>
                        <p className="text-base font-black text-gray-900 dark:text-white lya:text-lya-text">
                          {summaryMetrics.totalVentasCount}{' '}
                          {summaryMetrics.totalVentasCount === 1 ? 'cobro' : 'cobros'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 border-l border-gray-200 dark:border-gray-700 pl-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Receipt size={18} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                          Ingreso Neto
                        </p>
                        <p className="text-base font-black text-[#24d366]">
                          ${summaryMetrics.totalNeto.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DISTRIBUCIÓN POR CAJA (CAFETERÍA VS PASTELERÍA) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-orange-50/70 dark:bg-orange-950/20 border border-orange-200/60 dark:border-orange-900/30">
                      <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400">
                        <Coffee size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          Caja Cafetería
                        </span>
                      </div>
                      <span className="text-xs font-black text-orange-700 dark:text-orange-300">
                        ${summaryMetrics.totalCafeteria.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-pink-50/70 dark:bg-pink-950/20 border border-pink-200/60 dark:border-pink-900/30">
                      <div className="flex items-center gap-1.5 text-pink-600 dark:text-pink-400">
                        <CakeSlice size={14} />
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          Caja Pastelería
                        </span>
                      </div>
                      <span className="text-xs font-black text-pink-700 dark:text-pink-300">
                        ${summaryMetrics.totalPasteleria.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* LISTA DE VENTAS UNIFICADAS */}
              {groupedSales.length > 0 ? (
                <div>
                  <h3 className="text-xs font-black uppercase text-gray-400 tracking-widest mb-3">
                    Historial de Cobros ({groupedSales.length})
                  </h3>
                  <div className="space-y-3">
                    {groupedSales.map((sale) => {
                      const esReembolso = sale.totalAmount < 0;
                      const isMixed =
                        sale.cafeteriaAmount > 0 && sale.pasteleriaAmount > 0;
                      const {
                        tituloOrigen,
                        etiquetaCuenta,
                        promoText,
                        itemsVendidos,
                        limpiarDesc
                      } = resolveSaleDetails(sale);

                      const metodoTexto =
                        sale.paymentMethod === 'CASH'
                          ? 'Efectivo'
                          : sale.paymentMethod === 'CARD'
                          ? 'Tarjeta'
                          : 'Transferencia';

                      return (
                        <div
                          key={sale.id}
                          className={`p-4 border rounded-2xl transition-all shadow-sm ${
                            esReembolso
                              ? 'border-red-200/80 dark:border-red-900/40 bg-red-50/60 dark:bg-red-950/20'
                              : 'border-green-200/80 dark:border-green-900/40 bg-green-50/50 dark:bg-green-950/20'
                          }`}
                        >
                          {/* CABECERA DE LA TARJETA */}
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`p-2 rounded-xl shadow-sm shrink-0 flex items-center justify-center border ${
                                  esReembolso
                                    ? 'bg-white dark:bg-gray-800 text-red-500 border-red-100 dark:border-red-900/50'
                                    : 'bg-white dark:bg-gray-800 text-[#24d366] border-green-100 dark:border-green-900/50'
                                }`}
                              >
                                {esReembolso ? (
                                  <RotateCcw size={18} />
                                ) : sale.paymentMethod === 'CASH' ? (
                                  <Banknote size={18} />
                                ) : sale.paymentMethod === 'CARD' ? (
                                  <CreditCard size={18} />
                                ) : (
                                  <ArrowRightLeft size={18} />
                                )}
                              </div>
                              <div>
                                <span className="font-black text-gray-900 dark:text-white lya:text-lya-text text-base block leading-tight">
                                  {tituloOrigen}
                                </span>
                                {sale.folios.length > 0 && (
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                    {sale.folios.join(' • ')}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end">
                              <span
                                className={`text-base font-black ${
                                  esReembolso ? 'text-red-500' : 'text-[#24d366]'
                                }`}
                              >
                                {esReembolso
                                  ? `-$${Math.abs(sale.totalAmount).toFixed(2)}`
                                  : `+$${sale.totalAmount.toFixed(2)}`}
                              </span>
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded uppercase mt-0.5 ${
                                  esReembolso
                                    ? 'text-red-500 bg-red-100 dark:bg-red-900/40'
                                    : 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40'
                                }`}
                              >
                                {esReembolso ? 'Reembolso' : metodoTexto}
                              </span>
                            </div>
                          </div>

                          {/* INSIGNIAS DE CUENTA Y REPARTO A CAJAS */}
                          <div className="flex flex-wrap items-center gap-1.5 mb-3">
                            <div className="inline-flex items-center bg-white dark:bg-gray-800 lya:bg-lya-bg border border-green-200 dark:border-green-900/50 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg shadow-sm">
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                {etiquetaCuenta}
                              </span>
                            </div>

                            {sale.cafeteriaAmount !== 0 && (
                              <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/40">
                                ☕ Cafetería: ${sale.cafeteriaAmount.toFixed(2)}
                              </span>
                            )}

                            {sale.pasteleriaAmount !== 0 && (
                              <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-pink-100/80 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-200/60 dark:border-pink-800/40">
                                🎂 Pastelería: ${sale.pasteleriaAmount.toFixed(2)}
                              </span>
                            )}

                            {isMixed && (
                              <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                🔗 Mixto
                              </span>
                            )}

                            {promoText && (
                              <span className="text-[9px] font-black uppercase px-2 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                🏷️ {promoText}
                              </span>
                            )}
                          </div>

                          {/* 🔥 DESGLOSE DE PRODUCTOS VENDIDOS EN ESTA CUENTA */}
                          {itemsVendidos.length > 0 ? (
                            <div className="mb-3 bg-white/90 dark:bg-gray-900/60 lya:bg-lya-bg rounded-xl p-2.5 border border-green-100 dark:border-green-900/30 space-y-1.5">
                              <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                Productos cobrados (
                                {itemsVendidos.reduce(
                                  (s, i) => s + (Number(i.quantity) || 1),
                                  0
                                )}
                                )
                              </p>
                              {itemsVendidos.map((item) => {
                                const esPasteleria = isPasteleriaDept(
                                  item.product?.departamento
                                );
                                return (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-gray-100 dark:border-gray-800"
                                  >
                                    <div className="flex items-center gap-1.5 pr-2">
                                      <span className="font-black text-emerald-600">
                                        {item.quantity}x
                                      </span>
                                      <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text">
                                        {item.product?.name || 'Producto'}
                                      </span>
                                      <span
                                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                          esPasteleria
                                            ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400'
                                            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                                        }`}
                                      >
                                        {esPasteleria ? 'Pastelería' : 'Cafetería'}
                                      </span>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300 shrink-0">
                                      ${Number(item.subtotal || 0).toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[11px] text-gray-500 font-medium leading-snug mb-2">
                              {limpiarDesc}
                            </p>
                          )}

                          {/* HISTORIAL DE AJUSTES PARCIALES O RESTAURACIONES */}
                          {sale.modificaciones.length > 0 && (
                            <div className="flex flex-col gap-1 mb-2.5">
                              {sale.modificaciones.map((mod, i) => {
                                const isRestaurado = mod.includes('📈');
                                return (
                                  <span
                                    key={i}
                                    className={`text-[9px] font-black px-2 py-0.5 rounded-md border w-fit flex items-center shadow-sm ${
                                      isRestaurado
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
                                        : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50'
                                    }`}
                                  >
                                    {mod}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* HORA DEL COBRO */}
                          <div className="flex items-center gap-2 mt-2">
                            <span className="bg-green-100 dark:bg-green-900/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                              🕒{' '}
                              {new Date(sale.createdAt).toLocaleTimeString('es-MX', {
                                timeZone: 'America/Mexico_City',
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
              ) : (
                <div className="text-center text-gray-400 mt-10">
                  <ShoppingBag size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="font-bold">Aún no hay ventas</p>
                  <p className="text-xs">
                    Los cobros realizados hoy aparecerán aquí detallados.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};