import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Cake, Clock, CheckCircle2, AlertCircle, FileText, DollarSign, Plus } from 'lucide-react';

export default function PasteleriaCalendar({ pedidos, calcularFinanzas, abrirTicket, abrirModalAbono, abrirModalNuevoPedido }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDay === 0 ? 6 : firstDay - 1 }, (_, i) => i);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const getPedidosForDate = (date) => {
    return pedidos.filter(p => {
      const pDate = new Date(p.fechaEntrega);
      return pDate.getDate() === date.getDate() && pDate.getMonth() === date.getMonth() && pDate.getFullYear() === date.getFullYear();
    });
  };

  const pedidosSeleccionados = getPedidosForDate(selectedDate);

  // Validación para saber si el día seleccionado es futuro o presente
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechaSeleccionadaLimpia = new Date(selectedDate);
  fechaSeleccionadaLimpia.setHours(0, 0, 0, 0);
  
  const esFechaValidaParaPedido = fechaSeleccionadaLimpia >= hoy;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
      
      {/* LADO IZQUIERDO: Calendario */}
      <div className="lg:w-7/12 flex flex-col bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-xl overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white capitalize">
            {meses[currentMonth.getMonth()]} <span className="text-emerald-500">{currentMonth.getFullYear()}</span>
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"><ChevronLeft size={20}/></button>
            <button onClick={nextMonth} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors dark:text-white"><ChevronRight size={20}/></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2 text-center">
          {diasSemana.map(d => <div key={d} className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
          {blanks.map(b => <div key={`blank-${b}`} className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-800/50 opacity-30"></div>)}
          
          {days.map(day => {
            const dateOfThisDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isSelected = dateOfThisDay.toDateString() === selectedDate.toDateString();
            const isToday = dateOfThisDay.toDateString() === new Date().toDateString();
            
            const pedidosDelDia = getPedidosForDate(dateOfThisDay);
            const numPedidos = pedidosDelDia.length;

            let indicatorColor = '';
            if (numPedidos > 0 && numPedidos <= 2) indicatorColor = 'bg-emerald-400 shadow-emerald-400/50';
            if (numPedidos > 2 && numPedidos <= 4) indicatorColor = 'bg-amber-400 shadow-amber-400/50';
            if (numPedidos > 4) indicatorColor = 'bg-rose-500 shadow-rose-500/50';

            return (
              <motion.button
                key={day} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setSelectedDate(dateOfThisDay)}
                className={`relative flex flex-col items-center p-2 rounded-2xl border transition-all duration-300 min-h-[4rem]
                  ${isSelected ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/30' : 
                    isToday ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 
                    'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'}
                `}
              >
                <span className={`text-sm font-bold ${isSelected ? 'text-white' : isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-200'}`}>{day}</span>
                {numPedidos > 0 && (
                  <div className={`mt-auto w-full flex justify-center`}>
                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm ${isSelected ? 'bg-white text-emerald-600' : `${indicatorColor} text-white`}`}>
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
      <div className="lg:w-5/12 flex flex-col bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl p-6 shadow-xl overflow-hidden">
        
        {/* Header Limpio (Sin el botón pequeño) */}
        <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <h3 className="text-xl font-bold dark:text-white">Agenda del Día</h3>
          <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium capitalize mt-1">
            {selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Lista de Pedidos (Scrolleable) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4 mb-4">
          <AnimatePresence mode="popLayout">
            {pedidosSeleccionados.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center text-gray-400">
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
                    className={`p-4 rounded-2xl bg-white dark:bg-gray-800 border shadow-sm flex flex-col gap-3
                      ${finanzas.requiereLiquidacionUrgente ? 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-900/10' : 'border-gray-100 dark:border-gray-700'}
                    `}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">{pedido.id}</span>
                        <h4 className="font-bold text-gray-800 dark:text-white">{pedido.cliente}</h4>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                        <Clock size={14} className="text-emerald-500" /> {hora}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{pedido.descripcion}</p>

                    <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                      {finanzas.estaLiquidado ? (
                        <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><CheckCircle2 size={14}/> Liquidado</span>
                      ) : (
                        <span className={`text-xs font-bold flex items-center gap-1 ${finanzas.requiereLiquidacionUrgente ? 'text-rose-500' : 'text-amber-500'}`}>
                          {finanzas.requiereLiquidacionUrgente && <AlertCircle size={14} className="animate-pulse" />} Resta: ${finanzas.deuda}
                        </span>
                      )}
                      
                      <div className="flex gap-2">
                        <button onClick={() => abrirTicket(pedido)} className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"><FileText size={16}/></button>
                        {!finanzas.estaLiquidado && (
                          <button onClick={() => abrirModalAbono(pedido)} className="p-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg transition-colors"><DollarSign size={16}/></button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* BOTÓN ÚNICO FIJO AL FINAL */}
        {esFechaValidaParaPedido && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
            <button 
              onClick={() => abrirModalNuevoPedido(selectedDate)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Crear Pedido Aquí
            </button>
          </div>
        )}
      </div>
    </div>
  );
}