// src/modules/pasteleria/views/PasteleriaCalendar.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Cake, Clock, CheckCircle2, AlertCircle, FileText, DollarSign, Plus, X, CalendarDays, Search } from 'lucide-react';
import { usePedidosController } from '../controllers/usePedidosController';
import NuevoPedidoModal from './NuevoPedidoModal';
import TicketPasteleriaModal from './TicketPasteleriaModal';

export default function PasteleriaCalendar() {
  const { 
    pedidos, loading, 
    isModalOpen, abrirModalNuevoPedido, cerrarModalNuevoPedido, fechaPredefinida,
    abonoModal, setAbonoModal, abrirModalAbono, 
    ticketModal, abrirTicket, cerrarTicket,
    calcularFinanzas, agregarNuevoPedido, registrarAbono 
  } = usePedidosController();

  const [montoIngresado, setMontoIngresado] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // 🔥 NUEVO ESTADO: Para controlar el valor del input de búsqueda y poder limpiarlo
  const [fechaBusqueda, setFechaBusqueda] = useState('');

  if (loading) return null;

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => i);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  // 🔥 ACTUALIZADA: Guardamos el valor en el estado para controlarlo
  const handleDateSearch = (e) => {
    const dateVal = e.target.value;
    setFechaBusqueda(dateVal); // Guardamos lo que el usuario escribe
    if (!dateVal) return;
    
    const [year, month, day] = dateVal.split('-');
    const newDate = new Date(year, month - 1, day);
    
    setCurrentMonth(newDate);
    setSelectedDate(newDate);
  };

  // 🔥 NUEVA FUNCIÓN: Regresar al día de hoy y limpiar la búsqueda
  const handleIrAHoy = () => {
    const hoy = new Date();
    setCurrentMonth(hoy);
    setSelectedDate(hoy);
    setFechaBusqueda(''); // Limpia el input del buscador de fechas
  };

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const getPedidosForDate = (date) => {
    return pedidos.filter(p => {
      const pDate = new Date(p.fechaEntrega);
      return pDate.getDate() === date.getDate() && pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear();
    });
  };

  const pedidosSeleccionados = getPedidosForDate(selectedDate);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaSeleccionadaLimpia = new Date(selectedDate);
  fechaSeleccionadaLimpia.setHours(0, 0, 0, 0);
  
  const esFechaValidaParaPedido = fechaSeleccionadaLimpia >= hoy;

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
      {/* HEADER FIJO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-emerald-500/20 lya:shadow-lya-primary/20">
            <CalendarDays size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text">Agenda</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Calendario de entregas agendadas</p>
          </div>
        </div>

        {/* BUSCADOR RÁPIDO DE FECHAS */}
        <div className="w-full md:w-auto flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-2 rounded-2xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 focus-within:ring-2 focus-within:ring-emerald-500/30 transition-all">
          <div className="bg-white dark:bg-gray-700 lya:bg-lya-surface p-2 rounded-xl text-emerald-500 lya:text-lya-primary shadow-sm">
             <Search size={16} />
          </div>
          <div className="flex flex-col pr-2 flex-1">
             <label className="text-[10px] font-black text-gray-400 lya:text-lya-text/50 uppercase tracking-wider">Ir a fecha</label>
             <input
               type="date"
               value={fechaBusqueda} // Conectado al estado
               onChange={handleDateSearch}
               className="bg-transparent border-none outline-none text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text cursor-pointer leading-none"
             />
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* LADO IZQUIERDO: Calendario */}
        <div className="lg:w-7/12 flex flex-col bg-white/40 dark:bg-black/20 lya:bg-lya-surface/40 backdrop-blur-md border border-white/20 dark:border-gray-800 lya:border-lya-border/20 rounded-3xl p-6 shadow-xl overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold dark:text-white lya:text-lya-text capitalize">
              {meses[currentMonth.getMonth()]} <span className="text-emerald-500 lya:text-lya-primary">{currentMonth.getFullYear()}</span>
            </h2>
            <div className="flex gap-2 items-center">
              {/* 🔥 BOTÓN HOY AÑADIDO AQUÍ */}
              <button 
                onClick={handleIrAHoy} 
                className="px-4 py-2 mr-1 bg-emerald-100/50 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-800/50 lya:bg-lya-primary/10 lya:hover:bg-lya-primary/20 text-emerald-700 dark:text-emerald-400 lya:text-lya-primary rounded-xl font-bold text-sm transition-colors shadow-sm active:scale-95"
              >
                Hoy
              </button>
              <button onClick={prevMonth} className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-bg rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 lya:hover:bg-lya-surface transition-colors dark:text-white lya:text-lya-text active:scale-95"><ChevronLeft size={20}/></button>
              <button onClick={nextMonth} className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-bg rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 lya:hover:bg-lya-surface transition-colors dark:text-white lya:text-lya-text active:scale-95"><ChevronRight size={20}/></button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {diasSemana.map(d => <div key={d} className="text-xs font-bold text-gray-400 dark:text-gray-500 lya:text-lya-text/50 uppercase">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
            {blanks.map(b => <div key={`blank-${b}`} className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800/50 lya:border-lya-border/30 opacity-30"></div>)}
            
            {days.map(day => {
              const dateOfThisDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
              const isSelected = dateOfThisDay.toDateString() === selectedDate.toDateString();
              const isToday = dateOfThisDay.toDateString() === new Date().toDateString();
              
              const pedidosDelDia = getPedidosForDate(dateOfThisDay);
              const numPedidos = pedidosDelDia.length;

              let indicatorColor = '';
              if (numPedidos > 0 && numPedidos <= 2) indicatorColor = 'bg-emerald-400 shadow-emerald-400/50 lya:bg-lya-secondary lya:shadow-lya-secondary/50';
              if (numPedidos > 2 && numPedidos <= 4) indicatorColor = 'bg-amber-400 shadow-amber-400/50 lya:bg-lya-primary lya:shadow-lya-primary/50';
              if (numPedidos > 4) indicatorColor = 'bg-rose-500 shadow-rose-500/50';

              return (
                <motion.button
                  key={day} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedDate(dateOfThisDay)}
                  className={`relative flex flex-col items-center p-2 rounded-2xl border transition-all duration-300 min-h-[4rem]
                    ${isSelected ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/30 lya:bg-lya-secondary lya:border-lya-secondary lya:shadow-lya-secondary/30' : 
                      isToday ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 lya:bg-lya-secondary/10 lya:border-lya-secondary/30' : 
                      'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 lya:bg-lya-surface lya:border-lya-border/30 lya:hover:border-lya-secondary/50'}
                  `}
                >
                  <span className={`text-sm font-bold ${isSelected ? 'text-white lya:text-lya-surface' : isToday ? 'text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary' : 'text-gray-700 dark:text-gray-200 lya:text-lya-text'}`}>{day}</span>
                  {numPedidos > 0 && (
                    <div className={`mt-auto w-full flex justify-center`}>
                      <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm ${isSelected ? 'bg-white text-emerald-600 lya:bg-lya-surface lya:text-lya-secondary' : `${indicatorColor} text-white`}`}>
                        <Cake size={10} /> {numPedidos}
                      </div>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* LADO DERECHO: Lista de Entregas del Día */}
        <div className="lg:w-5/12 flex flex-col bg-white/40 dark:bg-black/20 lya:bg-lya-surface/40 backdrop-blur-md border border-white/20 dark:border-gray-800 lya:border-lya-border/20 rounded-3xl p-6 shadow-xl overflow-hidden">
          
          <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/30 shrink-0">
            <h3 className="text-xl font-bold dark:text-white lya:text-lya-text">Agenda del Día</h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 lya:text-lya-secondary font-medium capitalize mt-1">
              {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-4">
            <AnimatePresence mode="popLayout">
              {pedidosSeleccionados.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-gray-400 lya:text-lya-text/40">
                  <Cake size={48} className="mb-3 opacity-20" />
                  <p className="mb-4 text-center">No hay entregas agendadas<br/>para este día.</p>
                </motion.div>
              ) : (
                pedidosSeleccionados.map(pedido => {
                  const finanzas = calcularFinanzas(pedido);
                  const hora = new Date(pedido.fechaEntrega).toLocaleTimeString('es-MX', { hour: '2-digit', minute:'2-digit' });

                  return (
                    <motion.div
                      layout initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                      key={pedido.id}
                      className={`p-4 rounded-2xl bg-white dark:bg-gray-800 lya:bg-lya-surface border shadow-sm flex flex-col gap-3
                        ${finanzas.requiereLiquidacionUrgente ? 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-900/10' : 'border-gray-100 dark:border-gray-700 lya:border-lya-border/40'}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">{pedido.id}</span>
                          <h4 className="font-bold text-gray-800 dark:text-white lya:text-lya-text">{pedido.cliente}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg px-2 py-1 rounded-lg">
                          <Clock size={14} className="text-emerald-500 lya:text-lya-secondary" /> {hora}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 lya:text-lya-text/70 line-clamp-2">{pedido.descripcion}</p>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex justify-between items-center">
                        {finanzas.estaLiquidado ? (
                          <span className="text-xs font-bold text-emerald-500 lya:text-lya-secondary flex items-center gap-1"><CheckCircle2 size={14}/> Liquidado</span>
                        ) : (
                          <span className={`text-xs font-bold flex items-center gap-1 ${finanzas.requiereLiquidacionUrgente ? 'text-rose-500' : 'text-amber-500 lya:text-lya-primary'}`}>
                            {finanzas.requiereLiquidacionUrgente && <AlertCircle size={14} className="animate-pulse" />} Resta: ${finanzas.deuda}
                          </span>
                        )}
                        
                        <div className="flex gap-2">
                          <button onClick={() => abrirTicket(pedido)} className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 lya:bg-lya-secondary/10 lya:text-lya-secondary rounded-lg transition-colors"><FileText size={16}/></button>
                          {!finanzas.estaLiquidado && (
                            <button onClick={() => abrirModalAbono(pedido)} className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 lya:bg-lya-secondary/10 lya:text-lya-secondary rounded-lg transition-colors"><DollarSign size={16}/></button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {esFechaValidaParaPedido && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800 lya:border-lya-border/30 shrink-0">
              <button 
                onClick={() => abrirModalNuevoPedido(selectedDate)}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface font-bold rounded-xl shadow-lg shadow-emerald-500/30 lya:shadow-lya-primary/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> Crear Pedido Aquí
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALES ADJUNTOS A LA PÁGINA */}
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