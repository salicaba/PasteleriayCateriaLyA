import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cake, CalendarClock, AlertCircle, DollarSign, CheckCircle2 } from 'lucide-react';

const COLUMNAS = [
  { 
    id: 'pendiente', titulo: 'Pendientes', 
    color: 'text-gray-500 lya:text-lya-primary', 
    border: 'border-gray-500/30 lya:border-lya-primary/40', 
    bg: 'bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-primary/5' 
  },
  { 
    id: 'produccion', titulo: 'En Producción', 
    color: 'text-amber-500 lya:text-lya-text', 
    border: 'border-amber-500/30 lya:border-lya-text/30', 
    bg: 'bg-amber-50 dark:bg-amber-900/10 lya:bg-lya-text/5' 
  },
  { 
    id: 'decoracion', titulo: 'Decoración', 
    color: 'text-purple-500 lya:text-lya-text', 
    border: 'border-purple-500/30 lya:border-lya-border/50', 
    bg: 'bg-purple-50 dark:bg-purple-900/10 lya:bg-lya-border/20' 
  },
  { 
    id: 'listo', titulo: 'Listos (Entrega)', 
    color: 'text-emerald-500 lya:text-lya-secondary', 
    border: 'border-emerald-500/30 lya:border-lya-secondary/40', 
    bg: 'bg-emerald-50 dark:bg-emerald-900/10 lya:bg-lya-secondary/10' 
  }
];

export default function PasteleriaKanban({ pedidos, calcularFinanzas, abrirModalAbono, cambiarEstadoPedido }) {
  
  const handleDragStart = (e, pedidoId) => {
    e.dataTransfer.setData('pedidoId', pedidoId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, columnaId) => {
    e.preventDefault();
    const pedidoId = e.dataTransfer.getData('pedidoId');
    cambiarEstadoPedido(pedidoId, columnaId);
  };

  return (
    <div className="flex h-full gap-4 overflow-x-auto pb-4 custom-scrollbar">
      {COLUMNAS.map((columna) => {
        const pedidosColumna = pedidos.filter(p => p.estado === columna.id);

        return (
          <div 
            key={columna.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, columna.id)}
            className={`min-w-[320px] w-[320px] flex flex-col rounded-2xl border ${columna.border} ${columna.bg} overflow-hidden shrink-0 transition-colors`}
          >
            {/* Header de Columna */}
            <div className={`p-4 border-b ${columna.border} flex justify-between items-center bg-white/50 dark:bg-black/20 lya:bg-lya-surface/40 backdrop-blur-sm`}>
              <h3 className={`font-black ${columna.color}`}>{columna.titulo}</h3>
              <span className="bg-white dark:bg-black/50 lya:bg-lya-surface lya:border lya:border-lya-border/30 text-xs font-bold px-2.5 py-1 rounded-full text-gray-600 dark:text-gray-300 lya:text-lya-text shadow-sm">
                {pedidosColumna.length}
              </span>
            </div>

            {/* Zona de Drop (Tarjetas) */}
            <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
              <AnimatePresence>
                {pedidosColumna.map(pedido => {
                  const finanzas = calcularFinanzas(pedido);
                  const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });

                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={pedido.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, pedido.id)}
                      className={`cursor-grab active:cursor-grabbing bg-white dark:bg-gray-800 lya:bg-lya-surface p-4 rounded-xl shadow-sm border hover:shadow-md transition-shadow relative overflow-hidden
                        ${finanzas.requiereLiquidacionUrgente ? 'border-rose-500/50 bg-rose-50/50 dark:bg-rose-900/10 lya:border-rose-500/50' : 'border-gray-200 dark:border-gray-700 lya:border-lya-border/30'}
                      `}
                    >
                      {/* Indicador de Deuda Urgente (Glow) */}
                      {finanzas.requiereLiquidacionUrgente && <div className="absolute -top-10 -right-10 w-20 h-20 bg-rose-500/20 blur-xl rounded-full"></div>}

                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/50">{pedido.id}</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg lya:border lya:border-lya-border/20 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300 lya:text-lya-text/80">
                          <CalendarClock size={12} className={columna.color} /> {fecha}
                        </div>
                      </div>

                      <h4 className="font-bold text-sm text-gray-800 dark:text-gray-100 lya:text-lya-text flex items-center gap-1.5 mb-2">
                        <Cake size={14} className={columna.color}/> {pedido.cliente}
                      </h4>

                      {/* Mini Tags */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {pedido.porciones && pedido.porciones.slice(0, 1).map((p, idx) => (
                          <span key={idx} className="text-[9px] font-bold bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg lya:border lya:border-lya-border/30 text-gray-600 dark:text-gray-300 lya:text-lya-text px-1.5 py-0.5 rounded">{p}</span>
                        ))}
                        {pedido.saborPan && pedido.saborPan.slice(0, 1).map((s, idx) => (
                          <span key={idx} className="text-[9px] font-bold bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg lya:border lya:border-lya-border/30 text-gray-600 dark:text-gray-300 lya:text-lya-text px-1.5 py-0.5 rounded">{s}</span>
                        ))}
                        {(pedido.porciones?.length > 1 || pedido.saborPan?.length > 1) && <span className="text-[9px] text-gray-400 lya:text-lya-text/50">+{pedido.porciones.length + pedido.saborPan.length - 2}</span>}
                      </div>

                      {/* Mini Finanzas */}
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700 lya:border-lya-border/20 flex justify-between items-center">
                        {finanzas.estaLiquidado ? (
                          <span className="text-[10px] font-bold text-emerald-500 lya:text-lya-secondary flex items-center gap-1"><CheckCircle2 size={12}/> Liquidado</span>
                        ) : (
                          <div className="flex items-center gap-2 w-full justify-between">
                            <span className={`text-[10px] font-bold flex items-center gap-1 ${finanzas.requiereLiquidacionUrgente ? 'text-rose-500' : 'text-amber-500 lya:text-lya-text/70'}`}>
                              {finanzas.requiereLiquidacionUrgente && <AlertCircle size={12} className="animate-pulse" />} Resta: ${finanzas.deuda}
                            </span>
                            <button onClick={() => abrirModalAbono(pedido)} className="p-1.5 bg-gray-100 hover:bg-emerald-100 dark:bg-gray-700 dark:hover:bg-emerald-900/30 lya:bg-lya-bg lya:hover:bg-lya-secondary/20 text-gray-600 hover:text-emerald-600 dark:text-gray-300 dark:hover:text-emerald-400 lya:text-lya-text lya:hover:text-lya-secondary lya:border lya:border-lya-border/20 rounded-lg transition-colors">
                              <DollarSign size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              
              {pedidosColumna.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700/50 lya:border-lya-border/40 rounded-xl text-xs text-gray-400 lya:text-lya-text/50 font-medium">
                  Arrastra un pedido aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}