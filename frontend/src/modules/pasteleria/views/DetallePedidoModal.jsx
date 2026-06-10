// src/modules/pasteleria/views/DetallePedidoModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, User, Phone, MapPin, Edit3, Layers, DollarSign, CameraOff, ShoppingBasket, Camera, Smartphone, Landmark, MessageCircle, Image as ImageIcon } from 'lucide-react';
import client from '../../../api/client'; 

export default function DetallePedidoModal({ isOpen, onClose, pedido, onEdit, calcularFinanzas }) {
  const [transferInfo, setTransferInfo] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0); // 🔥 Pestaña activa de la galería

  useEffect(() => {
    if (isOpen) {
      client.get('/settings')
        .then(res => { if (res.data) setTransferInfo(res.data); })
        .catch(err => console.error("Error al cargar datos bancarios:", err));
      setActivePhotoIdx(0); // Resetear al abrir un nuevo pedido
    }
  }, [isOpen, pedido?.id]);

  if (!pedido) return null;

  const isImageLoading = pedido.imagenesReferencia === undefined;
  const tieneImagenes = pedido.imagenesReferencia && Array.isArray(pedido.imagenesReferencia) && pedido.imagenesReferencia.length > 0;

  const finanzas = calcularFinanzas(pedido);
  const fecha = new Date(pedido.fechaEntrega).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const hora = new Date(pedido.fechaEntrega).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/70 backdrop-blur-md z-[70]" />
          
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-screen w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl z-[80] overflow-hidden flex flex-col rounded-l-[2rem] border-l border-white/10"
          >
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-2 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                  <ShoppingBasket size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black dark:text-white uppercase tracking-tighter">{pedido.id}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pedido.estado === 'entregado' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                    PEDIDO {pedido.estado.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                {(pedido.estado !== 'entregado' && pedido.estado !== 'cancelado') && (
                  <button onClick={() => { onEdit(pedido); onClose(); }} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg shadow-orange-500/20">
                    <Edit3 size={18} /> Editar
                  </button>
                )}
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-white dark:bg-gray-800 rounded-full shadow-sm transition-colors"><X size={24} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
              
              {/* 🔥 NUEVO COMPONENTE BENTO DE GALERÍA MULTI-FOTO */}
              <div className="space-y-3">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <Camera size={14} /> Imágenes de Referencia
                </label>
                
                {isImageLoading ? (
                  <div className="w-full h-80 rounded-[2rem] bg-gray-100/50 dark:bg-gray-800/30 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <ImageIcon size={48} className="mb-3 text-emerald-500/50 lya:text-lya-primary/50 animate-bounce" />
                    <p className="text-sm font-bold text-gray-400 lya:text-lya-text/50 animate-pulse">Obteniendo galería en alta calidad...</p>
                  </div>
                ) : tieneImagenes ? (
                  <div className="space-y-3">
                    <div className="w-full h-80 rounded-[2rem] overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl bg-gray-50 dark:bg-gray-950">
                      <AnimatePresence mode="wait">
                        <motion.img 
                          key={activePhotoIdx}
                          initial={{ opacity: 0, scale: 0.98 }} 
                          animate={{ opacity: 1, scale: 1 }} 
                          exit={{ opacity: 0, scale: 1.02 }}
                          transition={{ duration: 0.2 }}
                          src={pedido.imagenesReferencia[activePhotoIdx]} 
                          alt={`Referencia ${activePhotoIdx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                      </AnimatePresence>
                    </div>
                    
                    {/* Selectores de pestañas estilo Neo-Bento para las imágenes */}
                    {pedido.imagenesReferencia.length > 1 && (
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
                        {pedido.imagenesReferencia.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActivePhotoIdx(idx)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${activePhotoIdx === idx ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                          >
                            Foto {idx + 1}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-40 rounded-[2rem] bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <CameraOff size={48} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">Sin imágenes de referencia</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Cliente</label>
                  <div className="flex items-center gap-3 text-gray-800 dark:text-gray-100 font-bold">
                    <User size={18} className="text-emerald-500" /> {pedido.cliente}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase">Teléfono</label>
                  <div className="flex items-center gap-3 text-gray-800 dark:text-gray-100 font-bold">
                    <Phone size={18} className="text-emerald-500" /> {pedido.telefono || 'No registrado'}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-[2rem] space-y-4 border border-gray-100 dark:border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="text-emerald-500" size={20} />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Fecha de Entrega</p>
                      <p className="font-bold dark:text-white capitalize">{fecha}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="text-emerald-500" size={20} />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Hora Programada</p>
                      <p className="font-bold dark:text-white">{hora}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-start gap-3">
                    <MapPin className="text-emerald-500 mt-1" size={20} />
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase">Tipo de Entrega</p>
                      <p className="font-bold dark:text-white uppercase text-sm">{pedido.tipoEntrega}</p>
                      {pedido.tipoEntrega === 'domicilio' && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{pedido.direccion}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase flex items-center gap-2">
                  <Layers size={18} className="text-emerald-500" /> Especificaciones Técnicas
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Categoría</p>
                    <span className="inline-block bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/50">
                      {pedido.categoria || 'Pastel'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Porciones / Tamaño</p>
                    <div className="flex flex-wrap gap-2">
                      {pedido.porciones?.map((p, i) => <span key={i} className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-1 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-800/50">{p}</span>)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Sabores Elegidos</p>
                    <div className="flex flex-wrap gap-2">
                      {pedido.saborPan?.map((s, i) => <span key={i} className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-3 py-1 rounded-xl text-xs font-bold border border-purple-200 dark:border-purple-800/50">{s}</span>)}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Descripción y Notas</p>
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-3xl border border-emerald-100 dark:border-emerald-500/20 text-gray-700 dark:text-gray-300 italic text-sm">
                      "{pedido.descripcion}"
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase flex items-center gap-2">
                  <DollarSign size={18} className="text-emerald-500" /> Estado de Cuenta
                </h3>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-[2rem] overflow-hidden">
                  <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-500">Costo Total</span>
                    <span className="text-lg font-black dark:text-white">${parseFloat(pedido.costoTotal).toFixed(2)}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-black/10">
                    <span className="text-sm font-medium text-gray-500">Pagado a la fecha</span>
                    <span className="text-lg font-bold text-emerald-600">${finanzas.totalPagado.toFixed(2)}</span>
                  </div>
                  <div className="p-4 flex justify-between items-center bg-rose-50 dark:bg-rose-900/10">
                    <span className="text-sm font-bold text-rose-600 uppercase tracking-tighter">Deuda Pendiente</span>
                    <span className="text-2xl font-black text-rose-600">${finanzas.deuda.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {finanzas.deuda > 0 && transferInfo?.bank_accounts && transferInfo.bank_accounts.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase flex items-center gap-2">
                    <Landmark size={18} className="text-purple-500" /> Cuentas para Transferencia
                  </h3>
                  
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

                  <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-3 px-1">
                    {transferInfo.bank_accounts.map(acc => (
                      <div key={acc.id} className="min-w-[85%] sm:min-w-[280px] p-5 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-3xl shrink-0 shadow-sm">
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
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}