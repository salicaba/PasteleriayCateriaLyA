import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Send, Cake } from 'lucide-react';

export default function TicketPasteleriaModal({ isOpen, onClose, pedido, calcularFinanzas }) {
  const ticketRef = useRef(null);

  if (!pedido) return null;

  const finanzas = calcularFinanzas(pedido);
  const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' });

  // Función para enviar por WhatsApp
  const handleWhatsApp = () => {
    // Limpiamos el teléfono de caracteres que no sean números
    const telefonoLimpio = pedido.telefono?.replace(/\D/g, '') || '';
    
    const mensaje = `¡Hola ${pedido.cliente}! 👋\nAquí tienes el comprobante de tu pedido en *Pastelería LyA* 🎂.\n\n*Folio:* ${pedido.id}\n*Entrega:* ${fecha}\n*Detalles:* ${pedido.descripcion}\n\n*Total:* $${pedido.costoTotal}\n*Abonado:* $${finanzas.totalPagado}\n*Resta por pagar:* $${finanzas.deuda}\n\n¡Gracias por tu preferencia! ✨`;
    
    // Si hay teléfono usa la API directa a ese número, si no, abre la ventana genérica para elegir contacto
    const url = telefonoLimpio 
      ? `https://wa.me/52${telefonoLimpio}?text=${encodeURIComponent(mensaje)}`
      : `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
      
    window.open(url, '_blank');
  };

  // Función para Imprimir (Usa el diálogo nativo del navegador enfocado en el ticket)
  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 print:hidden" />
          
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-md h-fit max-h-[90vh] bg-gray-100 dark:bg-gray-900 border border-white/20 dark:border-gray-700 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col print:relative print:shadow-none print:border-none print:bg-white print:m-0 print:max-w-none print:h-auto"
          >
            {/* Cabecera de Acciones (Oculta al imprimir) */}
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 print:hidden shrink-0">
              <h3 className="font-bold text-gray-700 dark:text-gray-200">Comprobante Digital</h3>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"><X size={18} /></button>
            </div>

            {/* Contenido del Ticket (Lo que se imprime) */}
            <div className="overflow-y-auto p-6 custom-scrollbar print:p-0 flex-1">
              <div ref={ticketRef} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 print:shadow-none print:border-none print:w-[80mm] print:mx-auto text-gray-800 font-mono text-sm relative">
                
                {/* Borde dentado decorativo arriba y abajo (estilo ticket) */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_4px,#fff_5px)] bg-[length:10px_10px] -mt-1 print:hidden"></div>
                
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                  <Cake size={32} className="mx-auto mb-2 text-gray-800" />
                  <h2 className="text-xl font-black uppercase tracking-widest">Pastelería LyA</h2>
                  <p className="text-xs text-gray-500">Comprobante de Pedido</p>
                  <p className="text-lg font-bold mt-2">{pedido.id}</p>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between"><span className="text-gray-500">Cliente:</span> <span className="font-bold text-right">{pedido.cliente}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Teléfono:</span> <span className="text-right">{pedido.telefono || 'N/A'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Entrega:</span> <span className="font-bold text-right capitalize">{fecha}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tipo:</span> <span className="font-bold text-right uppercase">{pedido.tipoEntrega}</span></div>
                </div>

                <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4 space-y-3">
                  <p className="font-bold">Detalles del Pastel:</p>
                  {pedido.porciones?.length > 0 && <p className="text-xs"><span className="text-gray-500">Tamaño:</span> {pedido.porciones.join(' / ')}</p>}
                  {pedido.saborPan?.length > 0 && <p className="text-xs"><span className="text-gray-500">Sabores:</span> {pedido.saborPan.join(' / ')}</p>}
                  <p className="text-xs mt-2 italic">"{pedido.descripcion}"</p>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-base"><span className="text-gray-500">Costo Total:</span> <span className="font-bold">${pedido.costoTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base"><span className="text-gray-500">Abonado:</span> <span>${finanzas.totalPagado.toFixed(2)}</span></div>
                  <div className="flex justify-between text-lg mt-2 pt-2 border-t border-gray-200"><span className="font-bold">RESTA:</span> <span className="font-black">${finanzas.deuda.toFixed(2)}</span></div>
                </div>

                <div className="text-center mt-8 text-xs text-gray-500">
                  <p>El pedido debe estar liquidado al momento de su entrega.</p>
                  <p className="mt-2">¡Gracias por celebrar con nosotros!</p>
                </div>
              </div>
            </div>

            {/* Footer de Acciones (Oculto al imprimir) */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-3 print:hidden shrink-0">
              <button onClick={handlePrint} className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl transition-colors">
                <Printer size={18} /> Imprimir
              </button>
              <button onClick={handleWhatsApp} className="flex-[2] flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5a] text-white font-bold py-3 rounded-xl shadow-lg shadow-[#25D366]/30 transition-colors">
                <Send size={18} /> Enviar WhatsApp
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}