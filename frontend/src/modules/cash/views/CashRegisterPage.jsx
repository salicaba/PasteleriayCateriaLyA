// src/modules/cash/views/CashRegisterPage.jsx
import React, { useState, useMemo } from 'react';
import { useCashController } from '../controllers/useCashController';
import {
  Calculator,
  XCircle,
  Coffee,
  Cake,
  Calendar as CalendarIcon,
  UserCheck,
  RotateCcw,
  Filter,
  AlertTriangle,
  Banknote,
  Landmark,
  Eye,
  EyeOff,
  Loader2,
  Search,
  CheckCircle2,
  Link2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

const formatSourceLabel = (source) => {
  if (source === 'CAFETERIA') return 'CAFETERÍA';
  if (source === 'PASTELERIA') return 'PASTELERÍA';
  return source || 'CAJA';
};

export const CashRegisterPage = ({ user }) => {
  const { 
    transactions, loading, selectedDate, setSelectedDate, resumen, 
    handleCancelTransaction, handleRestoreTransaction,
    confirmModal, closeConfirmModal, executeConfirmAction 
  } = useCashController(user);

  const [filterSource, setFilterSource] = useState('ALL');
  const [showModDetails, setShowModDetails] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const setToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  const handleFilterChange = (source) => {
    setFilterSource(source);
  };

  // REGLA ESTRICTA DE NEGOCIO: Solo Efectivo y Transferencia
  const getPaymentInfo = (tx) => {
    const methodStr = String(tx.paymentMethod || '').toUpperCase();
    const isTransfer = methodStr === 'TRANSFER' || tx.description?.toLowerCase().includes('transferencia');

    if (isTransfer) {
      return {
        label: 'Transferencia',
        icon: Landmark,
        color: 'text-blue-600 dark:text-blue-400 lya:text-blue-700',
        bg: 'bg-blue-100 dark:bg-blue-500/20 lya:bg-blue-100'
      };
    }
    
    return {
      label: 'Efectivo',
      icon: Banknote,
      color: 'text-emerald-600 dark:text-emerald-400 lya:text-emerald-700',
      bg: 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-emerald-100'
    };
  };

  const activeTransactions = useMemo(
    () => transactions.filter(tx => tx.status === 'ACTIVE'),
    [transactions]
  );

  const paymentStats = useMemo(() => {
    return activeTransactions.reduce((acc, tx) => {
      const amount = parseFloat(tx.amount) || 0;
      const info = getPaymentInfo(tx);
      
      if (info.label === 'Efectivo') acc.efectivo += amount;
      else acc.digital += amount;
      
      return acc;
    }, { efectivo: 0, digital: 0 });
  }, [activeTransactions]);

  const handleConfirmLock = async () => {
    setIsProcessing(true);
    try {
      await executeConfirmAction();
    } finally {
      setIsProcessing(false);
    }
  };

  // 🔥 MOTOR DE AGRUPACIÓN INTELIGENTE (Unifica Tickets Mixtos CAF+PAS)
  const groupedMovements = useMemo(() => {
    const groupsMap = new Map();

    transactions.forEach((tx) => {
      const rawFolio = String(tx.folio || '');
      const isPosFolio = rawFolio.startsWith('CAF-') || rawFolio.startsWith('PAS-');
      const baseFolio = isPosFolio ? rawFolio.replace(/^(CAF-|PAS-)/, '') : null;

      const groupKey = baseFolio ? `POS_${baseFolio}` : `TX_${tx.id}`;

      if (!groupsMap.has(groupKey)) {
        groupsMap.set(groupKey, {
          id: groupKey,
          rawTxId: tx.id,
          baseFolio,
          folios: [],
          sources: [],
          referenceId: tx.referenceId,
          paymentMethod: tx.paymentMethod,
          createdAt: tx.createdAt,
          creator: tx.creator,
          canceller: tx.canceller,
          totalActiveAmount: 0,
          cafeteriaActiveAmount: 0,
          pasteleriaActiveAmount: 0,
          totalCancelledAmount: 0,
          hasActiveTx: false,
          allCancelled: true,
          descriptions: [],
          modificaciones: [],
          posOrder: tx.posOrder || null,
          pasteleriaOrder: tx.pasteleriaOrder || null,
          rawTransactions: []
        });
      }

      const group = groupsMap.get(groupKey);
      const amt = parseFloat(tx.amount) || 0;
      const isCancelled = tx.status === 'CANCELLED';

      if (tx.folio && !group.folios.includes(tx.folio)) {
        group.folios.push(tx.folio);
      }
      if (tx.source && !group.sources.includes(tx.source)) {
        group.sources.push(tx.source);
      }
      if (!group.posOrder && tx.posOrder) group.posOrder = tx.posOrder;
      if (!group.pasteleriaOrder && tx.pasteleriaOrder) group.pasteleriaOrder = tx.pasteleriaOrder;
      if (!group.canceller && tx.canceller) group.canceller = tx.canceller;

      if (!isCancelled) {
        group.hasActiveTx = true;
        group.allCancelled = false;
        group.totalActiveAmount += amt;
        if (tx.source === 'CAFETERIA') group.cafeteriaActiveAmount += amt;
        if (tx.source === 'PASTELERIA') group.pasteleriaActiveAmount += amt;
      } else {
        group.totalCancelledAmount += Math.abs(amt);
      }

      const partes = String(tx.description || '').split(' | ');
      const descOriginal = partes[0]?.trim();
      const mods = partes.slice(1).filter((m) => !m.includes('Ticket Mixto'));

      if (descOriginal && !group.descriptions.includes(descOriginal)) {
        group.descriptions.push(descOriginal);
      }
      mods.forEach((m) => {
        if (!group.modificaciones.includes(m)) {
          group.modificaciones.push(m);
        }
      });

      group.rawTransactions.push(tx);
    });

    return Array.from(groupsMap.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [transactions]);

  // 🔥 FILTRADO POR CAJA Y BÚSQUEDA
  const filteredMovements = useMemo(() => {
    return groupedMovements.filter((group) => {
      if (filterSource !== 'ALL') {
        const hasSource = group.rawTransactions.some((t) => t.source === filterSource);
        if (!hasSource) return false;
      }

      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const descMatch = group.descriptions.some((d) => d.toLowerCase().includes(term));
        const folioMatch = group.folios.some((f) => f.toLowerCase().includes(term));
        const refMatch = String(group.referenceId || '').toLowerCase().includes(term);
        const amountMatch =
          String(group.totalActiveAmount).includes(term) ||
          String(group.cafeteriaActiveAmount).includes(term) ||
          String(group.pasteleriaActiveAmount).includes(term);

        const posProductMatch = (group.posOrder?.items || []).some((i) =>
          (i.product?.name || '').toLowerCase().includes(term)
        );
        const pasteleriaClientMatch =
          (group.pasteleriaOrder?.cliente || '').toLowerCase().includes(term) ||
          (group.pasteleriaOrder?.categoria || '').toLowerCase().includes(term);

        if (
          !descMatch &&
          !folioMatch &&
          !refMatch &&
          !amountMatch &&
          !posProductMatch &&
          !pasteleriaClientMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [groupedMovements, filterSource, searchTerm]);

  // Helper para estructurar los datos visuales sin duplicar textos
  const buildMovementPresentation = (group) => {
    const mainDesc = group.descriptions[0] || '';
    const isPasteleriaOrder =
      String(group.referenceId || '').startsWith('PED-') || Boolean(group.pasteleriaOrder);
    const isMixedPos =
      group.sources.includes('CAFETERIA') && group.sources.includes('PASTELERIA');

    // --- CASO 1: PEDIDO ESPECIAL DE PASTELERÍA (PED-xxxxxx) ---
    if (isPasteleriaOrder) {
      const ped = group.pasteleriaOrder;
      let tipoOp = 'Movimiento de Pedido';
      let badgeStyle =
        'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800/50';

      if (mainDesc.toLowerCase().startsWith('anticipo')) {
        tipoOp = '🎂 Anticipo Inicial';
        badgeStyle =
          'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50';
      } else if (mainDesc.toLowerCase().startsWith('abono')) {
        tipoOp = '💳 Abono Parcial';
        badgeStyle =
          'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50';
      } else if (mainDesc.toLowerCase().startsWith('liquidaci')) {
        tipoOp = '✅ Liquidación Final';
        badgeStyle =
          'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50';
      } else if (group.totalActiveAmount < 0 || mainDesc.toLowerCase().includes('devoluci')) {
        tipoOp = '↩️ Devolución por Ajuste';
        badgeStyle =
          'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50';
      }

      const clienteNombre =
        ped?.cliente ||
        mainDesc.match(/Pedido:\s*(.*?)\s+PED-/i)?.[1] ||
        'Público General';

      const costoTotalPed = parseFloat(ped?.costoTotal || 0);
      const totalAbonadoPed =
        ped?.abonos?.reduce((s, a) => s + (parseFloat(a.monto) || 0), 0) || 0;
      const restaPed = Math.max(0, costoTotalPed - totalAbonadoPed);

      const porcionesList = Array.isArray(ped?.porciones)
        ? ped.porciones
        : ped?.porciones
        ? [ped.porciones]
        : [];
      const saboresList = Array.isArray(ped?.saborPan)
        ? ped.saborPan
        : ped?.saborPan
        ? [ped.saborPan]
        : [];

      return {
        kind: 'PASTELERIA_ORDER',
        tituloPrincipal: `Pedido ${group.referenceId || ''}`,
        subtituloCuenta: `Cliente: ${clienteNombre}${ped?.telefono ? ` • Cel: ${ped.telefono}` : ''}`,
        tipoOp,
        badgeStyle,
        costoTotalPed,
        totalAbonadoPed,
        restaPed,
        categoriaPastel: ped?.categoria || 'Pastel Personalizado',
        descripcionPastel: ped?.descripcion || null,
        porcionesList,
        saboresList,
        cleanDesc: mainDesc
      };
    }

    // --- CASO 2: VENTA DE PUNTO DE VENTA (MESAS, LLEVAR, MOSTRADOR, MIXTOS) ---
    const posOrder = group.posOrder;
    let cuentaPagada = null;
    const cuentaMatch = mainDesc.match(/Cuenta:\s*([^\[\|]+?)(?:\s+\[Promo|\s+(?:CAF|PAS)-|$)/i);
    if (cuentaMatch && cuentaMatch[1]) {
      cuentaPagada = cuentaMatch[1].trim();
    }

    let promoText = null;
    const promoMatch = mainDesc.match(/\[(Promo\s*-\$[\d.]+)\]/i);
    if (promoMatch && promoMatch[1]) {
      promoText = promoMatch[1];
    }

    let tituloPrincipal = 'Cobro en Punto de Venta';
    const parenMatch = mainDesc.match(/\((.*?)\)/);
    if (parenMatch && parenMatch[1]) {
      tituloPrincipal = parenMatch[1];
    } else if (posOrder?.table?.number) {
      tituloPrincipal = `Mesa #${posOrder.table.number}`;
    } else if (posOrder?.ticketId) {
      tituloPrincipal = posOrder.ticketId.toUpperCase().includes('MOSTRADOR')
        ? 'Mostrador'
        : posOrder.ticketId.split(' - ')[0];
    } else if (group.sources.includes('MANUAL')) {
      tituloPrincipal = 'Movimiento Manual';
    }

    // 🔥 Estandarizamos "CUENTA GENERAL" sin dos puntos, y "CUENTA: NOMBRE" solo para personalizadas
    const cleanAccountName = parseCleanAccount(cuentaPagada);
    const isGeneralAccount =
      !cuentaPagada ||
      cleanAccountName.toUpperCase() === 'GENERAL' ||
      cleanAccountName.toUpperCase() === 'CUENTA GENERAL';
    const subtituloCuenta = isGeneralAccount
      ? 'CUENTA GENERAL'
      : `CUENTA: ${cleanAccountName.toUpperCase()}`;

    let itemsVendidos = [];
    if (posOrder && Array.isArray(posOrder.items)) {
      const validItems = posOrder.items.filter((i) => i.status === 'ACTIVE' || !i.status);

      let accountFilteredItems = validItems;
      if (cuentaPagada) {
        const matched = validItems.filter(
          (i) => parseCleanAccount(i.cuenta).toLowerCase() === cleanAccountName.toLowerCase()
        );
        if (matched.length > 0) accountFilteredItems = matched;
      }

      // Si el usuario está filtrando por una caja específica (Cafetería o Pastelería), filtramos solo los productos de esa caja
      if (filterSource === 'CAFETERIA') {
        accountFilteredItems = accountFilteredItems.filter(
          (i) => !isPasteleriaDept(i.product?.departamento)
        );
      } else if (filterSource === 'PASTELERIA') {
        accountFilteredItems = accountFilteredItems.filter((i) =>
          isPasteleriaDept(i.product?.departamento)
        );
      }

      // 🔥 Agrupamos productos idénticos para que no se repitan renglones del mismo producto
      const groupedItemsMap = new Map();
      accountFilteredItems.forEach((item) => {
        const prodName = item.product?.name || 'Producto';
        const dept = item.product?.departamento || 'cafeteria';
        const key = `${item.productId || prodName}_${dept}`;

        if (!groupedItemsMap.has(key)) {
          groupedItemsMap.set(key, {
            id: item.id,
            quantity: Number(item.quantity) || 1,
            subtotal: Number(item.subtotal) || 0,
            product: item.product
          });
        } else {
          const existing = groupedItemsMap.get(key);
          existing.quantity += Number(item.quantity) || 1;
          existing.subtotal += Number(item.subtotal) || 0;
        }
      });

      itemsVendidos = Array.from(groupedItemsMap.values());
    }

    const cleanDesc = mainDesc
      .replace(/\s*(CAF|PAS)-\d+/g, '')
      .replace(/\s*\[Promo\s*-\$[\d.]+\]/i, '')
      .trim();

    return {
      kind: group.sources.includes('MANUAL') ? 'MANUAL' : 'POS_ORDER',
      isMixedPos,
      tituloPrincipal,
      subtituloCuenta,
      promoText,
      itemsVendidos,
      cleanDesc
    };
  };

  if (loading) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg overflow-hidden">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800"
        >
          <Calculator size={40} className="text-orange-500" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Caja
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500" /> Sincronizando movimientos...
        </p>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" } }
  };

  const todayForLimit = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
  const maxDateLimit = `${todayForLimit.getFullYear()}-${String(todayForLimit.getMonth() + 1).padStart(2, '0')}-${String(todayForLimit.getDate()).padStart(2, '0')}`;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full w-full flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 relative overflow-hidden"
    >
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 lya:shadow-lya-primary/20">
            <Calculator size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Caja</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Control de ingresos, tickets mixtos y pedidos de Cafetería y Pastelería</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={setToday}
            className="w-full sm:w-auto px-5 py-3.5 bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold rounded-xl md:hover:bg-orange-200 dark:md:hover:bg-orange-500/30 transition-all shadow-sm transform md:hover:-translate-y-0.5 lya:bg-lya-primary/10 lya:text-lya-primary lya:hover:bg-lya-primary/20"
          >
            Hoy
          </motion.button>

          <div className="flex w-full sm:w-auto items-center bg-gray-50 dark:bg-gray-800 p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner lya:bg-lya-bg lya:border-lya-border/40 focus-within:ring-2 focus-within:ring-orange-500 lya:focus-within:ring-lya-primary transition-all relative">
            <CalendarIcon size={20} className="text-gray-400 lya:text-lya-text/50 mx-2 shrink-0 pointer-events-none" />
            <input 
              id="cash-date-picker"
              type="date" 
              value={selectedDate}
              max={maxDateLimit}
              onChange={(e) => setSelectedDate(e.target.value)}
              onClick={(e) => e.stopPropagation()} 
              className="bg-transparent border-none text-gray-700 dark:text-white lya:text-lya-text font-bold outline-none cursor-pointer w-full
                [&::-webkit-calendar-picker-indicator]:opacity-0 
                [&::-webkit-calendar-picker-indicator]:absolute 
                [&::-webkit-calendar-picker-indicator]:inset-0 
                [&::-webkit-calendar-picker-indicator]:w-full 
                [&::-webkit-calendar-picker-indicator]:h-full 
                [&::-webkit-calendar-picker-indicator]:cursor-pointer z-10"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </header>

      {/* KPIs */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6 shrink-0"
      >
        <motion.div variants={cardVariants} className="col-span-2 md:col-span-1 bg-gray-900 dark:bg-gray-800 lya:bg-[#03543F] text-white rounded-[2rem] p-5 shadow-lg relative overflow-hidden transform transition-all md:hover:-translate-y-1">
          <p className="text-gray-400 lya:text-emerald-100 text-[10px] font-black uppercase tracking-wider mb-1">Total del Día</p>
          <h2 className="text-3xl font-black">${resumen.total.toFixed(2)}</h2>
          <Calculator className="absolute -right-4 -bottom-4 opacity-10 w-20 h-20" />
        </motion.div>

        <motion.div variants={cardVariants} className="col-span-2 md:col-span-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Banknote size={16}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Efectivo</span>
          </div>
          <h2 className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 lya:text-[#03543F]">${paymentStats.efectivo.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="col-span-2 md:col-span-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-blue-500 mb-1">
            <Landmark size={16}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Transferencias</span>
          </div>
          <h2 className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 lya:text-blue-600">${paymentStats.digital.toFixed(2)}</h2>
        </motion.div>
        
        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-orange-500 mb-1">
            <Coffee size={14}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Cafetería</span>
          </div>
          <h2 className="text-xl font-extrabold text-orange-600 dark:text-orange-400 lya:text-[#9B1C1C]">${resumen.cafeteria.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-pink-500 mb-1">
            <Cake size={14}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Pastelería</span>
          </div>
          <h2 className="text-xl font-extrabold text-pink-600 dark:text-pink-400 lya:text-[#9D174D]">${resumen.pasteleria.toFixed(2)}</h2>
        </motion.div>

        <motion.div variants={cardVariants} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] p-5 shadow-sm lya:bg-lya-surface lya:border-lya-border/30 transform transition-all md:hover:-translate-y-1">
          <div className="flex items-center gap-2 text-red-500 mb-1">
            <XCircle size={14}/> 
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 lya:text-lya-text/50">Anulado</span>
          </div>
          <h2 className="text-xl font-extrabold text-red-600 dark:text-red-400 lya:text-red-600">${resumen.anulados.toFixed(2)}</h2>
        </motion.div>
      </motion.div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="mb-4 bg-white dark:bg-gray-900 lya:bg-lya-surface p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <h3 className="text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold flex items-center gap-2 pl-2 whitespace-nowrap">
          <Filter size={18} className="text-gray-400 lya:text-lya-text/50" /> Movimientos ({filteredMovements.length})
        </h3>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto overflow-x-auto custom-scrollbar p-1">
          
          <div className="relative w-full sm:w-72 flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400 lya:text-lya-text/50" />
            </div>
            <input
              type="text"
              placeholder="Buscar folio, cliente o producto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 rounded-xl text-sm font-bold text-gray-800 dark:text-white lya:text-lya-text focus:outline-none focus:ring-2 focus:ring-orange-500/30 lya:focus:ring-lya-primary/30 transition-all placeholder-gray-400"
            />
          </div>

          <div className="flex bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-1 rounded-xl border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 w-full sm:w-auto flex-shrink-0">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFilterChange('ALL')}
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all ${filterSource === 'ALL' ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text shadow-sm' : 'text-gray-500 md:hover:text-gray-700 dark:md:hover:text-gray-300 lya:text-lya-text/50 lya:md:hover:text-lya-text/80'}`}
            >
              Todos
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFilterChange('CAFETERIA')}
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'CAFETERIA' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 shadow-sm lya:bg-[#FDE8E8] lya:text-[#9B1C1C]' : 'text-gray-500 md:hover:text-orange-500 lya:text-lya-text/50 lya:md:hover:text-[#9B1C1C]'}`}
            >
              <Coffee size={14} /> Cafetería
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFilterChange('PASTELERIA')}
              className={`flex-1 sm:flex-none px-5 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1.5 ${filterSource === 'PASTELERIA' ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 shadow-sm lya:bg-[#FCE8F3] lya:text-[#9D174D]' : 'text-gray-500 md:hover:text-pink-500 lya:text-lya-text/50 lya:md:hover:text-[#9D174D]'}`}
            >
              <Cake size={14} /> Pastelería
            </motion.button>
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowModDetails(!showModDetails)}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-black rounded-xl transition-all w-full sm:w-auto flex-shrink-0 ${
              showModDetails 
                ? 'bg-orange-100 text-orange-600 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50 lya:bg-lya-primary/10 lya:text-lya-primary lya:border-lya-primary/20' 
                : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 lya:bg-lya-surface lya:border-lya-border/40 md:hover:bg-gray-50 dark:md:hover:bg-gray-700 lya:md:hover:bg-lya-bg/50'
            } border shadow-sm`}
          >
            {showModDetails ? <EyeOff size={14}/> : <Eye size={14}/>}
            {showModDetails ? 'Ocultar Desglose' : 'Ver Desglose'}
          </motion.button>
        </div>
      </div>

      {/* TABLA PRINCIPAL SIN REPETICIONES */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col overflow-hidden relative lya:bg-lya-surface lya:border-lya-border/30 mb-4 min-h-[300px]">
        <div className="overflow-y-auto custom-scrollbar flex-1 relative z-10">
          <table className="w-full text-left border-collapse relative min-w-max">
            <thead className="bg-gray-100 dark:bg-gray-950 lya:bg-lya-bg sticky top-0 z-20 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/30">
              <tr>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Hora</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Origen / Caja</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider lya:text-lya-text/50">Desglose del Movimiento</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider text-right lya:text-lya-text/50">Monto</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider text-center lya:text-lya-text/50">Estado</th>
                <th className="p-5 text-xs font-black text-gray-400 uppercase tracking-wider text-center lya:text-lya-text/50">Acciones</th>
              </tr>
            </thead>
            
            <AnimatePresence mode="wait">
              {filteredMovements.length === 0 && !loading ? (
                <motion.tbody 
                  key="empty-state"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10"
                >
                  <tr>
                    <td colSpan="6" className="text-center py-16 text-gray-400 font-medium lya:text-lya-text/50">
                      {searchTerm !== '' 
                        ? `No se encontraron resultados para "${searchTerm}"`
                        : filterSource === 'ALL' 
                          ? 'No hay movimientos registrados en esta fecha.' 
                          : `No hay movimientos de ${formatSourceLabel(filterSource).toLowerCase()} en esta fecha.`
                      }
                    </td>
                  </tr>
                </motion.tbody>
              ) : (
                <motion.tbody 
                  key={filterSource + searchTerm}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="divide-y divide-gray-100 dark:divide-gray-800 lya:divide-lya-border/10"
                >
                  {filteredMovements.map((group) => {
                    const isCancelled = group.allCancelled;
                    const creatorName = group.creator 
                      ? (group.creator.fullName?.split(' ')[0] || group.creator.username) 
                      : 'Sistema';
                    
                    const payInfo = getPaymentInfo(group.rawTransactions[0] || {});
                    const details = buildMovementPresentation(group);

                    let displayAmount = group.totalActiveAmount;
                    if (isCancelled) {
                      displayAmount = group.totalCancelledAmount;
                    } else if (filterSource === 'CAFETERIA') {
                      displayAmount = group.cafeteriaActiveAmount;
                    } else if (filterSource === 'PASTELERIA') {
                      displayAmount = group.pasteleriaActiveAmount;
                    }

                    const isNegative = !isCancelled && displayAmount < 0;
                    const absAmount = Math.abs(displayAmount).toFixed(2);
                    const isManual = group.sources.includes('MANUAL');
                    // Solo mostramos la etiqueta de departamento por producto cuando estamos viendo un ticket mixto en la pestaña "Todos"
                    const showProductDeptBadge = details.isMixedPos && filterSource === 'ALL';

                    return (
                      <tr 
                        key={group.id} 
                        className={`align-top ${isCancelled ? 'bg-red-50/40 dark:bg-red-900/5 lya:bg-red-500/5' : 'md:hover:bg-gray-50/80 dark:md:hover:bg-gray-800/40 lya:md:hover:bg-lya-bg/40'} transition-colors`}
                      >
                        {/* 1. HORA */}
                        <td className="p-5 text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 whitespace-nowrap">
                          {new Date(group.createdAt).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>

                        {/* 2. ORIGEN / CAJA (Con desglose de montos aquí mismo si es Ticket Mixto) */}
                        <td className="p-5">
                          <div className="flex flex-col gap-1.5">
                            {details.isMixedPos && filterSource === 'ALL' ? (
                              <>
                                <span className="px-2.5 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg flex items-center gap-1.5 w-fit bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                                  <Link2 size={12} /> Ticket Mixto
                                </span>
                                <div className="flex flex-col gap-1">
                                  {group.cafeteriaActiveAmount !== 0 && (
                                    <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded-md flex items-center gap-1 w-fit bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 lya:bg-[#FDE8E8] lya:text-[#9B1C1C]">
                                      <Coffee size={10} /> Cafetería: ${group.cafeteriaActiveAmount.toFixed(2)}
                                    </span>
                                  )}
                                  {group.pasteleriaActiveAmount !== 0 && (
                                    <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded-md flex items-center gap-1 w-fit bg-pink-100/80 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 lya:bg-[#FCE8F3] lya:text-[#9D174D]">
                                      <Cake size={10} /> Pastelería: ${group.pasteleriaActiveAmount.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                {(() => {
                                  const activeSource =
                                    filterSource !== 'ALL'
                                      ? filterSource
                                      : group.sources[0] || 'CAFETERIA';
                                  return (
                                    <span
                                      className={`px-3 py-1.5 text-[10px] uppercase font-black tracking-wider rounded-lg flex items-center gap-1.5 w-fit ${
                                        activeSource === 'CAFETERIA'
                                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 lya:bg-[#FDE8E8] lya:text-[#9B1C1C]'
                                          : activeSource === 'PASTELERIA'
                                          ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 lya:bg-[#FCE8F3] lya:text-[#9D174D]'
                                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                      }`}
                                    >
                                      {activeSource === 'CAFETERIA' ? (
                                        <Coffee size={12} />
                                      ) : activeSource === 'PASTELERIA' ? (
                                        <Cake size={12} />
                                      ) : (
                                        <Calculator size={12} />
                                      )}
                                      {formatSourceLabel(activeSource)}
                                    </span>
                                  );
                                })()}
                                {details.isMixedPos && filterSource !== 'ALL' && (
                                  <span className="px-2 py-0.5 text-[9px] uppercase font-black tracking-wider rounded-md flex items-center gap-1 w-fit bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/40">
                                    <Link2 size={10} /> Ticket Mixto
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </td>

                        {/* 3. DESGLOSE DEL MOVIMIENTO (Limpio y sin redundancias) */}
                        <td className="p-5 text-sm font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text max-w-xl">
                          <div className="flex flex-col gap-2">
                            {/* CABECERA ÚNICA DEL MOVIMIENTO */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-base font-black text-gray-900 dark:text-white lya:text-lya-text ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                {details.tituloPrincipal}
                              </span>

                              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                                {details.subtituloCuenta}
                              </span>

                              {details.kind === 'PASTELERIA_ORDER' && (
                                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${details.badgeStyle}`}>
                                  {details.tipoOp}
                                </span>
                              )}

                              {details.promoText && (
                                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800/40">
                                  🏷️ {details.promoText}
                                </span>
                              )}

                              {group.folios.length > 0 && (
                                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase">
                                  {group.folios.join(' • ')}
                                </span>
                              )}
                            </div>

                            {/* 🔥 CAJITA DE DESGLOSE DE PRODUCTOS (SOLO CUANDO showModDetails ESTÁ ACTIVO) */}
                            {showModDetails && details.kind === 'POS_ORDER' && details.itemsVendidos?.length > 0 && (
                              <div className="bg-gray-50/90 dark:bg-gray-950/60 lya:bg-lya-bg rounded-xl p-2.5 border border-gray-200/70 dark:border-gray-800 space-y-1 max-w-md">
                                <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 mb-1">
                                  Productos cobrados ({details.itemsVendidos.reduce((s, i) => s + (Number(i.quantity) || 1), 0)})
                                </p>
                                {details.itemsVendidos.map((item) => {
                                  const esPas = isPasteleriaDept(item.product?.departamento);
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between text-xs py-0.5 border-b last:border-b-0 border-gray-200/50 dark:border-gray-800/60"
                                    >
                                      <div className="flex items-center gap-1.5 pr-2">
                                        <span className="font-black text-emerald-600 dark:text-emerald-400">
                                          {item.quantity}x
                                        </span>
                                        <span className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text">
                                          {item.product?.name || 'Producto'}
                                        </span>
                                        {showProductDeptBadge && (
                                          <span
                                            className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                                              esPas
                                                ? 'bg-pink-100/80 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
                                                : 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                                            }`}
                                          >
                                            {esPas ? 'Pastelería' : 'Cafetería'}
                                          </span>
                                        )}
                                      </div>
                                      <span className="font-bold text-gray-600 dark:text-gray-300 shrink-0">
                                        ${Number(item.subtotal || 0).toFixed(2)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* 🔥 CAJITA DE DESGLOSE DE PEDIDO DE PASTELERÍA (SOLO CUANDO showModDetails ESTÁ ACTIVO) */}
                            {showModDetails && details.kind === 'PASTELERIA_ORDER' && group.pasteleriaOrder && (
                              <div className="bg-pink-50/40 dark:bg-pink-950/20 lya:bg-lya-bg rounded-xl p-2.5 border border-pink-200/60 dark:border-pink-900/30 space-y-1.5 max-w-md">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-pink-600 dark:text-pink-400">1x</span>
                                    <span className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">
                                      {details.categoriaPastel}
                                    </span>
                                  </div>
                                  <span className="text-[11px] font-black text-gray-600 dark:text-gray-300">
                                    Valor Pastel: ${details.costoTotalPed.toFixed(2)}
                                  </span>
                                </div>

                                {(details.porcionesList.length > 0 || details.saboresList.length > 0) && (
                                  <div className="flex flex-wrap gap-1">
                                    {details.porcionesList.map((p, idx) => (
                                      <span key={idx} className="text-[9px] font-bold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-200/60 dark:border-amber-800/40">
                                        {p}
                                      </span>
                                    ))}
                                    {details.saboresList.map((s, idx) => (
                                      <span key={idx} className="text-[9px] font-bold bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/60 dark:border-purple-800/40">
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {details.descripcionPastel && (
                                  <p className="text-[11px] text-gray-500 dark:text-gray-400 italic line-clamp-1">
                                    "{details.descripcionPastel}"
                                  </p>
                                )}

                                <div className="flex items-center justify-between text-[10px] pt-1 border-t border-pink-200/40 dark:border-pink-900/30 font-bold text-gray-500 dark:text-gray-400">
                                  <span>Acumulado pagado: <b className="text-emerald-600 dark:text-emerald-400">${details.totalAbonadoPed.toFixed(2)}</b></span>
                                  {details.restaPed <= 0 ? (
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 size={11} /> Pedido Liquidado
                                    </span>
                                  ) : (
                                    <span className="text-amber-600 dark:text-amber-400">
                                      Resta por cobrar: ${details.restaPed.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Solo mostramos descripción en texto si es un movimiento MANUAL */}
                            {details.kind === 'MANUAL' && (
                              <p className={`text-xs text-gray-500 dark:text-gray-400 font-medium ${isCancelled ? 'line-through opacity-50' : ''}`}>
                                {details.cleanDesc}
                              </p>
                            )}

                            {/* ETIQUETAS DE ANULACIONES PARCIALES O RESTAURACIONES */}
                            {group.modificaciones.length > 0 && showModDetails && (
                              <div className="flex flex-col gap-1 mt-0.5">
                                {group.modificaciones.map((mod, i) => {
                                  const isRestaurado = mod.includes('📈');
                                  const badgeClasses = isRestaurado
                                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
                                    : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50';

                                  return (
                                    <span key={i} className={`text-[10px] font-black px-2 py-1 rounded-md border w-fit flex items-center shadow-sm ${badgeClasses}`}>
                                      {mod}
                                    </span>
                                  );
                                })}
                              </div>
                            )}

                            {group.modificaciones.length > 0 && !showModDetails && (
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold italic flex items-center gap-1">
                                <RotateCcw size={10}/> {group.modificaciones.length} ajuste(s) registrado(s)
                              </span>
                            )}

                            {/* PIE DE MOVIMIENTO: USUARIO Y MÉTODO DE PAGO */}
                            <div className={`text-[11px] font-semibold mt-0.5 flex flex-wrap items-center gap-2 ${isCancelled ? 'text-gray-400 lya:text-lya-text/40' : 'text-blue-500 dark:text-blue-400 lya:text-lya-primary'}`}>
                              <span className="flex items-center gap-1"><UserCheck size={12} /> Por: {creatorName}</span>
                              {!isCancelled && (
                                <>
                                  <span className="text-gray-300 dark:text-gray-700 lya:text-lya-border">•</span>
                                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-widest ${payInfo.bg} ${payInfo.color}`}>
                                    <payInfo.icon size={10} /> {payInfo.label}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        
                        {/* 4. MONTO */}
                        <td className="p-5 text-base font-black text-right text-gray-900 dark:text-white lya:text-lya-text whitespace-nowrap">
                          <span className={
                            isCancelled 
                              ? 'line-through opacity-50 text-gray-400 dark:text-gray-600 lya:text-lya-text/40' 
                              : isNegative 
                                ? 'text-red-500 dark:text-red-400 lya:text-red-600' 
                                : 'text-emerald-600 dark:text-emerald-400 lya:text-[#03543F]'
                          }>
                            {isCancelled ? '' : (isNegative ? '- ' : '+ ')}${absAmount}
                          </span>
                        </td>

                        {/* 5. ESTADO */}
                        <td className="p-5 text-center">
                          {isCancelled ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[10px] font-black uppercase text-red-600 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-lg mb-1 border border-red-200 dark:border-red-800/50 lya:bg-red-500/10 lya:border-red-500/20 lya:text-red-500">Anulado</span>
                              {group.canceller && (
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 lya:text-lya-text/50 font-bold whitespace-nowrap">
                                  Por: {group.canceller.fullName?.split(' ')[0] || group.canceller.username}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-3 py-1.5 rounded-lg lya:bg-emerald-500/10 lya:border-emerald-500/20 lya:text-[#03543F]">Activo</span>
                          )}
                        </td>

                        {/* 6. ACCIONES */}
                        <td className="p-5 text-center">
                          {!isManual ? (
                            <span 
                              className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase bg-gray-100 dark:bg-gray-800 px-2 py-1.5 rounded-lg select-none"
                              title="Los movimientos automáticos de Punto de Venta y Pastelería se gestionan desde su módulo correspondiente."
                            >
                              Automático
                            </span>
                          ) : (
                            <>
                              {!isCancelled && user?.role === 'Administrador' && (
                                <button 
                                  onClick={() => handleCancelTransaction(group.rawTxId)}
                                  className="text-red-500 hover:text-red-700 transition-colors p-2 bg-red-50 dark:bg-red-900/20 md:hover:bg-red-100 dark:md:hover:bg-red-900/40 rounded-xl outline-none lya:bg-red-500/10 lya:text-red-500 lya:md:hover:bg-red-500/20"
                                  title="Anular Movimiento Manual"
                                >
                                  <XCircle size={20} />
                                </button>
                              )}
                              {isCancelled && user?.role === 'Administrador' && (
                                <button 
                                  onClick={() => handleRestoreTransaction(group.rawTxId)}
                                  className="text-blue-500 hover:text-blue-700 transition-colors p-2 bg-blue-50 dark:bg-blue-900/20 md:hover:bg-blue-100 dark:md:hover:bg-blue-900/40 rounded-xl outline-none lya:bg-lya-primary/10 lya:text-lya-primary lya:md:hover:bg-lya-primary/20"
                                  title="Restaurar Movimiento Manual"
                                >
                                  <RotateCcw size={20} />
                                </button>
                              )}
                              {user?.role !== 'Administrador' && (
                                 <span className="text-xs font-bold text-gray-400 lya:text-lya-text/30 select-none">No auto.</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </motion.tbody>
              )}
            </AnimatePresence>
          </table>
        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/60 lya:bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }} 
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
            >
              <div className={`mx-auto w-20 h-20 flex items-center justify-center rounded-full mb-5 ${
                confirmModal.actionType === 'CANCEL' 
                  ? 'bg-red-100 text-red-500 dark:bg-red-500/10 lya:bg-red-500/10 lya:text-red-500' 
                  : 'bg-blue-100 text-blue-500 dark:bg-blue-500/10 lya:bg-lya-primary/10 lya:text-lya-primary'
              }`}>
                {confirmModal.actionType === 'CANCEL' ? <AlertTriangle size={40} /> : <RotateCcw size={40} />}
              </div>
              
              <h3 className="text-2xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text mb-2 tracking-tight">
                {confirmModal.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/70 mb-8 leading-relaxed text-center">
                {confirmModal.message}
              </p>

              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={closeConfirmModal}
                  disabled={isProcessing}
                  className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:md:hover:bg-lya-border/40 rounded-xl font-bold transition-colors disabled:opacity-50 outline-none"
                >
                  Cancelar
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmLock}
                  disabled={isProcessing}
                  className={`flex-1 flex items-center justify-center py-3.5 font-bold rounded-xl transition-all transform md:hover:-translate-y-0.5 text-white shadow-lg outline-none ${
                    confirmModal.actionType === 'CANCEL'
                      ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30 lya:bg-red-600 lya:hover:bg-red-700'
                      : 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30 lya:bg-lya-primary lya:hover:opacity-90 lya:shadow-lya-primary/30'
                  } ${isProcessing ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isProcessing ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    `Sí, ${confirmModal.actionType === 'CANCEL' ? 'Anular' : 'Restaurar'}`
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};