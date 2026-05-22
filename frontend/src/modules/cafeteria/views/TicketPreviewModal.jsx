// src/modules/cafeteria/views/TicketPreviewModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, X, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export const TicketPreviewModal = ({ isOpen, onClose, cart, mesa, cuentaName, onConfirmPrint, onSendWhatsApp }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  
  // Efecto para auto-completar el teléfono si viene en el string de la mesa (Para Llevar)
  useEffect(() => {
    if (isOpen && mesa) {
      const partes = (mesa.numero || '').toString().split(' - ');
      if (mesa.zona === 'llevar' && partes.length > 2) {
        const posibleTelefono = partes[partes.length - 1].replace(/\D/g, '');
        if (posibleTelefono.length >= 10) {
          setPhoneNumber(posibleTelefono.slice(0, 10));
          return;
        }
      }
      setPhoneNumber('');
    }
  }, [isOpen, mesa]);

  if (!isOpen) return null;

  const itemsToPrint = cuentaName ? cart.filter(item => item.cuenta === cuentaName) : cart;
  const totalToPrint = itemsToPrint.reduce((acc, item) => acc + (item.precio * item.qty), 0);

  // Cuentas únicas
  const cuentasActivas = Array.from(new Set(itemsToPrint.map(item => item.cuenta || 'General')));

  const isLlevar = mesa?.zona === 'llevar';
  const partesNumero = (mesa?.numero || '').toString().split(' - ');
  const numeroReal = partesNumero[0]; 
  
  let nombreCliente = 'MOSTRADOR';
  if (partesNumero.length > 1) {
    const ultimaParteDigitos = partesNumero[partesNumero.length - 1].replace(/\D/g, '');
    if (isLlevar && partesNumero.length > 2 && ultimaParteDigitos.length >= 10) {
      nombreCliente = partesNumero.slice(1, -1).join(' - ');
    } else {
      nombreCliente = partesNumero.slice(1).join(' - ');
    }
  }

  const handlePhysicalPrint = () => {
    onConfirmPrint();
  };

  const handleWhatsAppClick = () => {
    if (phoneNumber.trim().length < 10) {
      toast.error('Por favor, ingresa un número de celular a 10 dígitos.');
      return;
    }
    if (onSendWhatsApp) {
      onSendWhatsApp(phoneNumber, itemsToPrint, totalToPrint);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:hidden">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        className="bg-gray-100 dark:bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 max-h-[90vh]"
      >
        
        {/* CABECERA */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shrink-0">
          <h3 className="font-bold text-gray-700 dark:text-gray-200">
            Comprobante Digital
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-full transition-colors" 
          >
            <X size={18} />
          </button>
        </div>

        {/* TICKET VISUAL ESTILO PASTELERÍA (MONOSPACE) */}
        <div className="overflow-y-auto p-6 custom-scrollbar flex-1">
          <div id="printable-ticket-content" className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-gray-800 font-mono text-sm relative w-full mx-auto" style={{ maxWidth: '340px' }}>
            
            {/* Efecto de borde de ticket arrancado superior */}
            <div className="absolute top-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_4px,#fff_5px)] bg-[length:10px_10px] -mt-1"></div>

            {/* Header del Ticket */}
            <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
              <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: 'serif' }}>𝓛𝔂𝓐</h2>
              <p className="text-xs font-bold text-gray-600 uppercase mt-1">Pastelería & Cafetería</p>
              <p className="text-xs text-gray-500 mt-1">Comprobante de Consumo</p>
              <p className="text-sm font-bold mt-2 text-black">
                {new Date().toLocaleDateString('es-MX')} {new Date().toLocaleTimeString('es-MX', {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>

            {/* Info de Mesa y Cliente */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between"><span className="text-gray-500">{isLlevar ? 'TICKET:' : 'MESA:'}</span> <span className="font-bold text-right text-black">{isLlevar ? numeroReal : `#${numeroReal}`}</span></div>
              {isLlevar && nombreCliente !== 'MOSTRADOR' && (
                <div className="flex justify-between"><span className="text-gray-500">Cliente:</span> <span className="font-bold text-right text-black uppercase">{nombreCliente}</span></div>
              )}
              {cuentaName && cuentaName !== 'General' && (
                <div className="flex justify-between"><span className="text-gray-500">Cuenta:</span> <span className="font-bold text-right text-black uppercase">{cuentaName}</span></div>
              )}
            </div>

            {/* Tabla de Productos */}
            <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-gray-400 text-[11px] uppercase tracking-wider border-b border-dashed border-gray-200">
                    <th className="pb-2 font-bold w-[15%]">Cant</th>
                    <th className="pb-2 font-bold w-[60%]">Desc</th>
                    <th className="pb-2 font-bold w-[25%] text-right">Imp</th>
                  </tr>
                </thead>
                <tbody className="text-[13px] sm:text-sm">
                  <tr><td colSpan="3" className="h-2"></td></tr>
                  
                  {cuentasActivas.map(accName => {
                    const accountItems = itemsToPrint.filter(item => (item.cuenta || 'General') === accName);
                    if (accountItems.length === 0) return null;

                    return (
                      <React.Fragment key={accName}>
                        {cuentasActivas.length > 1 && !cuentaName && (
                          <tr>
                            <td colSpan="3" className="text-[10px] font-bold text-gray-500 uppercase pt-2 pb-1">
                              ● Cuenta: {accName}
                            </td>
                          </tr>
                        )}

                        {accountItems.map((item, idx) => (
                          <React.Fragment key={`${accName}-${idx}`}>
                            <tr>
                              <td className="font-bold align-top pt-2 text-black">{item.qty}</td>
                              <td className="align-top pt-2 pr-1 break-words leading-tight">{item.nombre}</td>
                              <td className="align-top pt-2 text-right font-medium text-black">${(item.precio * item.qty).toFixed(2)}</td>
                            </tr>
                            {item.preparaciones?.map((prep, pIdx) => {
                              if (!prep || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                              return (
                                <tr key={`p-${accName}-${idx}-${pIdx}`}>
                                  <td></td>
                                  <td colSpan="2" className="text-[10px] text-gray-500 italic pb-1 pr-1 break-words leading-tight">
                                    - {prep.tamano} {prep.leche ? `• ${prep.leche}` : ''}
                                    {prep.extras?.length > 0 && ` • +${prep.extras.join(', ')}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Resumen por Cuentas */}
            {cuentasActivas.length > 1 && !cuentaName && (
              <div className="mb-4 text-xs text-gray-600">
                <p className="font-bold border-b border-dashed border-gray-300 pb-1 mb-2 text-gray-500 uppercase tracking-wider text-[10px]">Resumen por Cuentas:</p>
                <div className="space-y-1">
                  {cuentasActivas.map(accName => {
                    const subTotalAcc = itemsToPrint.filter(item => (item.cuenta || 'General') === accName).reduce((sum, item) => sum + (item.precio * item.qty), 0);
                    return (
                      <div key={accName} className="flex justify-between">
                        <span className="uppercase">{accName}:</span>
                        <span className="font-bold text-black">${subTotalAcc.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Gran Total */}
            <div className="flex justify-between text-base mt-2 pt-2 border-t border-gray-300">
              <span className="font-bold">TOTAL:</span>
              <span className="font-black text-black text-lg">${totalToPrint.toFixed(2)}</span>
            </div>

            {/* Footer */}
            <div className="text-center mt-6 text-xs text-gray-500 font-bold">
              <p>¡Gracias por su preferencia!</p>
              <p className="mt-1 text-sm text-black">Vuelva pronto</p>
            </div>
          </div>
        </div>

        {/* CONTROLES INFERIORES */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-5px_15px_rgba(0,0,0,0.05)] z-10 shrink-0 p-4 flex items-center gap-3">
          <div className="flex-1 relative flex items-center">
            <input 
              type="tel" 
              placeholder="Número de WhatsApp" 
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl pl-4 pr-12 py-3.5 text-xs sm:text-sm font-bold outline-none focus:border-green-500 text-gray-800 dark:text-white transition-colors"
            />
            <button 
              onClick={handleWhatsAppClick}
              disabled={phoneNumber.length < 10}
              className="absolute right-1.5 p-2 bg-green-500 text-white rounded-xl disabled:opacity-50 disabled:bg-gray-300 hover:bg-green-600 active:scale-95 transition-all shadow-md shadow-green-500/20"
            >
              <MessageCircle size={18} strokeWidth={2.5} />
            </button>
          </div>

          <button 
            onClick={handlePhysicalPrint}
            className="py-3.5 px-5 rounded-2xl font-black text-sm uppercase bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2 shrink-0"
          >
            <Printer size={20} />
          </button>
        </div>

      </motion.div>
    </div>
  );
};