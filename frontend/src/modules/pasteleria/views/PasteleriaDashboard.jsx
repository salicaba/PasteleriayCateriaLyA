// src/modules/pasteleria/views/PasteleriaDashboard.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarClock, Plus, Search, CheckCircle2, AlertTriangle, Wallet, Banknote,
  DollarSign, X, FileText, ShoppingBasket, ClockAlert, PackageCheck, Ban, Undo2, Smartphone, MessageCircle
} from 'lucide-react';
import { usePedidosController } from '../controllers/usePedidosController';
import NuevoPedidoModal from './NuevoPedidoModal';
import TicketPasteleriaModal from './TicketPasteleriaModal';
import DetallePedidoModal from './DetallePedidoModal';
import client from '../../../api/client';

export default function PasteleriaDashboard() {
  const { 
    pedidosFiltrados, conteos, loading, 
    activeTab, setActiveTab, searchQuery, setSearchQuery,
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida,
    abonoModal, setAbonoModal, abonoForm, setAbonoForm, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    confirmModal, pedirConfirmacion, cerrarConfirmacion, ejecutarAccionConfirmada,
    detalleModal, abrirDetalles, cerrarDetalles, 
    pedidoAEditar, iniciarEdicion,               
    calcularFinanzas, guardarPedido, registrarAbono
  } = usePedidosController();

  const [transferInfo, setTransferInfo] = useState(null);

  useEffect(() => {
    if (abonoModal.isOpen && abonoForm.metodo === 'transferencia') {
      client.get('/settings')
        .then(res => { if (res.data) setTransferInfo(res.data); })
        .catch(err => console.error("Error al cargar datos bancarios:", err));
    }
  }, [abonoModal.isOpen, abonoForm.metodo]);

  if (loading) return null; 

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
          bgIcon: 'bg-red-50 dark:bg-red-500/10'
        };
      case 'restaurar':
        return {
          icon: <Undo2 size={28} className="text-orange-500 lya:text-lya-secondary" />,
          title: 'Restaurar Pedido',
          description: 'El pedido volverá a la lista de activos o atrasados según su fecha.',
          color: 'bg-orange-500 hover:bg-orange-600 lya:bg-lya-secondary',
          bgIcon: 'bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-secondary/10'
        };
      default: return {};
    }
  };

  const detallesModal = getConfirmacionDetalles();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300"
    >
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
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={18} />
            <input type="text" placeholder="Buscar pedido..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 lya:focus:ring-lya-primary/30 transition-all lya:text-lya-text lya:placeholder-lya-text/40" />
          </div>

          <button onClick={() => abrirModalNuevoPedido()} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/30 lya:shadow-lya-secondary/30 transform hover:-translate-y-0.5 transition-all flex items-center justify-center space-x-2">
            <Plus size={20} /><span>Nuevo Pedido</span>
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-start gap-4 mb-6 shrink-0">
        <div className="flex gap-2 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/20 p-1 rounded-2xl overflow-x-auto">
          <button onClick={() => setActiveTab('activos')} className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'activos' && !searchQuery ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-emerald-500 lya:text-lya-secondary shadow-sm' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'}`} >
            <ShoppingBasket size={18} className="mr-2" /> Activos
            <span className={`ml-2 px-2 py-0.5 rounded-md text-[11px] font-black ${activeTab === 'activos' && !searchQuery ? 'bg-emerald-100 text-emerald-600 lya:bg-lya-secondary/20 lya:text-lya-secondary' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 lya:bg-lya-border/50 lya:text-lya-text/70'}`}>{conteos.activos}</span>
          </button>
          <button onClick={() => setActiveTab('atrasados')} className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'atrasados' && !searchQuery ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-rose-500 lya:text-rose-500 shadow-sm' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'}`} >
            <ClockAlert size={18} className="mr-2" /> Atrasados
            <span className={`ml-2 px-2 py-0.5 rounded-md text-[11px] font-black ${activeTab === 'atrasados' && !searchQuery ? 'bg-rose-100 text-rose-600 lya:bg-rose-500/20 lya:text-rose-500' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 lya:bg-lya-border/50 lya:text-lya-text/70'}`}>{conteos.atrasados}</span>
          </button>
          <button onClick={() => setActiveTab('entregadosHoy')} className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'entregadosHoy' && !searchQuery ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-blue-500 lya:text-blue-500 shadow-sm' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'}`} >
            <PackageCheck size={18} className="mr-2" /> Entregados Hoy
            <span className={`ml-2 px-2 py-0.5 rounded-md text-[11px] font-black ${activeTab === 'entregadosHoy' && !searchQuery ? 'bg-blue-100 text-blue-600 lya:bg-blue-500/20 lya:text-blue-500' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 lya:bg-lya-border/50 lya:text-lya-text/70'}`}>{conteos.entregadosHoy}</span>
          </button>
          <button onClick={() => setActiveTab('canceladosHoy')} className={`flex items-center px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${activeTab === 'canceladosHoy' && !searchQuery ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-red-500 lya:text-red-500 shadow-sm' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'}`} >
            <Ban size={18} className="mr-2" /> Cancelados Hoy
            <span className={`ml-2 px-2 py-0.5 rounded-md text-[11px] font-black ${activeTab === 'canceladosHoy' && !searchQuery ? 'bg-red-100 text-red-600 lya:bg-red-500/20 lya:text-red-500' : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 lya:bg-lya-border/50 lya:text-lya-text/70'}`}>{conteos.canceladosHoy}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
        {pedidosFiltrados.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-600 lya:text-lya-text/50">
            <ShoppingBasket size={64} className="mb-4 opacity-20" />
            <p className="text-xl font-bold">{searchQuery ? `No se encontró el pedido "${searchQuery}"` : 'No hay pedidos en esta sección'}</p>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 content-start">
            <AnimatePresence>
              {pedidosFiltrados.map((pedido) => {
                const finanzas = calcularFinanzas(pedido);
                const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
                const isAtrasado = new Date(pedido.fechaEntrega) < new Date() && pedido.estado !== 'entregado' && pedido.estado !== 'cancelado';
                const isCancelado = pedido.estado === 'cancelado';

                return (
                  <motion.div
                    key={pedido.id} 
                    layout 
                    initial={{ opacity: 0, scale: 0.98 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => abrirDetalles(pedido)} 
                    className={`cursor-pointer relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 flex flex-col justify-between h-full
                      ${isCancelado ? 'bg-gray-100 dark:bg-gray-900/50 lya:bg-lya-bg/50 border-gray-200 dark:border-gray-800 lya:border-lya-border/20 opacity-75 grayscale-[0.5]' : 'bg-white dark:bg-gray-900 lya:bg-lya-surface'}
                      ${!isCancelado && finanzas.requiereLiquidacionUrgente ? 'border-rose-500/50 shadow-rose-500/10 lya:border-rose-500/50' : ''}
                      ${!isCancelado && !finanzas.requiereLiquidacionUrgente ? 'border-gray-100 dark:border-gray-800 hover:border-emerald-400/50 lya:border-lya-border/30 lya:hover:border-lya-secondary/50' : ''}
                      ${isAtrasado ? 'border-orange-500/50 shadow-orange-500/10' : ''}`}
                  >
                    {isAtrasado && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">ATRASADO</div>}
                    {isCancelado && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-sm z-10">CANCELADO</div>}

                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-wider mb-2 inline-block lya:border lya:border-lya-border/30">{pedido.id}</span>
                          <h3 className={`text-lg font-bold truncate ${isCancelado ? 'text-gray-500 dark:text-gray-500 lya:text-lya-text/60 line-through' : 'text-gray-800 dark:text-white lya:text-lya-text'}`}>{pedido.cliente}</h3>
                        </div>
                        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border ${isCancelado ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 lya:bg-lya-bg lya:text-lya-text/50 lya:border-lya-border/20' : isAtrasado ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-500/10 lya:bg-lya-secondary/10 text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary border-emerald-500/10 lya:border-lya-secondary/20'}`}>
                          <CalendarClock size={14} /> {fecha}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-4">
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
                        <span className={`${isCancelado ? 'text-gray-400 line-through' : 'text-gray-800 dark:text-white lya:text-lya-text'}`}>${parseFloat(pedido.costoTotal).toFixed(2)}</span>
                      </div>
                      
                      <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 lya:bg-lya-border/40 rounded-full overflow-hidden mb-4">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((finanzas.totalPagado / pedido.costoTotal) * 100, 100)}%` }} className={`h-full ${isCancelado ? 'bg-gray-400' : finanzas.estaLiquidado ? 'bg-emerald-500 lya:bg-lya-secondary' : 'bg-amber-400 lya:bg-lya-primary'}`} />
                      </div>

                      <div className="flex justify-between items-center">
                        {finanzas.estaLiquidado ? (
                          <div className={`text-xs font-bold flex items-center gap-1 ${isCancelado ? 'text-gray-400' : 'text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary'}`}>
                            <CheckCircle2 size={14} /> Liquidado
                          </div>
                        ) : (
                          <div className={`text-xs font-bold ${isCancelado ? 'text-gray-400' : finanzas.requiereLiquidacionUrgente ? 'text-red-500 animate-pulse' : 'text-amber-600 lya:text-lya-text'}`}>
                            Resta: ${finanzas.deuda.toFixed(2)}
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          {isCancelado ? (
                            <button onClick={(e) => { e.stopPropagation(); pedirConfirmacion(pedido, 'restaurar'); }} title="Restaurar Pedido" className="p-2 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 lya:text-lya-secondary lya:hover:bg-lya-secondary/10 rounded-lg transition-colors border border-orange-200 dark:border-orange-800 lya:border-lya-secondary/30 bg-white dark:bg-gray-800 lya:bg-lya-surface">
                              <Undo2 size={18} />
                            </button>
                          ) : pedido.estado === 'entregado' ? (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); abrirTicket(pedido); }} title="Ver Ticket" className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 lya:text-lya-secondary lya:hover:bg-lya-secondary/10 rounded-lg transition-colors">
                                <FileText size={18} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); pedirConfirmacion(pedido, 'restaurar'); }} title="Deshacer Entrega" className="p-2 text-orange-500 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30 lya:text-lya-secondary lya:hover:bg-lya-secondary/10 rounded-lg transition-colors border border-orange-200 dark:border-orange-800 lya:border-lya-secondary/30 bg-white dark:bg-gray-800 lya:bg-lya-surface">
                                <Undo2 size={18} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); abrirTicket(pedido); }} title="Ver Ticket" className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 lya:text-lya-secondary lya:hover:bg-lya-secondary/10 rounded-lg transition-colors">
                                <FileText size={18} />
                              </button>
                              
                              <button onClick={(e) => { e.stopPropagation(); pedirConfirmacion(pedido, 'cancelar'); }} title="Cancelar Pedido" className="p-2 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 lya:text-red-500 lya:hover:bg-red-500/10 rounded-lg transition-colors">
                                <Ban size={18} />
                              </button>

                              {pedido.estado !== 'entregado' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); pedirConfirmacion(pedido, 'entregar'); }} 
                                  disabled={!finanzas.estaLiquidado}
                                  title={finanzas.estaLiquidado ? "Marcar como Entregado" : "Debes registrar el pago total antes de entregar"}
                                  className={`p-2 rounded-lg transition-colors ${finanzas.estaLiquidado ? 'text-emerald-500 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30 lya:text-lya-primary lya:hover:bg-lya-primary/10' : 'text-gray-300 dark:text-gray-600 lya:text-lya-text/30 cursor-not-allowed'}`}
                                >
                                  <PackageCheck size={18} />
                                </button>
                              )}

                              {!finanzas.estaLiquidado && pedido.estado !== 'entregado' && (
                                <button onClick={(e) => { e.stopPropagation(); abrirModalAbono(pedido); }} className="bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">
                                  <DollarSign size={14} className="inline mr-1" /> Abonar
                                </button>
                              )}
                            </>
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
                {new Date() < new Date(confirmModal.pedido?.fechaEntrega) && confirmModal.tipo === 'entregar' && (
                  <div className="mt-4 flex items-start gap-2 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 p-3 rounded-xl text-left border border-amber-200 dark:border-amber-500/30">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                    <span className="text-xs font-medium">Nota: Este pedido estaba programado para el {new Date(confirmModal.pedido?.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'short', month: 'short', day: 'numeric'})}.</span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={cerrarConfirmacion} className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:bg-lya-bg/80 text-gray-700 dark:text-gray-300 lya:text-lya-text/80 font-bold py-3 rounded-xl transition-colors">Volver</button>
                <button onClick={ejecutarAccionConfirmada} className={`flex-1 text-white lya:text-lya-surface font-bold py-3 rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 ${detallesModal.color}`}>Confirmar</button>
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
      />
      
      <TicketPasteleriaModal isOpen={ticketModal.isOpen} onClose={cerrarTicket} pedido={ticketModal.pedido} calcularFinanzas={calcularFinanzas} />

      <AnimatePresence>
        {abonoModal.isOpen && abonoModal.pedido && (() => {
          const p = abonoModal.pedido;
          const fin = calcularFinanzas(p);
          
          // AQUÍ ESTÁ LA VARIABLE CORREGIDA: costoFormat
          const costoFormat = parseFloat(p.costoTotal).toFixed(2);
          
          const montoIngresadoNum = parseFloat(abonoForm.monto) || 0;
          const recibidoNum = parseFloat(abonoForm.recibido) || 0;
          
          const mostrarCambio = abonoForm.metodo === 'efectivo' && recibidoNum > 0;
          const cambio = Math.max(recibidoNum - montoIngresadoNum, 0);

          const submitPago = (e) => {
            e.preventDefault();
            registrarAbono(p.id, abonoForm.monto, abonoForm.metodo);
          };

          return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 lya:bg-black/50 backdrop-blur-md">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }} className="bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2rem] w-full max-w-lg shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 overflow-hidden flex flex-col max-h-[90vh]">
                
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30 lya:bg-lya-bg/50">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text">Registrar Pago</h3>
                    <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary">Cliente: {p.cliente}</p>
                  </div>
                  <button onClick={() => setAbonoModal({ isOpen: false, pedido: null })} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white lya:text-lya-text/50 bg-white dark:bg-gray-800 lya:bg-lya-bg rounded-full shadow-sm transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg p-3 rounded-2xl text-center border border-gray-100 dark:border-gray-700 lya:border-lya-border/40">
                      <span className="block text-[10px] uppercase font-bold text-gray-400 lya:text-lya-text/50 mb-1">Total</span>
                      {/* LLAMADO CORREGIDO: costoFormat */}
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
                    
                    {/* SECCIÓN 1: MONTO A ABONAR */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-2xl p-5 space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase">Monto a Abonar</label>
                          <button type="button" onClick={() => setAbonoForm({...abonoForm, monto: fin.deuda.toString()})} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 lya:bg-lya-secondary/20 lya:text-lya-secondary px-2 py-1 rounded-md transition-colors hover:bg-emerald-200">Liquidar Restante</button>
                        </div>
                        <div className="relative">
                          <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                          <input type="number" required min="1" max={fin.deuda} step="0.01" placeholder="0.00" value={abonoForm.monto} onChange={(e) => setAbonoForm({...abonoForm, monto: e.target.value})} className="w-full bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-xl pl-12 pr-4 py-3 text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/30 lya:focus:ring-lya-secondary/30 transition-all" />
                        </div>
                      </div>
                    </div>

                    {/* SECCIÓN 2: MÉTODO DE PAGO Y PANELES */}
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
                                <input type="number" min={abonoForm.monto || 0} step="0.01" placeholder="Ej: 500" value={abonoForm.recibido} onChange={(e) => setAbonoForm({...abonoForm, recibido: e.target.value})} className="w-full bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 rounded-xl pl-12 pr-4 py-3 text-lg font-bold text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/30 lya:focus:ring-lya-secondary/30 transition-all" />
                              </div>
                              
                              <div className="flex gap-2 mt-3 overflow-x-auto custom-scrollbar pb-1">
                                <button type="button" onClick={() => setAbonoForm({...abonoForm, recibido: (parseFloat(abonoForm.monto) || 0).toString()})} className="px-4 py-2 bg-emerald-500/10 lya:bg-lya-secondary/10 text-emerald-600 lya:text-lya-secondary border border-emerald-500/20 lya:border-lya-secondary/20 rounded-lg text-xs font-black whitespace-nowrap active:scale-95 transition-transform">
                                  Exacto
                                </button>
                                {[50, 100, 200, 500, 1000].filter(v => v > (parseFloat(abonoForm.monto) || 0)).map(val => (
                                  <button type="button" key={val} onClick={() => setAbonoForm({...abonoForm, recibido: val.toString()})} className="px-4 py-2 bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-700 dark:text-gray-300 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-lg text-xs font-bold whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm active:scale-95 transition-transform">
                                    ${val}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <AnimatePresence>
                              {mostrarCambio && (
                                <motion.div initial={{ opacity: 0, scale: 0.9, height: 0 }} animate={{ opacity: 1, scale: 1, height: 'auto' }} exit={{ opacity: 0, scale: 0.9, height: 0 }} className="overflow-hidden">
                                  <div className="bg-emerald-500 lya:bg-lya-secondary text-white lya:text-lya-surface p-4 rounded-2xl flex justify-between items-center shadow-lg shadow-emerald-500/20 lya:shadow-lya-secondary/20">
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
                            
                            {/* 🚀 BANNER NEO-BENTO PARA RECORDATORIO DE WHATSAPP 🚀 */}
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

                            {/* 🚀 CARDS DE BANCO ACTUALIZADAS Y HOMOLOGADAS CON MÓDULO DE CAFETERÍA 🚀 */}
                            <div className="flex gap-3 overflow-x-auto custom-scrollbar pt-2 pb-2 px-1">
                              {transferInfo.bank_accounts.map(acc => (
                                <div key={acc.id} className="min-w-[85%] sm:min-w-[280px] p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-3xl shrink-0 shadow-sm flex flex-col justify-between">
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
                  <button type="submit" form="abonoForm" className="w-full bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 text-white lya:text-lya-surface font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 lya:shadow-lya-secondary/30 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2">
                    <CheckCircle2 size={20} /> Confirmar Pago
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </motion.div>
  );
}