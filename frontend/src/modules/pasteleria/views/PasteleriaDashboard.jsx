import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarClock, Plus, Search, CheckCircle2, 
  DollarSign, X, FileText, ShoppingBasket, ClockAlert, PackageCheck
} from 'lucide-react';
import { usePedidosController } from '../controllers/usePedidosController';
import NuevoPedidoModal from './NuevoPedidoModal';
import TicketPasteleriaModal from './TicketPasteleriaModal';

export default function PasteleriaDashboard() {
  const { 
    pedidosFiltrados, loading, 
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida,
    abonoModal, setAbonoModal, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    calcularFinanzas, agregarNuevoPedido, registrarAbono, marcarComoEntregado 
  } = usePedidosController();

  const [montoIngresado, setMontoIngresado] = useState('');

  if (loading) return null; 

  const handleAbonar = (e) => {
    e.preventDefault();
    registrarAbono(abonoModal.pedidoId, montoIngresado);
    setMontoIngresado('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
      
      {/* HEADER CON BUSCADOR Y BOTÓN NUEVO PEDIDO ARRIBA */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
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
          {/* Buscador */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={18} />
            <input 
              type="text"
              placeholder="Buscar pedido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 lya:focus:ring-lya-primary/30 transition-all lya:text-lya-text lya:placeholder-lya-text/40"
            />
          </div>

          {/* Botón Nuevo Pedido (Posición Superior) */}
          <button 
            onClick={() => abrirModalNuevoPedido()}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 lya:shadow-lya-secondary/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span>Nuevo Pedido</span>
          </button>
        </div>
      </header>

      {/* CONTROLES DE PESTAÑAS (ESTILO CAFETERÍA) */}
      <div className="flex flex-wrap items-center justify-start gap-4 mb-6 shrink-0">
        <div className="flex gap-2 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/20 p-1 rounded-2xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('activos')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === 'activos' && !searchQuery
                ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-emerald-500 lya:text-lya-secondary shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'
            }`}
          >
            <ShoppingBasket size={18} /> Activos
          </button>
          
          <button
            onClick={() => setActiveTab('atrasados')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === 'atrasados' && !searchQuery
                ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-rose-500 lya:text-rose-500 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'
            }`}
          >
            <ClockAlert size={18} /> Atrasados
          </button>

          <button
            onClick={() => setActiveTab('entregadosHoy')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
              activeTab === 'entregadosHoy' && !searchQuery
                ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-blue-500 lya:text-blue-500 shadow-sm' 
                : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'
            }`}
          >
            <PackageCheck size={18} /> Entregados Hoy
          </button>
        </div>
      </div>

      {/* CUERPO - GRID DE PEDIDOS */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        {pedidosFiltrados.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 lya:text-lya-text/50"
          >
            <ShoppingBasket size={64} className="mb-4 opacity-20" />
            <p className="text-xl font-bold">
              {searchQuery ? `No se encontró el pedido "${searchQuery}"` : 'No hay pedidos en esta sección'}
            </p>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start"
          >
            <AnimatePresence>
              {pedidosFiltrados.map((pedido) => {
                const finanzas = calcularFinanzas(pedido);
                const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                const isAtrasado = new Date(pedido.fechaEntrega) < new Date() && pedido.estado !== 'entregado';

                return (
                  <motion.div
                    key={pedido.id} 
                    layout 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 lya:bg-lya-surface border p-5 shadow-sm transition-all duration-300 flex flex-col justify-between h-full
                      ${finanzas.requiereLiquidacionUrgente ? 'border-rose-500/50 shadow-rose-500/10 lya:border-rose-500/50' : 'border-gray-100 dark:border-gray-800 hover:border-emerald-400/50 lya:border-lya-border/30 lya:hover:border-lya-secondary/50'}
                      ${isAtrasado ? 'border-orange-500/50 shadow-orange-500/10' : ''}`}
                  >
                    {isAtrasado && (
                      <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">
                        ATRASADO
                      </div>
                    )}

                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-wider mb-2 inline-block lya:border lya:border-lya-border/30">
                            {pedido.id}
                          </span>
                          <h3 className="text-lg font-bold text-gray-800 dark:text-white lya:text-lya-text truncate">
                            {pedido.cliente}
                          </h3>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border 
                          ${isAtrasado 
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' 
                            : 'bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-secondary/10 text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary border-emerald-500/10 lya:border-lya-secondary/20'}`}>
                          <CalendarClock size={14} /> {fecha}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
                        {pedido.porciones?.map((p, idx) => <span key={idx} className="text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 lya:bg-lya-bg lya:text-lya-text px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30 lya:border-lya-border/40">{p}</span>)}
                        {pedido.saborPan?.map((s, idx) => <span key={idx} className="text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 lya:bg-lya-bg lya:text-lya-text px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/30 lya:border-lya-border/40">{s}</span>)}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 lya:text-lya-text/70 mb-6 line-clamp-2 min-h-[40px] italic">
                        "{pedido.descripcion}"
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30">
                      <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest text-gray-400 lya:text-lya-text/50">
                        <span>Total</span>
                        <span className="text-gray-800 dark:text-white lya:text-lya-text">${pedido.costoTotal}</span>
                      </div>
                      
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/40 rounded-full overflow-hidden mb-4">
                        <motion.div 
                          initial={{ width: 0 }} 
                          animate={{ width: `${Math.min((finanzas.totalPagado / pedido.costoTotal) * 100, 100)}%` }} 
                          className={`h-full ${finanzas.estaLiquidado ? 'bg-emerald-500 lya:bg-lya-secondary' : 'bg-amber-400 lya:bg-lya-primary'}`} 
                        />
                      </div>

                      <div className="flex justify-between items-center">
                        {finanzas.estaLiquidado ? (
                          <div className="text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary text-xs font-bold flex items-center gap-1">
                            <CheckCircle2 size={14} /> Liquidado
                          </div>
                        ) : (
                          <div className={`text-xs font-bold ${finanzas.requiereLiquidacionUrgente ? 'text-red-500 animate-pulse' : 'text-amber-600 lya:text-lya-text'}`}>
                            Resta: ${finanzas.deuda}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <button onClick={() => abrirTicket(pedido)} title="Ver Ticket" className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 lya:text-lya-secondary lya:hover:bg-lya-secondary/10 rounded-lg transition-colors">
                            <FileText size={18} />
                          </button>
                          
                          {pedido.estado !== 'entregado' && (
                            <button 
                              onClick={() => marcarComoEntregado(pedido.id)} 
                              title="Marcar como Entregado"
                              className="p-2 text-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 lya:text-lya-primary lya:hover:bg-lya-primary/10 rounded-lg transition-colors"
                            >
                              <PackageCheck size={18} />
                            </button>
                          )}

                          {!finanzas.estaLiquidado && pedido.estado !== 'entregado' && (
                            <button onClick={() => abrirModalAbono(pedido)} className="bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                              <DollarSign size={14} className="inline mr-1" /> Abonar
                            </button>
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

      <NuevoPedidoModal isOpen={isModalOpen} onClose={cerrarModalNuevoPedido} onSave={agregarNuevoPedido} fechaPredefinida={fechaPredefinida} />
      <TicketPasteleriaModal isOpen={ticketModal.isOpen} onClose={cerrarTicket} pedido={ticketModal.pedido} calcularFinanzas={calcularFinanzas} />

      <AnimatePresence>
        {abonoModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 lya:bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
              <div className="flex justify-between items-center mb-6">
                <div className="bg-emerald-500/10 lya:bg-lya-secondary/10 p-2 rounded-xl text-emerald-500 lya:text-lya-secondary">
                  <DollarSign size={24} />
                </div>
                <button onClick={() => setAbonoModal({ isOpen: false, pedidoId: null, cliente: '' })} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white lya:text-lya-text/50 lya:hover:text-lya-text bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text mb-1">Registrar Pago</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8">Abono para: <span className="font-bold text-emerald-500 lya:text-lya-secondary">{abonoModal.cliente}</span></p>
              <form onSubmit={handleAbonar} className="space-y-6">
                <input type="number" required autoFocus min="1" placeholder="$ 0.00" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-2xl px-4 py-4 text-3xl font-black text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-4 focus:ring-emerald-500/10 lya:focus:ring-lya-secondary/30 transition-all text-center" />
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 lya:shadow-lya-secondary/30 transition-all flex items-center justify-center gap-2">
                  Confirmar Abono
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}