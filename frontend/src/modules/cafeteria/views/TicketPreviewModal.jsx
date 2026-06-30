import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, X, MessageCircle, Coffee, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export const TicketPreviewModal = ({ 
  isOpen, 
  onClose, 
  cart, 
  mesa, 
  cuentaName, 
  telefonoPredeterminado = '', 
  onConfirmPrint, 
  onSendWhatsApp,
  userName = 'Cajero en turno'
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [viewMode, setViewMode] = useState('Todas');
  
  // Estados para la Trinidad de UX (Prevención de Doble Clic)
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const uniqueAccounts = Array.from(new Set(cart.map(item => item.cuenta || 'General')));
  
  useEffect(() => {
    if (isOpen) {
      setViewMode(cuentaName || 'Todas');
      
      if (telefonoPredeterminado) {
        setPhoneNumber(telefonoPredeterminado);
        return;
      }
      
      if (mesa) {
        const partes = (mesa.numero || '').toString().split(' - ');
        if (mesa.zona === 'llevar' && partes.length > 2) {
          const posibleTelefono = partes[partes.length - 1].replace(/\D/g, '');
          if (posibleTelefono.length >= 10) {
            setPhoneNumber(posibleTelefono.slice(0, 10));
            return;
          }
        }
      }
      setPhoneNumber('');
    }
  }, [isOpen, mesa, cuentaName, telefonoPredeterminado]);

  const itemsToPrint = viewMode === 'Todas' ? cart : cart.filter(item => (item.cuenta || 'General') === viewMode);
  const totalToPrint = itemsToPrint.reduce((acc, item) => acc + (item.precio * item.qty), 0);
  const accountsToRender = viewMode === 'Todas' ? uniqueAccounts : [viewMode];

  const isLlevar = mesa?.zona === 'llevar';
  const isVitrina = mesa?.zona === 'vitrina';

  const partesNumero = (mesa?.numero || '').toString().split(' - ');
  
  let numeroReal = partesNumero[0] || 'Pedido';
  numeroReal = numeroReal.replace(/Llevar\s*#?/i, '').trim(); 
  
  let nombreCliente = 'MOSTRADOR';
  if (partesNumero.length > 1) {
    const ultimaParteDigitos = partesNumero[partesNumero.length - 1].replace(/\D/g, '');
    if (isLlevar && partesNumero.length > 2 && ultimaParteDigitos.length >= 10) {
      nombreCliente = partesNumero.slice(1, -1).join(' - ');
    } else {
      nombreCliente = partesNumero.slice(1).join(' - ');
    }
  }

  const generarFolio = () => {
    if (mesa?.folio) return mesa.folio; 
    if (mesa?.orderId) {
       const shortId = mesa.orderId.split('-')[0].toUpperCase();
       return isVitrina ? `MOS-${shortId}` : `CAF-${shortId}`;
    }
    return isVitrina ? 'MOS-000000' : 'CAF-000000';
  };

  const ticketFolio = generarFolio();

  // Envoltorio con Promesas para estados asíncronos y UX limpia
  const handlePhysicalPrint = async () => {
    try {
      setIsPrinting(true);
      await onConfirmPrint(viewMode === 'Todas' ? null : viewMode);
      // El onConfirmPrint debe manejar su propio toast de éxito si aplica
    } catch (error) {
      toast.error('Error al intentar imprimir el ticket.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleWhatsAppClick = async () => {
    if (phoneNumber.trim().length < 10) {
      toast.error('Por favor, ingresa un número celular válido de 10 dígitos.');
      return;
    }
    if (onSendWhatsApp) {
      try {
        setIsSending(true);
        await onSendWhatsApp(phoneNumber, itemsToPrint, totalToPrint, viewMode === 'Todas' ? null : viewMode);
      } catch (error) {
        toast.error('Error al preparar el envío de WhatsApp.');
      } finally {
        setIsSending(false);
      }
    }
  };

  const now = new Date();
  const diaSemana = now.toLocaleDateString('es-MX', { weekday: 'long' });
  const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
  const fechaFormateada = now.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const horaFormateada = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true });
  const currentDateTimeStr = `${diaSemanaCap}, ${fechaFormateada} ${horaFormateada}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md print:hidden">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0, y: 20 }} 
            animate={{ scale: 1, opacity: 1, y: 0 }} 
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="bg-gray-100 dark:bg-gray-900 lya:bg-[#FDF8F5] rounded-[2rem] w-full max-w-md shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800 lya:border-orange-100 max-h-[90vh]"
          >
            
            {/* CABECERA (Fija) */}
            <div className="flex justify-between items-center p-5 border-b border-gray-200 dark:border-gray-800 lya:border-orange-100 bg-white dark:bg-gray-800 lya:bg-white shrink-0">
              <h3 className="font-bold text-gray-800 dark:text-gray-100 lya:text-orange-950 text-lg flex items-center gap-2">
                <Coffee size={20} className="text-orange-500" />
                {isVitrina ? 'Ticket de Mostrador' : 'Comprobante Digital'}
              </h3>
              <button 
                onClick={onClose} 
                disabled={isPrinting || isSending}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white lya:hover:text-orange-600 bg-gray-100 dark:bg-gray-700 lya:bg-orange-50 rounded-full transition-colors disabled:opacity-50" 
              >
                <X size={20} />
              </button>
            </div>

            {/* SELECTOR DE CUENTAS (Fijo) */}
            {uniqueAccounts.length > 1 && (
              <div className="px-5 py-3 border-b border-gray-200 dark:border-gray-800 lya:border-orange-100 bg-gray-50 dark:bg-gray-800/50 lya:bg-orange-50/30 shrink-0">
                <p className="text-[10px] uppercase font-bold text-gray-500 lya:text-orange-600/70 mb-2 tracking-wider">
                  Seleccionar cuenta a mostrar / enviar:
                </p>
                <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
                  <button
                    onClick={() => setViewMode('Todas')}
                    className={clsx(
                      "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200",
                      viewMode === 'Todas' 
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100"
                    )}
                  >
                    Todas las cuentas
                  </button>
                  {uniqueAccounts.map(acc => (
                    <button
                      key={acc}
                      onClick={() => setViewMode(acc)}
                      className={clsx(
                        "px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all duration-200 flex items-center gap-2",
                        viewMode === acc 
                          ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30" 
                          : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100"
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-current opacity-70"></span>
                      {acc}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TICKET VISUAL ESTILO PASTELERÍA (Scroll Interno) */}
            <div className="overflow-y-auto p-6 custom-scrollbar flex-1 bg-gray-100 dark:bg-gray-900 lya:bg-[#FDF8F5]">
              <div id="printable-ticket-content" className="bg-white dark:bg-gray-100 p-8 rounded-2xl shadow-sm border border-gray-200 text-gray-800 font-mono text-sm relative w-full mx-auto overflow-hidden">
                
                {/* Patrón de ticket rasgado (Decorativo) */}
                <div className="absolute top-0 left-0 w-full h-2 bg-[radial-gradient(circle,transparent_4px,#fff_5px)] bg-[length:10px_10px] -mt-1 dark:opacity-10"></div>

                {/* Header del Ticket con Icono y Folio Grande */}
                <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
                  <Coffee size={32} className="mx-auto mb-2 text-gray-800" />
                  <h2 className="text-xl font-black uppercase tracking-widest" style={{ fontFamily: 'serif' }}>𝓛𝔂𝓪</h2>
                  <p className="text-xs font-bold text-gray-600 uppercase mt-1">Pastelería & Cafetería</p>
                  <p className="text-xs text-gray-500 mt-1">Comprobante de Venta</p>
                  <p className="text-lg font-black mt-2 text-black tracking-wider bg-gray-100 rounded-lg inline-block px-4 py-1">
                    {ticketFolio}
                  </p>
                </div>

                {/* Info de Mesa, Cliente y Expedición */}
                <div className="space-y-2 mb-4 text-sm">
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Expedición:</span> 
                    <span className="font-bold text-right text-black">{currentDateTimeStr}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Atendido por:</span> 
                    <span className="font-bold text-right text-black capitalize">{userName}</span>
                  </div>
                  {!isVitrina && isLlevar && nombreCliente !== 'MOSTRADOR' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cliente:</span> 
                      <span className="font-bold text-right text-black uppercase">{nombreCliente}</span>
                    </div>
                  )}
                  {viewMode !== 'Todas' && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cuenta exclusiva:</span> 
                      <span className="font-bold text-right text-black uppercase bg-gray-100 px-2 py-0.5 rounded-md">{viewMode}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">{isVitrina ? 'Tipo:' : 'Servicio:'}</span> 
                    <span className="font-bold text-right text-black uppercase tracking-wide">
                      {isVitrina ? 'Mostrador Express' : (isLlevar ? `Llevar #${numeroReal}` : `Mesa #${numeroReal}`)}
                    </span>
                  </div>
                </div>

                {/* Tabla de Productos */}
                <div className="border-t border-b border-dashed border-gray-300 py-4 mb-4">
                  <div className="text-center mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Detalle de consumo</p>
                  </div>
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
                      
                      {accountsToRender.map(accName => {
                        const accountItems = itemsToPrint.filter(item => (item.cuenta || 'General') === accName);
                        if (accountItems.length === 0) return null;

                        const groupedItems = [];
                        accountItems.forEach(item => {
                          const prepString = JSON.stringify(item.preparaciones || []);
                          const key = `${item.id || item.nombre}-${!!item.isTakeaway}-${prepString}`;
                          
                          const existing = groupedItems.find(g => g.key === key);
                          if (existing) {
                            existing.qty += item.qty;
                          } else {
                            groupedItems.push({ ...item, key, qty: item.qty });
                          }
                        });

                        return (
                          <React.Fragment key={accName}>
                            {uniqueAccounts.length > 1 && viewMode === 'Todas' && (
                              <tr>
                                <td colSpan="3" className="text-[10px] font-bold text-gray-500 uppercase pt-2 pb-1 bg-gray-50 px-2 rounded">
                                  ● Cuenta: {accName}
                                </td>
                              </tr>
                            )}

                            {groupedItems.map((item, idx) => (
                              <React.Fragment key={`${accName}-${idx}`}>
                                <tr>
                                  <td className="font-bold align-top pt-2 text-black">{item.qty}x</td>
                                  <td className="align-top pt-2 pr-1 break-words leading-tight">
                                    {item.isTakeaway && <span className="text-orange-500 mr-1 text-[10px] uppercase tracking-tighter">🛍️</span>}
                                    {item.nombre}
                                    {item.qty > 1 && (
                                      <div className="text-[10px] font-bold text-gray-500 mt-0.5">
                                        Unitario: ${Number(item.precio).toFixed(2)}
                                      </div>
                                    )}
                                  </td>
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
                {uniqueAccounts.length > 1 && viewMode === 'Todas' && (
                  <div className="mb-4 text-xs text-gray-600">
                    <p className="font-bold border-b border-dashed border-gray-300 pb-1 mb-2 text-gray-500 uppercase tracking-wider text-[10px]">Resumen por Cuentas:</p>
                    <div className="space-y-1">
                      {uniqueAccounts.map(accName => {
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
                <div className="flex justify-between items-center text-base mt-2 pt-2 border-t border-gray-300">
                  <span className="font-bold text-gray-800">TOTAL:</span>
                  <span className="font-black text-black text-2xl">${totalToPrint.toFixed(2)}</span>
                </div>

                <div className="text-center mt-6 text-xs text-gray-500 font-bold">
                  <p>¡Muchas gracias por tu preferencia!</p>
                  <p className="mt-1 text-[10px] font-normal text-gray-400">Este documento es un comprobante de caja.</p>
                </div>
              </div>
            </div>

            {/* CONTROLES INFERIORES (Fijos) */}
            <div className="bg-white dark:bg-gray-800 lya:bg-white border-t border-gray-200 dark:border-gray-700 lya:border-orange-100 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-10 shrink-0 p-5">
              
              <div className="flex items-center gap-3 w-full">
                <div className="flex-1 relative flex items-center">
                  <input 
                    type="tel" 
                    placeholder="WhatsApp (10 dígitos)" 
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
                    disabled={isSending}
                    className="w-full bg-gray-50 dark:bg-gray-900 lya:bg-orange-50/50 border border-gray-200 dark:border-gray-700 lya:border-orange-200 rounded-2xl pl-4 pr-14 py-4 text-sm font-bold outline-none focus:border-green-500 dark:focus:border-green-500 text-gray-800 dark:text-white transition-colors disabled:opacity-60"
                  />
                  <button 
                    onClick={handleWhatsAppClick}
                    disabled={phoneNumber.length < 10 || isSending}
                    className="absolute right-2 p-2.5 bg-green-500 text-white rounded-xl disabled:opacity-50 disabled:bg-gray-300 hover:bg-green-600 active:scale-95 transition-all shadow-md shadow-green-500/20 flex items-center justify-center min-w-[42px]"
                    title="Enviar por WhatsApp"
                  >
                    {isSending ? <Loader2 size={18} strokeWidth={3} className="animate-spin" /> : <MessageCircle size={20} strokeWidth={2.5} />}
                  </button>
                </div>

                <button 
                  onClick={handlePhysicalPrint}
                  disabled={isPrinting}
                  className="py-4 px-6 rounded-2xl font-black text-sm uppercase bg-gray-900 dark:bg-white lya:bg-orange-600 text-white dark:text-gray-900 lya:text-white hover:bg-black dark:hover:bg-gray-100 lya:hover:bg-orange-700 shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2 shrink-0 disabled:opacity-70 disabled:active:scale-100 min-w-[64px]"
                  title="Imprimir Ticket Físico"
                >
                  {isPrinting ? <Loader2 size={22} className="animate-spin" /> : <Printer size={22} />}
                </button>
              </div>
              
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};