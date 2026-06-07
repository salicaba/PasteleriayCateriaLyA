import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Printer, Cake, Landmark, MessageCircle } from 'lucide-react';
import client from '../../../api/client'; 
import toast from 'react-hot-toast';
import { SuccessScreen } from '../../cafeteria/views/SuccessScreen'; 

export default function TicketPasteleriaModal({ isOpen, onClose, pedido, calcularFinanzas }) {
  const ticketRef = useRef(null);
  const [transferInfo, setTransferInfo] = useState(null); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentSuccessData, setPaymentSuccessData] = useState(null);

  useEffect(() => {
    if (isOpen) {
      client.get('/settings')
        .then(res => { if (res.data) setTransferInfo(res.data); })
        .catch(err => console.error("Error al cargar datos bancarios:", err));
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && pedido) {
      const telLimpio = pedido.telefono?.replace(/\D/g, '') || '';
      if (telLimpio.length >= 10) {
        setPhoneNumber(telLimpio.slice(-10));
      } else {
        setPhoneNumber('');
      }
    }
  }, [isOpen, pedido]);

  if (!pedido) return null;

  const finanzas = calcularFinanzas(pedido);
  const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { 
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute:'2-digit' 
  });

  const costoTotalNum = parseFloat(pedido.costoTotal) || 0;

  // ==========================================
  // 🔥 LÓGICA WHATSAPP
  // ==========================================
  const handleWhatsAppClick = () => {
    if (phoneNumber.trim().length < 10) {
      toast.error('Por favor, ingresa un número de celular válido a 10 dígitos.');
      return;
    }
    
    const baseUrl = client.defaults.baseURL || (window.location.origin + '/api');
    const absoluteUrl = baseUrl.startsWith('http') ? baseUrl : window.location.origin + baseUrl;
    const shareLink = `${absoluteUrl}/pasteleria/pedidos/${pedido.id}/share`;

    let cuentasTexto = '';
    if (finanzas.deuda > 0 && transferInfo?.bank_accounts?.length > 0) {
      cuentasTexto = '\n\n*💳 Cuentas para depósito/transferencia:*\n';
      transferInfo.bank_accounts.forEach(acc => {
        cuentasTexto += `\n🏦 *${acc.bank_name}*\nTitular: ${acc.account_holder}\nCuenta: ${acc.account_number}\n${acc.clabe ? `CLABE: ${acc.clabe}\n` : ''}`;
      });
      cuentasTexto += `\n💡 _Importante: En el *concepto* de tu pago, por favor escribe tu folio: *${pedido.id}*_`;
    }
    
    const mensajeWhatsApp = `🧁 *𝓛𝔂𝓪 Pastelería & Cafetería* ☕\n\n¡Hola! Agradecemos mucho tu preferencia. Aquí tienes el enlace directo para visualizar y descargar tu ticket de consumo en formato PDF:\n\n🔗 ${shareLink}\n\n*Total de la cuenta:* $${costoTotalNum.toFixed(2)}\n*Abonado:* $${finanzas.totalPagado.toFixed(2)}\n*Resta por pagar:* $${finanzas.deuda.toFixed(2)}${cuentasTexto}\n\n¡Esperamos verte pronto de nuevo! ✨`;
    
    const urlApiWhatsApp = `https://api.whatsapp.com/send?phone=52${phoneNumber}&text=${encodeURIComponent(mensajeWhatsApp)}`;
    window.open(urlApiWhatsApp, '_blank');

    setPaymentSuccessData({
      title: '¡Enlace Creado!',
      message: 'El ticket digital ha sido preparado para WhatsApp.'
    });
    
    setTimeout(() => {
      setPaymentSuccessData(null);
      onClose();
    }, 1800); 
  };

  // ==========================================
  // 🖨️ LÓGICA IMPRESIÓN
  // ==========================================
  const handlePrint = async () => {
    setPaymentSuccessData({
      title: '¡Enviado a Impresora!',
      message: 'El ticket se está imprimiendo.'
    });

    try {
      await client.post(`/pasteleria/pedidos/${pedido.id}/print`);
    } catch (error) {
      console.error('Error al imprimir:', error);
      toast.error('Error al conectar con la impresora térmica.');
    }

    setTimeout(() => {
      setPaymentSuccessData(null);
      onClose();
    }, 1800);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
            
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: paymentSuccessData ? 0 : 1 }} 
              exit={{ opacity: 0 }} 
              onClick={onClose} 
              className="absolute inset-0 bg-black/60 lya:bg-black/50 backdrop-blur-sm transition-opacity duration-300" 
            />
            
            <AnimatePresence>
              {!paymentSuccessData && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative w-full max-w-md bg-gray-100 dark:bg-gray-900 border border-white/20 dark:border-gray-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shrink-0">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200">Comprobante Digital</h3>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors"><X size={18} /></button>
                  </div>

                  <div className="overflow-y-auto p-6 custom-scrollbar flex-1">
                    <div ref={ticketRef} className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-gray-800 font-mono text-sm relative w-full mx-auto">
                      <div className="absolute top-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_4px,#fff_5px)] bg-[length:10px_10px] -mt-1"></div>
                      
                      <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                        <Cake size={32} className="mx-auto mb-2 text-gray-800" />
                        <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: 'serif' }}>𝓛𝔂𝓪</h2>
                        <p className="text-xs font-bold text-gray-600 uppercase">Pastelería & Cafetería</p>
                        <p className="text-xs text-gray-500 mt-1">Comprobante de Pedido</p>
                        <p className="text-lg font-bold mt-2 text-black">{pedido.id}</p>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between"><span className="text-gray-500">Cliente:</span> <span className="font-bold text-right text-black uppercase">{pedido.cliente || 'Público'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Teléfono:</span> <span className="text-right">{pedido.telefono || 'N/A'}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Entrega:</span> <span className="font-bold text-right capitalize text-black">{fecha}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Tipo:</span> <span className="font-bold text-right uppercase text-black">{pedido.tipoEntrega}</span></div>
                      </div>

                      <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4 space-y-3">
                        <p className="font-bold text-black">Detalles del Pedido:</p>
                        <p className="text-xs text-gray-700"><span className="text-gray-500">Categoría:</span> <span className="font-bold">{pedido.categoria || 'Pastel'}</span></p>
                        {pedido.porciones?.length > 0 && <p className="text-xs text-gray-700"><span className="text-gray-500">Tamaño:</span> {Array.isArray(pedido.porciones) ? pedido.porciones.join(' / ') : pedido.porciones}</p>}
                        {pedido.saborPan?.length > 0 && <p className="text-xs text-gray-700"><span className="text-gray-500">Sabores:</span> {Array.isArray(pedido.saborPan) ? pedido.saborPan.join(' / ') : pedido.saborPan}</p>}
                        <p className="text-xs mt-2 italic text-gray-600">"{pedido.descripcion || 'Sin descripción adicional'}"</p>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-base"><span className="text-gray-500">Costo Total:</span> <span className="font-bold text-black">${costoTotalNum.toFixed(2)}</span></div>
                        <div className="flex justify-between text-base"><span className="text-gray-500">Abonado:</span> <span className="text-black">${finanzas.totalPagado.toFixed(2)}</span></div>
                        <div className="flex justify-between text-lg mt-2 pt-2 border-t border-gray-200"><span className="font-bold text-black uppercase">Resta:</span> <span className="font-black text-black">${finanzas.deuda.toFixed(2)}</span></div>
                      </div>

                      {finanzas.deuda > 0 && transferInfo?.bank_accounts?.length > 0 && (
                        <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300">
                          <p className="font-bold text-center flex items-center justify-center gap-2 mb-3 uppercase text-[10px] text-gray-500">Datos para liquidar</p>
                          <div className="space-y-3">
                            {transferInfo.bank_accounts.map(acc => (
                              <div key={acc.id} className="text-[11px] bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <p className="font-black uppercase mb-1 text-black">{acc.bank_name}</p>
                                <p className="flex justify-between text-gray-600"><span>Titular:</span> <span className="font-bold text-black">{acc.account_holder}</span></p>
                                <p className="flex justify-between text-gray-600"><span>Cuenta:</span> <span className="font-bold text-black">{acc.account_number}</span></p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-center mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                        <p>¡Gracias por celebrar con nosotros!</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3 shrink-0">
                    <div className="flex-1 relative flex items-center">
                      <input 
                        type="tel" 
                        placeholder="Número WhatsApp" 
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl pl-4 pr-12 py-3.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-green-500/20 text-gray-800 dark:text-white transition-all"
                      />
                      <button 
                        onClick={handleWhatsAppClick}
                        disabled={phoneNumber.length < 10}
                        className="absolute right-1.5 p-2 bg-[#25D366] text-white rounded-xl disabled:opacity-50 disabled:bg-gray-300 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-green-500/20"
                      >
                        <MessageCircle size={18} strokeWidth={2.5} />
                      </button>
                    </div>

                    <button 
                      onClick={handlePrint}
                      className="py-3.5 px-6 rounded-2xl font-black text-sm uppercase bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-105 shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2"
                    >
                      <Printer size={20} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentSuccessData && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[200]"
          > 
            <SuccessScreen 
              title={paymentSuccessData.title} 
              message={paymentSuccessData.message} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}