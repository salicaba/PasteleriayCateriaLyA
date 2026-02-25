import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarClock, Plus, Cake, AlertCircle, CheckCircle2, DollarSign, X, FileText, LayoutGrid, CalendarDays } from 'lucide-react';
import { usePedidosController } from '../controllers/usePedidosController';
import NuevoPedidoModal from './NuevoPedidoModal';
import TicketPasteleriaModal from './TicketPasteleriaModal';
import PasteleriaCalendar from './PasteleriaCalendar';

export default function PasteleriaDashboard() {
  const { 
    pedidos, loading, 
    viewMode, setViewMode,
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida, // NUEVO
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
    <div className="p-6 h-full flex flex-col gap-6 relative overflow-hidden">
      
      {/* HEADER DEL MÓDULO */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 p-4 rounded-2xl shadow-xl shrink-0 z-10">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Producción & Agenda
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gestión de pasteles y logística de entregas</p>
        </div>
        
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="flex bg-gray-200/50 dark:bg-gray-800 rounded-xl p-1 shrink-0">
            <button onClick={() => setViewMode('grid')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <LayoutGrid size={16} /> <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button onClick={() => setViewMode('calendar')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'calendar' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              <CalendarDays size={16} /> <span className="hidden sm:inline">Agenda</span>
            </button>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} 
            onClick={() => abrirModalNuevoPedido()} // Ahora usamos la nueva función sin pasarle fecha (hoy)
            className="flex-1 sm:flex-none bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 font-bold"
          >
            <Plus size={20} /> Nuevo Pedido
          </motion.button>
        </div>
      </div>

      {/* RENDERIZADO CONDICIONAL DE VISTAS */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'calendar' ? (
          <PasteleriaCalendar 
            pedidos={pedidos} 
            calcularFinanzas={calcularFinanzas} 
            abrirTicket={abrirTicket} 
            abrirModalAbono={abrirModalAbono} 
            abrirModalNuevoPedido={abrirModalNuevoPedido} // Pasamos la función al calendario
          />
        ) : (
          /* VISTA GRID ORIGINAL */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 overflow-y-auto h-full pb-20 custom-scrollbar content-start">
            <AnimatePresence>
              {pedidos.map((pedido) => {
                const finanzas = calcularFinanzas(pedido);
                const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

                return (
                  <motion.div
                    key={pedido.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    className={`relative overflow-hidden rounded-2xl backdrop-blur-lg border p-5 shadow-2xl transition-all duration-300 flex flex-col justify-between h-full
                      ${finanzas.requiereLiquidacionUrgente ? 'bg-rose-500/10 border-rose-500/50 dark:bg-rose-900/20 shadow-rose-500/20' : 'bg-white/40 dark:bg-gray-900/40 border-white/40 dark:border-white/10 hover:border-emerald-400/50'}`}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -z-10"></div>
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="text-xs font-bold px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 mb-2 inline-block">
                            {pedido.id}
                          </span>
                          <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                            <Cake size={18} className="text-emerald-500"/> {pedido.cliente}
                          </h3>
                        </div>
                        <div className="text-right flex flex-col items-end">
                          <div className="flex items-center gap-1 text-xs font-bold bg-white/50 dark:bg-black/50 px-2 py-1 rounded-lg text-gray-600 dark:text-gray-300">
                            <CalendarClock size={14} className="text-emerald-500" /> {fecha}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {pedido.porciones && pedido.porciones.map((p, idx) => <span key={`p-${idx}`} className="text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-1 rounded-md border border-amber-200/50 dark:border-amber-800/50">{p}</span>)}
                        {pedido.saborPan && pedido.saborPan.map((s, idx) => <span key={`s-${idx}`} className="text-[11px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-2 py-1 rounded-md border border-purple-200/50 dark:border-purple-800/50">{s}</span>)}
                        {pedido.tipoEntrega === 'domicilio' && <span className="text-[11px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-md border border-blue-200/50 dark:border-blue-800/50">Envío Domicilio</span>}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 min-h-[40px]">{pedido.descripcion}</p>
                    </div>

                    <div className="bg-white/60 dark:bg-black/40 rounded-xl p-3 border border-white/20 dark:border-white/5 mt-auto">
                      <div className="flex justify-between text-sm mb-1"><span className="text-gray-500">Total:</span><span className="font-bold dark:text-white">${pedido.costoTotal}</span></div>
                      <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden my-2">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((finanzas.totalPagado / pedido.costoTotal) * 100, 100)}%` }} className={`h-full ${finanzas.estaLiquidado ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        {finanzas.estaLiquidado ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-sm font-black bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-lg"><CheckCircle2 size={16} /> Liquidado</span>
                        ) : (
                          <span className="flex items-center gap-1 text-rose-500 text-sm font-black">{finanzas.requiereLiquidacionUrgente && <AlertCircle size={16} className="animate-pulse" />} Resta: ${finanzas.deuda}</span>
                        )}
                        
                        <div className="flex gap-2">
                          <button onClick={() => abrirTicket(pedido)} className="text-xs font-bold bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg shadow-md transition-colors flex items-center gap-1">
                            <FileText size={14} />
                          </button>
                          {!finanzas.estaLiquidado && (
                            <button onClick={() => abrirModalAbono(pedido)} className="text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg shadow-md transition-colors flex items-center gap-1">
                              <DollarSign size={14} /> Abonar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* MODALES ACTUALIZADOS CON LA NUEVA LÓGICA DE FECHA */}
      <NuevoPedidoModal 
        isOpen={isModalOpen} 
        onClose={cerrarModalNuevoPedido} 
        onSave={agregarNuevoPedido} 
        fechaPredefinida={fechaPredefinida} // Le pasamos la fecha clickeada en el calendario
      />
      <TicketPasteleriaModal isOpen={ticketModal.isOpen} onClose={cerrarTicket} pedido={ticketModal.pedido} calcularFinanzas={calcularFinanzas} />

      <AnimatePresence>
        {abonoModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg dark:text-white">Registrar Pago</h3>
                <button onClick={() => setAbonoModal({ isOpen: false, pedidoId: null, cliente: '' })} className="text-gray-400 hover:text-gray-600 dark:hover:text-white"><X size={20} /></button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Abono a la cuenta de: <span className="font-bold text-emerald-500">{abonoModal.cliente}</span></p>
              <form onSubmit={handleAbonar} className="space-y-4">
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3.5 text-emerald-500" size={20} />
                  <input type="number" required autoFocus min="1" placeholder="Monto del abono" value={montoIngresado} onChange={(e) => setMontoIngresado(e.target.value)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-2xl font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 transition-colors">Confirmar Pago</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}