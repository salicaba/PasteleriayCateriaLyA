// src/modules/cafeteria/views/TicketPreviewModal.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Printer, X, MessageCircle } from 'lucide-react';

export const TicketPreviewModal = ({ isOpen, onClose, cart, mesa, cuentaName, onConfirmPrint, onSendWhatsApp }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  
  if (!isOpen) return null;

  // Filtrar los productos por cuenta si se seleccionó una en específico, si no, se usan todos
  const itemsToPrint = cuentaName ? cart.filter(item => item.cuenta === cuentaName) : cart;
  const totalToPrint = itemsToPrint.reduce((acc, item) => acc + (item.precio * item.qty), 0);

  // Obtener la lista de cuentas únicas que tienen productos en este ticket
  const cuentasActivas = Array.from(new Set(itemsToPrint.map(item => item.cuenta || 'General')));

  const isLlevar = mesa?.zona === 'llevar';
  const partesNumero = (mesa?.numero || '').toString().split(' - ');
  const numeroReal = partesNumero[0]; 
  const nombreCliente = partesNumero.length > 1 ? partesNumero.slice(1).join(' - ') : 'MOSTRADOR';

  const handlePhysicalPrint = () => {
    const printContent = document.getElementById('printable-ticket-content').innerHTML;
    const iframe = document.createElement('iframe');
    
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const style = `
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { font-family: 'Courier New', Courier, monospace; padding: 10px; color: black; background: white; margin: 0; font-size: 12px; box-sizing: border-box; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-black { font-weight: 900; }
        .text-3xl { font-size: 30px; }
        .border-dashed { border-top: 1px dashed black; margin: 8px 0; }
        .flex-between { display: flex; justify-content: space-between; align-items: start; gap: 8px; }
        .mt-1 { margin-top: 4px; }
        .mt-2 { margin-top: 8px; }
        .mt-3 { margin-top: 12px; }
        .mt-4 { margin-top: 16px; }
        .mb-1 { margin-bottom: 4px; }
        .mb-2 { margin-bottom: 8px; }
        .mb-4 { margin-bottom: 16px; }
        .uppercase { text-transform: uppercase; }
        .h-8 { height: 32px; }
        .account-header { font-weight: bold; text-transform: uppercase; padding: 4px 0; border-bottom: 1px dashed #ccc; margin-top: 6px; font-size: 11px; }
      </style>
    `;

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<html><head>${style}</head><body>${printContent}</body></html>`);
    doc.close();

    iframe.contentWindow.focus();
    iframe.contentWindow.print();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);

    onConfirmPrint();
  };

  const handleWhatsAppClick = () => {
    if (phoneNumber.trim().length < 10) {
      alert('Por favor, ingresa un número de celular válido a 10 dígitos.');
      return;
    }
    if (onSendWhatsApp) {
      onSendWhatsApp(phoneNumber, itemsToPrint, totalToPrint);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.9, opacity: 0, y: 20 }} 
        className="bg-gray-100 dark:bg-gray-900 rounded-3xl w-full max-w-sm shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 max-h-[90vh]"
      >
        
        {/* CABECERA */}
        <div className="flex justify-between items-center p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 shrink-0">
          <h3 className="font-black text-gray-800 dark:text-white flex items-center gap-2">
            Vista Previa del Ticket
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors text-gray-500 dark:text-gray-300" 
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* TICKET VISUAL */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar bg-gray-200 dark:bg-gray-950 w-full relative block">
          <div 
            id="printable-ticket-content" 
            className="bg-white text-black p-5 shadow-md leading-tight mx-auto h-max" 
            style={{ width: '100%', minWidth: '260px', maxWidth: '320px', fontFamily: '"Courier New", Courier, monospace', fontSize: '12px', boxSizing: 'border-box' }}
          >
            <div className="text-center mb-4">
              <h1 className="text-3xl font-black mb-1" style={{ fontFamily: 'serif' }}>𝓛𝔂𝓐</h1>
              <p className="font-bold">Pastelería & Cafetería</p>
              <p>Pijijiapan, Chiapas</p>
            </div>

            <div className="border-dashed"></div>

            <div className="mt-2 mb-2">
              <div className="flex-between">
                <span>Fecha:</span>
                <span className="text-right">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
              </div>
              <div className="flex-between font-bold mt-1">
                <span>{isLlevar ? 'TICKET:' : 'MESA:'}</span>
                <span className="text-right">{isLlevar ? numeroReal : `#${numeroReal}`}</span>
              </div>
              {isLlevar && nombreCliente !== 'MOSTRADOR' && (
                <div className="flex-between mt-1">
                  <span>Cliente:</span>
                  <span className="text-right uppercase">{nombreCliente}</span>
                </div>
              )}
              {cuentaName && cuentaName !== 'General' && (
                <div className="flex-between mt-1">
                  <span>Cuenta:</span>
                  <span className="text-right uppercase font-bold">{cuentaName}</span>
                </div>
              )}
            </div>

            <div className="border-dashed"></div>

            <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', marginTop: '8px' }}>
              <thead>
                <tr>
                  <th style={{ width: '15%', textAlign: 'left', borderBottom: '1px dashed #9ca3af', paddingBottom: '4px' }}>Cant</th>
                  <th style={{ width: '60%', textAlign: 'left', borderBottom: '1px dashed #9ca3af', paddingBottom: '4px' }}>Desc</th>
                  <th style={{ width: '25%', textAlign: 'right', borderBottom: '1px dashed #9ca3af', paddingBottom: '4px' }}>Imp</th>
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan="3" style={{ height: '6px', padding: 0 }}></td></tr>
                
                {/* Iteramos por cuenta activa para separar los productos visualmente */}
                {cuentasActivas.map(accName => {
                  const accountItems = itemsToPrint.filter(item => (item.cuenta || 'General') === accName);
                  if (accountItems.length === 0) return null;

                  return (
                    <React.Fragment key={accName}>
                      {/* Cabecera de cuenta secundaria (Solo si imprimimos la mesa completa y hay más de una cuenta) */}
                      {cuentasActivas.length > 1 && !cuentaName && (
                        <tr>
                          <td colSpan="3" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', paddingTop: '10px', paddingBottom: '4px', color: '#4b5563', borderBottom: '1px dashed #e5e7eb' }}>
                            ● Cuenta: {accName}
                          </td>
                        </tr>
                      )}

                      {accountItems.map((item, idx) => (
                        <React.Fragment key={`${accName}-${idx}`}>
                          <tr>
                            <td style={{ fontWeight: 'bold', verticalAlign: 'top', paddingTop: '4px' }}>{item.qty}</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '4px', paddingRight: '4px', wordWrap: 'break-word', wordBreak: 'break-word' }}>{item.nombre}</td>
                            <td style={{ verticalAlign: 'top', paddingTop: '4px', textAlign: 'right' }}>${(item.precio * item.qty).toFixed(2)}</td>
                          </tr>
                          {item.preparaciones?.map((prep, pIdx) => {
                            if (!prep || (prep.tamano === 'Estándar' && !prep.leche && (!prep.extras || prep.extras.length === 0))) return null;
                            return (
                              <tr key={`p-${accName}-${idx}-${pIdx}`}>
                                <td></td>
                                <td colSpan="2" style={{ fontSize: '10px', color: '#333', opacity: 0.8, verticalAlign: 'top', wordWrap: 'break-word', wordBreak: 'break-word', paddingRight: '4px' }}>
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

            <div className="border-dashed mt-2"></div>

            {/* NUEVO DESGLOSE: Resumen financiero por cuentas independientes */}
            {cuentasActivas.length > 1 && !cuentaName && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#374151' }}>
                <p style={{ fontWeight: 'bold', borderBottom: '1px dashed #d1d5db', paddingBottom: '2px', marginBottom: '4px' }}>RESUMEN POR CUENTAS:</p>
                {cuentasActivas.map(accName => {
                  const subTotalAcc = itemsToPrint.filter(item => (item.cuenta || 'General') === accName).reduce((sum, item) => sum + (item.precio * item.qty), 0);
                  return (
                    <div key={accName} className="flex-between mt-1">
                      <span className="uppercase">{accName}:</span>
                      <span className="font-bold">${subTotalAcc.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className="border-dashed mt-2"></div>
              </div>
            )}

            <div className="flex-between mt-2 font-black" style={{ fontSize: '16px' }}>
              <span>TOTAL MESA:</span>
              <span>${totalToPrint.toFixed(2)}</span>
            </div>

            <div className="border-dashed mt-2"></div>

            <div className="text-center mt-4">
              <p className="font-bold">¡Gracias por su preferencia!</p>
              <p className="mt-1">Vuelva pronto</p>
            </div>
            
            <div className="h-8"></div>
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