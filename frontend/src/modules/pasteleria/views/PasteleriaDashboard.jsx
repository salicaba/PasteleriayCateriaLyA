// src/modules/pasteleria/views/PasteleriaDashboard.jsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarClock, Plus, Search, CheckCircle2, Check, AlertTriangle, Wallet, Banknote,
  DollarSign, X, FileText, ShoppingBasket, ClockAlert, PackageCheck, Ban, Undo2, Smartphone, 
  MessageCircle, Loader2, Trash2, RotateCcw, Calculator, Flame, Timer, CalendarDays
} from 'lucide-react';
import { usePedidosController } from '../controllers/usePedidosController';
import NuevoPedidoModal from './NuevoPedidoModal';
import TicketPasteleriaModal from './TicketPasteleriaModal';
import DetallePedidoModal from './DetallePedidoModal';
import client from '../../../api/client';

// --- COMPONENTE INTERNO: CLON EXACTO DE StatCard (CAFETERÍA) ---
const KpiCard = ({ title, value, icon: Icon, themeColor, isActive, onClick }) => {
  const colors = {
    blue: { border: "border-blue-500 lya:border-blue-400", bg: "bg-blue-500", text: "text-blue-500" },
    orange: { border: "border-orange-500 lya:border-orange-400", bg: "bg-orange-500", text: "text-orange-500" },
    emerald: { border: "border-[#24d366] lya:border-emerald-400", bg: "bg-[#24d366]", text: "text-[#24d366]" },
    red: { border: "border-red-500 lya:border-red-400", bg: "bg-red-500", text: "text-red-500" }
  };

  const style = colors[themeColor];

  return (
    <motion.div 
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl p-4 sm:p-5 shadow-sm border-l-4 flex justify-between items-center cursor-pointer transition-all duration-300 md:hover:shadow-md ${style.border} ${isActive ? 'ring-1 ring-gray-200 dark:ring-gray-700 lya:ring-lya-border/50 shadow-md opacity-100 scale-[1.02]' : 'opacity-70 md:hover:opacity-100'}`}
    >
      <div>
        <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 lya:text-lya-text/60 uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text">{value}</h3>
      </div>
      <div className={`p-2 sm:p-3 rounded-xl bg-opacity-10 dark:bg-opacity-20 lya:bg-opacity-20 ${style.bg}`}>
        <Icon size={24} className={style.text} />
      </div>
    </motion.div>
  );
};
// -----------------------------------------------------------------

const PasteleriaLoader = () => (
  <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg relative z-10 transition-colors duration-300">
    <motion.div
      animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
      className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800"
    >
      <ShoppingBasket size={40} className="text-emerald-500 lya:text-lya-primary" />
    </motion.div>
    <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
      Cargando Pedidos
    </h2>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
      <Loader2 size={16} className="animate-spin text-emerald-500 lya:text-lya-primary" /> Sincronizando datos...
    </p>
  </div>
);

export default function PasteleriaDashboard() {
  const { 
    pedidos, 
    pedidosFiltrados, conteos, loading, 
    activeTab, setActiveTab, searchQuery, setSearchQuery,
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida,
    abonoModal, setAbonoModal, abonoForm, setAbonoForm, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    confirmModal, pedirConfirmacion, cerrarConfirmacion, ejecutarAccionConfirmada,
    detalleModal, abrirDetalles, cerrarDetalles, 
    pedidoAEditar, iniciarEdicion,               
    calcularFinanzas, guardarPedido, registrarAbono, restaurarPedido, 
    successScreen, 
    isSubmitting 
  } = usePedidosController();

  const [transferInfo, setTransferInfo] = useState(null);
  const [showCancelados, setShowCancelados] = useState(false);
  const [showEntregados, setShowEntregados] = useState(false);
  const [modalInputValue, setModalInputValue] = useState('');
  const [restoringId, setRestoringId] = useState(null);

  // 🔥 PILAR 3: Candado asíncrono para evitar múltiples submits accidentales
  const lockRef = useRef(false);

  useEffect(() => {
    if (abonoModal.isOpen) {
      lockRef.current = false; // Liberar candado al abrir modal de abono
      if (abonoForm.metodo === 'transferencia') {
        client.get('/settings')
          .then(res => { if (res.data) setTransferInfo(res.data); })
          .catch(err => console.error("Error al cargar datos bancarios:", err));
      }
    }
  }, [abonoModal.isOpen, abonoForm.metodo]);

  // 🔥 LÓGICA DEL HUD DE ANTICIPACIÓN (Mise en place) ABSOLUTA
  const hudMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const next7Days = new Date(today);
    next7Days.setDate(next7Days.getDate() + 7);

    let hoy = 0;
    let manana = 0;
    let proximos7 = 0;

    (pedidos || []).forEach(p => {
      // Si ya se entregó o canceló, lo ignoramos
      if (p.estado === 'entregado' || p.estado === 'cancelado') return;
      
      const fechaEntrega = new Date(p.fechaEntrega);
      
      // Si el pedido ya está atrasado (es del pasado), no debe salir en el radar
      if (fechaEntrega < today) return; 
      
      if (fechaEntrega >= today && fechaEntrega < tomorrow) {
        hoy++;
      } else if (fechaEntrega >= tomorrow && fechaEntrega < dayAfterTomorrow) {
        manana++;
      }
      
      // 🔥 FIX: Radar de 7 días estrictamente contando a partir de MAÑANA
      if (fechaEntrega >= tomorrow && fechaEntrega <= next7Days) {
        proximos7++;
      }
    });

    return { hoy, manana, proximos7, today, tomorrow, dayAfterTomorrow };
  }, [pedidos]);

  if (loading) return <PasteleriaLoader />; 

  const handleRestaurarDirecto = async (pedido) => {
    // 🔥 BLOQUEO DE DOBLE CLIC
    if (lockRef.current) return;
    lockRef.current = true;
    
    setRestoringId(pedido.id);
    try {
      if (restaurarPedido) {
        await Promise.resolve(restaurarPedido(pedido.id));
      } else {
        pedirConfirmacion(pedido, 'restaurar');
        setTimeout(() => {
          ejecutarAccionConfirmada();
        }, 50);
      }
    } catch (error) {
      console.error("Error al restaurar:", error);
    } finally {
      setTimeout(() => {
        setRestoringId(null);
        lockRef.current = false;
      }, 1000); // 1 segundo de debounce
    }
  };

  const getConfirmacionDetalles = () => {
    if (!confirmModal.pedido) return {};
    const esAntesDeTiempo = new Date() < new Date(confirmModal.pedido.fechaEntrega);

    switch(confirmModal.tipo) {
      case 'entregar':
        return {
          icon: <PackageCheck size={28} className="text-emerald-500 lya:text-lya-primary" />,
          title: 'Marcar como Entregado',
          description: esAntesDeTiempo ? 'La fecha agendada para este pedido aún no se cumple. ¿Estás seguro de que ya se entregó al cliente?' : '¿Confirmas que este pedido ha sido entregado exitosamente?',
          color: 'bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-primary',
          bgIcon: 'bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-primary/10'
        };
      case 'cancelar':
        return {
          icon: <Ban size={28} className="text-red-500 lya:text-red-500" />,
          title: 'Cancelar Pedido',
          description: 'El pedido se marcará como cancelado y desaparecerá mañana. Esta acción se puede deshacer hoy.',
          color: 'bg-red-500 hover:bg-red-600',
          bgIcon: 'bg-red-50 dark:bg-red-500/10',
          requireInput: true,
          inputType: 'text',
          inputPlaceholder: 'Motivo de cancelación (opcional)'
        };
      default: return {};
    }
  };

  const detallesModal = getConfirmacionDetalles();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full w-full flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-emerald-500/20 lya:shadow-lya-primary/20">
            <ShoppingBasket size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">Pedidos</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Gestión general de producción</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={18} />
            <input type="text" placeholder="Buscar pedido..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 lya:focus:ring-lya-primary/30 transition-all lya:text-lya-text lya:placeholder-lya-text/40" />
          </div>

          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => abrirModalNuevoPedido()} 
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface px-6 py-3 rounded-xl font-bold shadow-md shadow-emerald-500/30 lya:shadow-lya-secondary/30 transform md:hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
          >
            <Plus size={20} /><span>Nuevo Pedido</span>
          </motion.button>
        </div>
      </header>

      {/* 🔥 HUD DE ANTICIPACIÓN Y PRODUCCIÓN NEO-BENTO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 shrink-0 w-full">
        {/* Entregas de Hoy */}
        <div className="bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-gray-900 lya:from-red-500/10 lya:to-lya-surface border border-red-100 dark:border-red-900/30 lya:border-red-500/20 p-5 rounded-[2rem] shadow-sm flex items-center justify-between transition-all md:hover:scale-[1.02] relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-red-500 dark:text-red-400 font-black text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Flame size={14} /> Fuego / Hoy
            </p>
            <h3 className="text-3xl font-black text-red-600 dark:text-red-500">{hudMetrics.hoy}</h3>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Pedidos a entregar hoy</p>
          </div>
          <div className="bg-red-500 text-white p-3.5 rounded-2xl shadow-md shadow-red-500/20 relative z-10">
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Entregas de Mañana */}
        <div className="bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/10 dark:to-gray-900 lya:from-orange-500/10 lya:to-lya-surface border border-orange-100 dark:border-orange-900/30 lya:border-orange-500/20 p-5 rounded-[2rem] shadow-sm flex items-center justify-between transition-all md:hover:scale-[1.02] relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-orange-500 dark:text-orange-400 font-black text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Timer size={14} /> Mise en place
            </p>
            <h3 className="text-3xl font-black text-orange-600 dark:text-orange-500">{hudMetrics.manana}</h3>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Avanzar para mañana</p>
          </div>
          <div className="bg-orange-500 text-white p-3.5 rounded-2xl shadow-md shadow-orange-500/20 relative z-10">
            <CalendarClock size={24} />
          </div>
        </div>

        {/* Proximos 7 días */}
        <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-900/10 dark:to-gray-900 lya:from-purple-500/10 lya:to-lya-surface border border-purple-100 dark:border-purple-900/30 lya:border-purple-500/20 p-5 rounded-[2rem] shadow-sm flex items-center justify-between transition-all md:hover:scale-[1.02] relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-purple-500 dark:text-purple-400 font-black text-[10px] uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <CalendarDays size={14} /> Radar
            </p>
            <h3 className="text-3xl font-black text-purple-600 dark:text-purple-500">{hudMetrics.proximos7}</h3>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Volumen prox. 7 días</p>
          </div>
          <div className="bg-purple-500 text-white p-3.5 rounded-2xl shadow-md shadow-purple-500/20 relative z-10">
            <ShoppingBasket size={24} />
          </div>
        </div>
      </div>

      {/* --- GRID DE TARJETAS KPI --- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 shrink-0 w-full">
        <KpiCard 
          title="Activos" value={conteos?.activos || 0} icon={ShoppingBasket} themeColor="blue" 
          isActive={activeTab === 'activos' && !showCancelados && !showEntregados && !searchQuery} 
          onClick={() => { 
            setActiveTab('activos'); 
            setSearchQuery(''); 
            setShowCancelados(false);
            setShowEntregados(false);
          }} 
        />
        <KpiCard 
          title="Atrasados" value={conteos?.atrasados || 0} icon={ClockAlert} themeColor="orange" 
          isActive={activeTab === 'atrasados' && !showCancelados && !showEntregados && !searchQuery} 
          onClick={() => { 
            setActiveTab('atrasados'); 
            setSearchQuery(''); 
            setShowCancelados(false);
            setShowEntregados(false);
          }} 
        />
        <KpiCard 
          title="Entregados Hoy" value={conteos?.entregadosHoy || 0} icon={PackageCheck} themeColor="emerald" 
          isActive={showEntregados} 
          onClick={() => { 
            setActiveTab('entregadosHoy'); 
            setSearchQuery(''); 
            setShowEntregados(true);
            setShowCancelados(false);
          }} 
        />
        <KpiCard 
          title="Cancelados Hoy" value={conteos?.canceladosHoy || 0} icon={Ban} themeColor="red" 
          isActive={showCancelados} 
          onClick={() => { 
            setActiveTab('canceladosHoy'); 
            setSearchQuery(''); 
            setShowCancelados(true);
            setShowEntregados(false);
          }} 
        />
      </div>

      {/* GRID PRINCIPAL (Solo se muestra si los paneles están cerrados) */}
      {(!showCancelados && !showEntregados) && (
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
          {pedidosFiltrados.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 lya:text-lya-text/50"
            >
              <ShoppingBasket size={64} className="mb-4 opacity-20" />
              <p className="text-xl font-bold">{searchQuery ? `No se encontró el pedido "${searchQuery}"` : 'No hay pedidos en esta sección'}</p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
              <AnimatePresence mode="popLayout">
                {pedidosFiltrados.map((pedido) => {
                  const finanzas = calcularFinanzas(pedido);
                  const fechaRaw = new Date(pedido.fechaEntrega);
                  const fecha = fechaRaw.toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                  
                  const isAtrasado = fechaRaw < new Date() && pedido.estado !== 'entregado' && pedido.estado !== 'cancelado';
                  
                  // 🔥 Lógica de Alertas Tempranas (Badges de producción)
                  const isHoy = fechaRaw >= hudMetrics.today && fechaRaw < hudMetrics.tomorrow && !isAtrasado && pedido.estado !== 'entregado' && pedido.estado !== 'cancelado';
                  const isManana = fechaRaw >= hudMetrics.tomorrow && fechaRaw < hudMetrics.dayAfterTomorrow && !isAtrasado && pedido.estado !== 'entregado' && pedido.estado !== 'cancelado';

                  return (
                    <motion.div
                      key={pedido.id} 
                      layout 
                      initial={{ opacity: 0, scale: 0.9, y: 20 }} 
                      animate={{ opacity: 1, scale: 1, y: 0 }} 
                      exit={{ opacity: 0, scale: 0.8, y: -20 }}
                      transition={{ type: "spring", stiffness: 200, damping: 20 }}
                      onClick={() => abrirDetalles(pedido)} 
                      className={`cursor-pointer relative overflow-hidden rounded-[2rem] border p-5 shadow-sm transition-colors duration-300 flex flex-col justify-between h-full bg-white dark:bg-gray-900 lya:bg-lya-surface
                        ${finanzas.requiereLiquidacionUrgente ? 'border-rose-500/50 shadow-rose-500/10 lya:border-rose-500/50' : 'border-gray-100 dark:border-gray-800 md:hover:border-emerald-400/50 lya:border-lya-border/30 lya:md:hover:border-lya-secondary/50'}
                        ${isAtrasado ? 'border-orange-500/50 shadow-orange-500/10' : ''}`}
                    >
                      {/* 🔥 ETIQUETAS DE PRODUCCIÓN (BADGES) */}
                      {isAtrasado && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">ATRASADO</div>}
                      {isHoy && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 animate-pulse flex items-center gap-1"><Flame size={12}/> ¡ENTREGAR HOY!</div>}
                      {isManana && <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1"><Timer size={12}/> AVANZAR HOY</div>}

                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 min-w-0 pr-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-wider mb-2 inline-block lya:border lya:border-lya-border/30">{pedido.id}</span>
                            <h3 className="text-lg font-bold truncate text-gray-800 dark:text-white lya:text-lya-text">{pedido.cliente}</h3>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${isAtrasado || isHoy ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : isManana ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-secondary/10 text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary border-emerald-500/10 lya:border-lya-secondary/20'}`}>
                            <CalendarClock size={14} /> {fecha}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4 mt-2">
                          <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 lya:border-indigo-800/50 px-2 py-1 rounded-md shadow-sm">
                            {pedido.categoria || 'Pastel'}
                          </span>
                          {pedido.porciones?.map((p, idx) => <span key={idx} className="text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 lya:bg-lya-bg lya:text-lya-text px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 lya:border-lya-border/40">{p}</span>)}
                          {pedido.saborPan?.map((s, idx) => <span key={idx} className="text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 lya:bg-lya-bg lya:text-lya-text px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/30 lya:border-lya-border/40">{s}</span>)}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 lya:text-lya-text/70 mb-6 line-clamp-2 min-h-[40px] italic">"{pedido.descripcion}"</p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30">
                        <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest text-gray-400 lya:text-lya-text/50">
                          <span>Total</span>
                          <span className="text-gray-800 dark:text-white lya:text-lya-text">${parseFloat(pedido.costoTotal).toFixed(2)}</span>
                        </div>
                        
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/40 rounded-full overflow-hidden mb-4">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((finanzas.totalPagado / pedido.costoTotal) * 100, 100)}%` }} className={`h-full ${finanzas.estaLiquidado ? 'bg-emerald-500 lya:bg-lya-secondary' : 'bg-amber-400 lya:bg-lya-primary'}`} />
                        </div>

                        <div className="flex justify-between items-center">
                          {finanzas.estaLiquidado ? (
                            <div className="text-xs font-bold flex items-center gap-1 text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary">
                              <CheckCircle2 size={14} /> Liquidado
                            </div>
                          ) : (
                            <div className={`text-xs font-bold ${finanzas.requiereLiquidacionUrgente ? 'text-red-500 animate-pulse' : 'text-amber-600 lya:text-lya-text'}`}>
                              Resta: ${finanzas.deuda.toFixed(2)}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); abrirTicket(pedido); }} title="Ver Ticket" className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 lya:text-lya-secondary lya:hover:bg-lya-secondary/10 rounded-lg transition-colors">
                              <FileText size={18} />
                            </motion.button>
                            
                            <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); pedirConfirmacion(pedido, 'cancelar'); }} title="Cancelar Pedido" className="p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 lya:text-red-500 lya:hover:bg-red-500/10 rounded-lg transition-colors">
                              <Ban size={18} />
                            </motion.button>

                            <motion.button 
                              whileTap={{ scale: 0.95 }}
                              onClick={(e) => { e.stopPropagation(); pedirConfirmacion(pedido, 'entregar'); }} 
                              disabled={!finanzas.estaLiquidado}
                              title={finanzas.estaLiquidado ? "Marcar como Entregado" : "Debes registrar el pago total antes de entregar"}
                              className={`p-2 rounded-lg transition-colors ${finanzas.estaLiquidado ? 'text-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 lya:text-lya-primary lya:hover:bg-lya-primary/10' : 'text-gray-300 dark:text-gray-600 lya:text-lya-text/30 cursor-not-allowed'}`}
                            >
                              <PackageCheck size={18} />
                            </motion.button>

                            {!finanzas.estaLiquidado && (
                              <motion.button whileTap={{ scale: 0.95 }} onClick={(e) => { e.stopPropagation(); abrirModalAbono(pedido); }} className="bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                <DollarSign size={14} className="inline mr-1" /> Abonar
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      )}

      {/* --- PANEL LATERAL DESLIZANTE PARA CANCELADOS Y ENTREGADOS --- */}
      <AnimatePresence>
        {(showCancelados || showEntregados) && (
          <div className="fixed inset-0 z-40 flex justify-end overflow-hidden">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              onClick={() => { setShowCancelados(false); setShowEntregados(false); setActiveTab('activos'); }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm z-0" 
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} 
              className="relative z-10 w-full max-w-md h-[100dvh] bg-white dark:bg-gray-900 lya:bg-lya-surface shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/40 shrink-0">
                <div className={`flex items-center gap-3 ${showCancelados ? 'text-red-500' : 'text-emerald-500 lya:text-lya-primary'}`}>
                  <div className={`p-2 rounded-xl ${showCancelados ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30 lya:bg-lya-primary/20'}`}>
                    {showCancelados ? <Trash2 size={24} /> : <CheckCircle2 size={24} />}
                  </div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">
                    {showCancelados ? 'Papelera Hoy' : 'Entregados Hoy'}
                  </h2>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => { setShowCancelados(false); setShowEntregados(false); setActiveTab('activos'); }} 
                  className="p-2 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </motion.button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar pb-10">
                {pedidosFiltrados.length === 0 ? (
                  <div className="text-center text-gray-400 mt-10">
                    {showCancelados ? <Trash2 size={40} className="mx-auto mb-3 opacity-30" /> : <PackageCheck size={40} className="mx-auto mb-3 opacity-30" />}
                    <p className="font-bold">{showCancelados ? 'Papelera vacía' : 'Aún no hay entregas'}</p>
                    <p className="text-xs">{showCancelados ? 'No hay pedidos cancelados hoy.' : 'Los pedidos entregados aparecerán aquí.'}</p>
                  </div>
                ) : (
                  pedidosFiltrados.map(pedido => {
                    const fechaActualizacion = new Date(pedido.updatedAt || pedido.fechaEntrega).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
                    
                    if (showCancelados) {
                      const motivoMostrar = pedido.motivoCancelacion || pedido.cancelReason || pedido.motivo || 'Cancelado desde POS';

                      return (
                        <div key={pedido.id} className="p-4 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 rounded-2xl transition-all shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-black text-gray-900 dark:text-white lya:text-lya-text text-base">
                              {pedido.id}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-red-500 bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded uppercase">Anulada</span>
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); handleRestaurarDirecto(pedido); }} 
                                disabled={restoringId === pedido.id}
                                className="px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg shadow-sm border border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Restaurar Pedido"
                              >
                                {restoringId === pedido.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} 
                                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                  {restoringId === pedido.id ? 'Restaurando...' : 'Restaurar'}
                                </span>
                              </motion.button>
                            </div>
                          </div>
                          <div className="mb-2">
                            <div className="inline-flex flex-col bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/50 text-red-500 dark:text-red-400 px-2.5 py-1.5 rounded-lg shadow-sm">
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                Nombre: {pedido.cliente}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-snug">Motivo: {motivoMostrar}</p>
                          <div className="flex items-center gap-2 mt-3">
                            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                              🕒 {fechaActualizacion}
                            </span>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <div key={pedido.id} className="p-4 border border-green-100 dark:border-green-900/30 bg-green-50/50 dark:bg-green-950/20 rounded-2xl transition-all shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-black text-gray-900 dark:text-white lya:text-lya-text text-base">
                              {pedido.id}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded uppercase">Entregado</span>
                              <motion.button 
                                whileTap={{ scale: 0.95 }}
                                onClick={(e) => { e.stopPropagation(); handleRestaurarDirecto(pedido); }} 
                                disabled={restoringId === pedido.id}
                                className="px-2 py-1.5 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-lg shadow-sm border border-orange-200 dark:border-orange-800/50 hover:bg-orange-100 transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Deshacer Entrega"
                              >
                                {restoringId === pedido.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} 
                                <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">
                                  {restoringId === pedido.id ? 'Restaurando...' : 'Deshacer'}
                                </span>
                              </motion.button>
                            </div>
                          </div>
                          <div className="mb-2">
                            <div className="inline-flex flex-col bg-white dark:bg-gray-800 border border-green-200 dark:border-green-900/50 text-emerald-600 dark:text-emerald-400 px-2.5 py-1.5 rounded-lg shadow-sm">
                              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                Nombre: {pedido.cliente}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2">
                              <span className="bg-green-100 dark:bg-green-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                                🕒 {fechaActualizacion}
                              </span>
                              <motion.button whileTap={{ scale: 0.95 }} onClick={() => abrirTicket(pedido)} className="text-[10px] font-black px-2 py-1.5 rounded-lg uppercase tracking-widest bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 text-gray-600 dark:text-gray-300 transition-colors flex items-center gap-1.5 shadow-sm">
                                <FileText size={14} /> Ticket
                              </motion.button>
                            </div>
                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 lya:text-lya-primary">
                              ${parseFloat(pedido.costoTotal).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    }
                  })
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- CÁPSULA NEO-BENTO DE ÉXITO --- */}
      <AnimatePresence>
        {successScreen?.isOpen && (
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
                  <span className="text-sm text-center">{successScreen.title || 'Acción exitosa'}</span>
                  {successScreen.subtitle && <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 leading-none mt-0.5 text-center">{successScreen.subtitle}</span>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 lya:bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
              <div className="flex flex-col items-center text-center mb-6">
                <div className={`p-4 rounded-full mb-4 ${detallesModal.bgIcon}`}>
                  {detallesModal.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text mb-2">{detallesModal.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60">{detallesModal.description}</p>
                
                {detallesModal.requireInput && (
                  <div className="w-full mt-4 mb-2">
                    <input 
                      type={detallesModal.inputType || 'text'} 
                      value={modalInputValue} 
                      onChange={(e) => setModalInputValue(e.target.value)} 
                      placeholder={detallesModal.inputPlaceholder}
                      className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg text-gray-800 dark:text-gray-200 lya:text-lya-text text-sm rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-red-500/50 transition-all border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 text-center font-medium shadow-inner"
                    />
                  </div>
                )}

                {new Date() < new Date(confirmModal.pedido?.fechaEntrega) && confirmModal.tipo === 'entregar' && (
                  <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 p-3 rounded-xl text-left border border-amber-200 dark:border-amber-500/30">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span className="text-xs font-medium">Nota: Este pedido estaba programado para el {new Date(confirmModal.pedido?.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric'})}.</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setModalInputValue('');
                    cerrarConfirmacion();
                  }} 
                  disabled={isSubmitting} 
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:bg-lya-bg/80 text-gray-700 dark:text-gray-300 lya:text-lya-text/80 font-bold py-3 rounded-xl transition-colors"
                >
                  Volver
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    // 🔥 BLOQUEO DE DOBLE CLIC EN CONFIRMACIONES (Cancelar/Entregar)
                    if (lockRef.current) return;
                    lockRef.current = true;

                    let reason = undefined;
                    if (detallesModal.requireInput) {
                      reason = modalInputValue.trim() !== '' ? modalInputValue.trim() : 'Cancelado desde POS';
                    }
                    try {
                      await Promise.resolve(ejecutarAccionConfirmada(reason));
                      setModalInputValue('');
                    } finally {
                      setTimeout(() => { lockRef.current = false; }, 1000);
                    }
                  }} 
                  disabled={isSubmitting} 
                  className={`flex-1 text-white lya:text-lya-surface font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'md:hover:-translate-y-0.5'} ${detallesModal.color}`}
                >
                  {isSubmitting ? <><Loader2 className="animate-spin" size={18} /><span>Procesando</span></> : 'Confirmar'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DetallePedidoModal 
        isOpen={detalleModal.isOpen} 
        onClose={cerrarDetalles} 
        pedido={detalleModal.pedido} 
        onEdit={iniciarEdicion}
        calcularFinanzas={calcularFinanzas}
      />

      <NuevoPedidoModal 
        isOpen={isModalOpen} 
        onClose={cerrarModalNuevoPedido} 
        onSave={guardarPedido} 
        fechaPredefinida={fechaPredefinida} 
        pedidoAEditar={pedidoAEditar}
        isSubmitting={isSubmitting}
      />
      
      <div className="relative z-[9999]">
        <TicketPasteleriaModal isOpen={ticketModal.isOpen} onClose={cerrarTicket} pedido={ticketModal.pedido} calcularFinanzas={calcularFinanzas} />
      </div>

      <AnimatePresence>
        {abonoModal.isOpen && abonoModal.pedido && (() => {
          const p = abonoModal.pedido;
          const fin = calcularFinanzas(p);
          
          const costoFormat = parseFloat(p.costoTotal).toFixed(2);
          
          const montoIngresadoNum = parseFloat(abonoForm.monto) || 0;
          const recibidoNum = parseFloat(abonoForm.recibido) || 0;
          
          const mostrarCambio = abonoForm.metodo === 'efectivo' && recibidoNum > 0;
          const cambio = Math.max(recibidoNum - montoIngresadoNum, 0);

          // 🔥 SOLUCIÓN ESTRICTA: BLOQUEO DE DOBLE ABONO
          const submitPago = async (e) => {
            e.preventDefault();
            if (lockRef.current) return;
            lockRef.current = true;
            try {
              await Promise.resolve(registrarAbono(p.id, abonoForm.monto, abonoForm.metodo));
            } finally {
              // Liberamos el candado después de 1 segundo para anular el doble rebote del click
              setTimeout(() => { lockRef.current = false; }, 1000); 
            }
          };

          const isMontoAbonoInvalido = montoIngresadoNum <= 0 || montoIngresadoNum > fin.deuda;
          const isRecibidoInvalido = abonoForm.metodo === 'efectivo' && recibidoNum < montoIngresadoNum;
          const isAbonoSubmitDisabled = isSubmitting || isMontoAbonoInvalido || isRecibidoInvalido;

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 lya:bg-black/50 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30 lya:bg-lya-bg/50">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text">Registrar Pago</h3>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary">Cliente: {p.cliente}</p>
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => setAbonoModal({ isOpen: false, pedido: null })} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white lya:text-lya-text/50 bg-white dark:bg-gray-800 lya:bg-lya-bg rounded-full shadow-sm transition-colors">
                    <X size={20} />
                  </motion.button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-700 lya:border-lya-border/40">
                      <span className="block text-[10px] uppercase font-bold text-gray-400 lya:text-lya-text/50 mb-1">Total</span>
                      <span className="font-bold text-gray-800 dark:text-white lya:text-lya-text">${costoFormat}</span>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-primary/10 p-3 rounded-2xl text-center border border-emerald-100 dark:border-emerald-500/20 lya:border-lya-primary/20">
                      <span className="block text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 lya:text-lya-primary mb-1">Abonado</span>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 lya:text-lya-primary">${fin.totalPagado.toFixed(2)}</span>
                    </div>
                    <div className="bg-rose-50 dark:bg-rose-500/10 p-3 rounded-2xl text-center border border-rose-100 dark:border-rose-500/20 lya:border-rose-500/20">
                      <span className="block text-[10px] uppercase font-bold text-rose-600 dark:text-rose-400 lya:text-rose-500 mb-1">Resta</span>
                      <span className="font-bold text-rose-700 dark:text-rose-300 lya:text-rose-600">${fin.deuda.toFixed(2)}</span>
                    </div>
                  </div>

                  <form id="abonoForm" onSubmit={submitPago} className="space-y-6">
                    
                    <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-2xl p-5 space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase">Monto a Abonar</label>
                          <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => setAbonoForm({...abonoForm, monto: fin.deuda.toString()})} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 lya:bg-lya-secondary/20 lya:text-lya-secondary px-2 py-1 rounded-md transition-colors hover:bg-emerald-200">Liquidar Restante</motion.button>
                        </div>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                          <input type="number" required min="1" max={fin.deuda} step="0.01" placeholder="0.00" value={abonoForm.monto} onChange={(e) => setAbonoForm({...abonoForm, monto: e.target.value})} className="w-full bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-xl pl-12 pr-4 py-3 text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/30 lya:focus:ring-lya-secondary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block ml-1">Selecciona Método</label>
                      <div className="grid grid-cols-2 gap-3">
                        <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setAbonoForm({...abonoForm, metodo: 'efectivo'})}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-colors ${abonoForm.metodo === 'efectivo' ? 'border-emerald-500 bg-emerald-500/10 lya:border-lya-primary lya:bg-lya-primary/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-gray-300'}`}>
                          <Banknote size={24} className={`mb-1.5 ${abonoForm.metodo === 'efectivo' ? 'text-emerald-500 lya:text-lya-primary' : 'text-gray-400'}`} />
                          <span className={`text-[11px] font-bold ${abonoForm.metodo === 'efectivo' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Efectivo</span>
                        </motion.button>
                        
                        <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setAbonoForm({...abonoForm, metodo: 'transferencia'})}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-colors ${abonoForm.metodo === 'transferencia' ? 'border-purple-500 bg-purple-500/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-gray-300'}`}>
                          <Smartphone size={24} className={`mb-1.5 ${abonoForm.metodo === 'transferencia' ? 'text-purple-500' : 'text-gray-400'}`} />
                          <span className={`text-[11px] font-bold ${abonoForm.metodo === 'transferencia' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Transferencia</span>
                        </motion.button>
                      </div>

                      <AnimatePresence mode="wait">
                        {abonoForm.metodo === 'efectivo' && (
                          <motion.div key="panel-efectivo" initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden mt-4 space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-2xl p-4">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase mb-2 block">Efectivo Recibido (Para calcular cambio)</label>
                              <div className="relative">
                                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input type="number" min={abonoForm.monto || 0} step="0.01" placeholder="Ej: 500" value={abonoForm.recibido} onChange={(e) => setAbonoForm({...abonoForm, recibido: e.target.value})} className="w-full bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-xl pl-12 pr-4 py-3 text-lg font-bold text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/30 lya:focus:ring-lya-secondary/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                              </div>
                              
                              <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
                                <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => setAbonoForm({...abonoForm, recibido: (parseFloat(abonoForm.monto) || 0).toString()})} className="px-4 py-2 bg-emerald-500/10 lya:bg-lya-secondary/10 text-emerald-600 lya:text-lya-secondary border border-emerald-500/20 lya:border-lya-secondary/20 rounded-lg text-xs font-black whitespace-nowrap active:scale-95 transition-transform">
                                  Exacto
                                </motion.button>
                                {[50, 100, 200, 500, 1000].filter(v => v > (parseFloat(abonoForm.monto) || 0)).map(val => (
                                  <motion.button whileTap={{ scale: 0.95 }} type="button" key={val} onClick={() => setAbonoForm({...abonoForm, recibido: val.toString()})} className="px-4 py-2 bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-700 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm active:scale-95 transition-transform">
                                    ${val}
                                  </motion.button>
                                ))}
                              </div>
                            </div>

                            <AnimatePresence>
                              {mostrarCambio && (
                                <motion.div initial={{ opacity: 0, scale: 0.9, height: 0 }} animate={{ opacity: 1, scale: 1, height: 'auto' }} exit={{ opacity: 0, scale: 0.9, height: 0 }} className="overflow-hidden">
                                  <div className="bg-emerald-500 lya:bg-lya-secondary text-white lya:text-lya-surface p-4 rounded-[1.5rem] flex justify-between items-center shadow-lg shadow-emerald-500/20 lya:shadow-lya-secondary/20">
                                    <span className="font-bold uppercase text-sm">Cambio a devolver:</span>
                                    <span className="text-3xl font-black">${cambio.toFixed(2)}</span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}

                        {abonoForm.metodo === 'transferencia' && transferInfo?.bank_accounts && (
                          <motion.div key="panel-transferencia" initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden mt-4">
                            
                            {transferInfo?.whatsapp_number && (
                              <div className="mb-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 flex gap-3 shadow-sm">
                                <div className="bg-purple-500/20 p-2.5 rounded-xl shrink-0 h-fit">
                                  <MessageCircle size={24} className="text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                  <h4 className="text-[11px] font-black text-purple-800 dark:text-purple-300 uppercase tracking-widest mb-1">Aviso para el Staff</h4>
                                  <p className="text-xs text-purple-700 dark:text-purple-400 font-medium leading-relaxed">Pide al cliente que envíe el comprobante al <b className="text-purple-900 dark:text-purple-200">{transferInfo.whatsapp_number}</b> o que te lo muestre en pantalla.</p>
                                </div>
                              </div>
                            )}

                            <div className="flex gap-3 overflow-x-auto custom-scrollbar pt-2 pb-2 px-1">
                              {transferInfo.bank_accounts.map(acc => (
                                <div key={acc.id} className="min-w-[85%] sm:min-w-[280px] p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-[1.5rem] shrink-0 shadow-sm flex flex-col justify-between">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Smartphone className="text-purple-600 dark:text-purple-400" size={18} />
                                    <span className="font-black text-xs text-purple-800 dark:text-purple-300 uppercase">{acc.bank_name}</span>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    {acc.account_holder && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-purple-400 font-bold uppercase shrink-0 mr-2">Titular:</span>
                                        <span className="text-sm font-black text-purple-900 dark:text-white truncate" title={acc.account_holder}>{acc.account_holder}</span>
                                      </div>
                                    )}
                                    {acc.account_number && (
                                      <div className="flex justify-between items-center border-t border-purple-200/50 dark:border-purple-700/50 pt-2 mt-2">
                                        <span className="text-[10px] text-purple-400 font-bold uppercase shrink-0 mr-2">Cuenta/Tarjeta:</span>
                                        <span className="text-sm font-mono font-black text-purple-900 dark:text-white tracking-wider">{acc.account_number}</span>
                                      </div>
                                    )}
                                    {acc.clabe && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-[10px] text-purple-400 font-bold uppercase shrink-0 mr-2">CLABE:</span>
                                        <span className="text-sm font-mono font-black text-purple-900 dark:text-white tracking-wider">{acc.clabe}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                  </form>
                </div>

                <div className="p-6 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30 bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0">
                  <motion.button whileTap={{ scale: 0.95 }} type="submit" form="abonoForm" disabled={isAbonoSubmitDisabled} className={`w-full bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 lya:shadow-lya-secondary/30 transition-all flex items-center justify-center gap-2 ${isAbonoSubmitDisabled ? 'opacity-70 cursor-not-allowed' : 'md:hover:-translate-y-0.5'}`}>
                    {isSubmitting ? (
                      <><Loader2 className="animate-spin" size={20} /> Procesando pago...</>
                    ) : isMontoAbonoInvalido ? (
                      'Monto a abonar inválido'
                    ) : isRecibidoInvalido ? (
                      'Efectivo recibido insuficiente'
                    ) : (
                      <><CheckCircle2 size={20} /> Confirmar Pago</>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}