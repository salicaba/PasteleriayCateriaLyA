import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarClock, Plus, Cake, AlertCircle, CheckCircle2, 
  DollarSign, X, FileText, LayoutGrid, CalendarDays, CakeSlice 
} from 'lucide-react';
import { usePedidosController } from '../controllers/usePedidosController';
import NuevoPedidoModal from './NuevoPedidoModal';
import TicketPasteleriaModal from './TicketPasteleriaModal';
import PasteleriaCalendar from './PasteleriaCalendar';

export default function PasteleriaDashboard() {
  const { 
    pedidos, loading, 
    viewMode, setViewMode,
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida,
    abonoModal, setAbonoModal, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    calcularFinanzas, agregarNuevoPedido, registrarAbono 
  } = usePedidosController();

  const [montoIngresado, setMontoIngresado] = useState('');

  if (loading) return null; 

  const handleAbonar = (e) => {
    e.preventDefault();
    registrarAbono(abonoModal.pedidoId, montoIngresado);
    setMontoIngresado('');
  };

  return (
    // ANIMACIÓN SUAVIZADA: Eliminamos el 'spring' fuerte y la escala
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors duration-300"
    >
      
      {/* HEADER FIJO (ESTILO GESTOR DE MENÚ / COCINA) */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500 text-white p-3 rounded-2xl shadow-md shadow-emerald-500/20">
            <CakeSlice size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white">Pastelería & Agenda</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">Gestión de producción y entregas</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          {/* Selector de Vista */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full sm:w-auto">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <LayoutGrid size={16} /> <span className="hidden min-[400px]:inline">Tarjetas</span>
            </button>
            <button 
              onClick={() => setViewMode('calendar')} 
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
            >
              <CalendarDays size={16} /> <span className="hidden min-[400px]:inline">Agenda</span>
            </button>
          </div>

          <button 
            onClick={() => abrirModalNuevoPedido()}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-emerald-500/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2"
          >
            <Plus size={20} />
            <span>Nuevo Pedido</span>
          </button>
        </div>
      </header>

      {/* CUERPO CON SCROLL INDEPENDIENTE */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        <AnimatePresence mode="wait">
          {viewMode === 'calendar' ? (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <PasteleriaCalendar 
                pedidos={pedidos} 
                calcularFinanzas={calcularFinanzas} 
                abrirTicket={abrirTicket} 
                abrirModalAbono={abrirModalAbono} 
                abrirModalNuevoPedido={abrirModalNuevoPedido} 
              />
            </motion.div>
          ) : (
            <motion.div 
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start"
            >
              <AnimatePresence>
                {pedidos.map((pedido) => {
                  const finanzas = calcularFinanzas(pedido);
                  const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

                  return (
                    <motion.div
                      key={pedido.id} 
                      layout 
                      initial={{ opacity: 0, scale: 0.98 }} 
                      animate={{ opacity: 1, scale: 1 }} 
                      className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border p-5 shadow-sm transition-all duration-300 flex flex-col justify-between h-full
                        ${finanzas.requiereLiquidacionUrgente ? 'border-rose-500/50 shadow-rose-500/10' : 'border-gray-100 dark:border-gray-800 hover:border-emerald-400/50'}`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 inline-block">
                              {pedido.id}
                            </span>
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white truncate">
                              {pedido.cliente}
                            </h3>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                            <CalendarClock size={14} /> {fecha}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {pedido.porciones?.map((p, idx) => <span key={idx} className="text-[10px] font-bold bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-100 dark:border-amber-900/30">{p}</span>)}
                          {pedido.saborPan?.map((s, idx) => <span key={idx} className="text-[10px] font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/30">{s}</span>)}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2 min-h-[40px] italic">
                          "{pedido.descripcion}"
                        </p>
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-700/50">
                        <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-widest text-gray-400">
                          <span>Total</span>
                          <span className="text-gray-800 dark:text-white">${pedido.costoTotal}</span>
                        </div>
                        
                        <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${Math.min((finanzas.totalPagado / pedido.costoTotal) * 100, 100)}%` }} 
                            className={`h-full ${finanzas.estaLiquidado ? 'bg-emerald-500' : 'bg-amber-400'}`} 
                          />
                        </div>

                        <div className="flex justify-between items-center">
                          {finanzas.estaLiquidado ? (
                            <div className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                              <CheckCircle2 size={14} /> Liquidado
                            </div>
                          ) : (
                            <div className={`text-xs font-bold ${finanzas.requiereLiquidacionUrgente ? 'text-red-500 animate-pulse' : 'text-amber-600'}`}>
                              Resta: ${finanzas.deuda}
                            </div>
                          )}
                          
                          <div className="flex gap-2">
                            <button onClick={() => abrirTicket(pedido)} className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                              <FileText size={18} />
                            </button>
                            {!finanzas.estaLiquidado && (
                              <button onClick={() => abrirModalAbono(pedido)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
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
        </AnimatePresence>
      </div>

      {/* MODALES */}
      <NuevoPedidoModal isOpen={isModalOpen} onClose={cerrarModalNuevoPedido} onSave={agregarNuevoPedido} fechaPredefinida={fechaPredefinida} />
      <TicketPasteleriaModal isOpen={ticketModal.isOpen} onClose={cerrarTicket} pedido={ticketModal.pedido} calcularFinanzas={calcularFinanzas} />

      <AnimatePresence>
        {abonoModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-6">
                <div className="bg-emerald-500/10 p-2 rounded-xl text-emerald-500">
                  <DollarSign size={24} />
                </div>
                <button onClick={() => setAbonoModal({ isOpen: false, pedidoId: null, cliente: '' })} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-50 dark:bg-gray-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Registrar Pago</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Abono para: <span className="font-bold text-emerald-500">{abonoModal.cliente}</span></p>
              <form onSubmit={handleAbonar} className="space-y-6">
                <input type="number" required autoFocus min="1" placeholder="$ 0.00" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-4 text-3xl font-black text-gray-800 dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-center" />
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2">
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