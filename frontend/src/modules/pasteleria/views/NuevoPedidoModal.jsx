import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Calendar, Truck, Store, Camera, Layers, Users, Plus, Clock, Smartphone, Banknote } from 'lucide-react';
import client from '../../../api/client';

export default function NuevoPedidoModal({ isOpen, onClose, onSave, fechaPredefinida, pedidoAEditar }) {
  const [formData, setFormData] = useState({
    cliente: '', telefono: '', descripcion: '',
    porciones: [], saborPan: [], tipoEntrega: 'sucursal', direccion: '', fechaEntrega: '', costoTotal: '', anticipo: '',
    imagenReferencia: null 
  });

  const [porcionInput, setPorcionInput] = useState('');
  const [saborInput, setSaborInput] = useState('');
  
  // Nuevos estados para control de pagos
  const [metodoPagoAnticipo, setMetodoPagoAnticipo] = useState('efectivo');
  const [transferInfo, setTransferInfo] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (pedidoAEditar) {
        let fechaFormateada = pedidoAEditar.fechaEntrega;
        if (fechaFormateada) {
          const d = new Date(fechaFormateada);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            fechaFormateada = `${year}-${month}-${day}T${hours}:${minutes}`;
          }
        }
        setFormData({ ...pedidoAEditar, fechaEntrega: fechaFormateada });
      } else {
        let defaultDate = '';
        if (fechaPredefinida) {
          const year = fechaPredefinida.getFullYear();
          const month = String(fechaPredefinida.getMonth() + 1).padStart(2, '0');
          const day = String(fechaPredefinida.getDate()).padStart(2, '0');
          defaultDate = `${year}-${month}-${day}T12:00`; 
        } else {
          const hoy = new Date();
          const year = hoy.getFullYear();
          const month = String(hoy.getMonth() + 1).padStart(2, '0');
          const day = String(hoy.getDate()).padStart(2, '0');
          defaultDate = `${year}-${month}-${day}T12:00`;
        }
        
        setFormData({
          cliente: '', telefono: '', descripcion: '',
          porciones: [], saborPan: [], tipoEntrega: 'sucursal', 
          direccion: '', fechaEntrega: defaultDate, costoTotal: '', anticipo: '',
          imagenReferencia: null 
        });
      }
      setPorcionInput('');
      setSaborInput('');
      setMetodoPagoAnticipo('efectivo');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pedidoAEditar]);

  useEffect(() => {
    if (isOpen && metodoPagoAnticipo === 'transferencia' && !pedidoAEditar) {
      client.get('/settings')
        .then(res => { if (res.data) setTransferInfo(res.data); })
        .catch(err => console.error("Error al cargar datos bancarios:", err));
    }
  }, [isOpen, metodoPagoAnticipo, pedidoAEditar]);

  const addTag = (field, value, setInput) => {
    if (value.trim() !== '') {
      setFormData({ ...formData, [field]: [...formData[field], value.trim()] });
      setInput('');
    }
  };

  const removeTag = (field, indexToRemove) => {
    setFormData({
      ...formData,
      [field]: formData[field].filter((_, index) => index !== indexToRemove)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let datosFinales = { ...formData };

    if (porcionInput.trim() !== '') datosFinales.porciones = [...datosFinales.porciones, porcionInput.trim()];
    if (saborInput.trim() !== '') datosFinales.saborPan = [...datosFinales.saborPan, saborInput.trim()];
    
    // Inyectar el método de pago si hay un anticipo registrado y es creación
    if (!pedidoAEditar && parseFloat(formData.anticipo) > 0) {
      datosFinales.metodoPagoAnticipo = metodoPagoAnticipo;
    }

    onSave(datosFinales);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const datePart = formData.fechaEntrega ? formData.fechaEntrega.split('T')[0] : '';
  const timePart = formData.fechaEntrega && formData.fechaEntrega.includes('T') 
    ? formData.fechaEntrega.split('T')[1].substring(0, 5) 
    : '';

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setFormData({ ...formData, fechaEntrega: `${newDate}T${timePart || '12:00'}` });
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    setFormData({ ...formData, fechaEntrega: `${datePart || new Date().toISOString().split('T')[0]}T${newTime}` });
  };

  const costo = parseFloat(formData.costoTotal) || 0;
  const anticipo = !pedidoAEditar ? (parseFloat(formData.anticipo) || 0) : 0; 
  const deuda = Math.max(costo - anticipo, 0);

  const handleKeyDown = (e, field, value, setInput) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(field, value, setInput);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imagenReferencia: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-4xl h-fit max-h-[90vh] bg-white dark:bg-gray-900 border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-400 text-transparent bg-clip-text">
                  {pedidoAEditar ? `Editar Pedido: ${pedidoAEditar.id}` : 'Agendar Nuevo Pastel'}
                </span>
              </h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white bg-gray-100 dark:bg-gray-800 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
              <form id="pedidoForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="space-y-5">
                  <h3 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 pb-2">1. Detalles del Cliente y Diseño</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="cliente" required placeholder="Nombre del Cliente" value={formData.cliente} onChange={handleChange} className="col-span-2 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    <input type="tel" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleChange} className="col-span-2 bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>

                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <Users className="absolute left-3 text-emerald-500" size={18} />
                      <input type="text" placeholder="Tamaño/Porciones (Ej. 20 pax... y presiona Enter)" value={porcionInput} onChange={(e) => setPorcionInput(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'porciones', porcionInput, setPorcionInput)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-12 py-3 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      <button type="button" onClick={() => addTag('porciones', porcionInput, setPorcionInput)} className="absolute right-2 p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors"><Plus size={16} /></button>
                    </div>
                    {formData.porciones?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {formData.porciones.map((tag, i) => <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} key={i} className="flex items-center gap-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-200 dark:border-amber-800/50">{tag} <X size={14} className="cursor-pointer hover:text-amber-900 dark:hover:text-amber-200" onClick={() => removeTag('porciones', i)} /></motion.span>)}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="relative flex items-center">
                      <Layers className="absolute left-3 text-emerald-500" size={18} />
                      <input type="text" placeholder="Sabores (Ej. Fresa... y presiona Enter)" value={saborInput} onChange={(e) => setSaborInput(e.target.value)} onKeyDown={(e) => handleKeyDown(e, 'saborPan', saborInput, setSaborInput)} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-12 py-3 text-sm text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      <button type="button" onClick={() => addTag('saborPan', saborInput, setSaborInput)} className="absolute right-2 p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors"><Plus size={16} /></button>
                    </div>
                    {formData.saborPan?.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {formData.saborPan.map((tag, i) => <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} key={i} className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800/50">{tag} <X size={14} className="cursor-pointer hover:text-purple-900 dark:hover:text-purple-200" onClick={() => removeTag('saborPan', i)} /></motion.span>)}
                      </div>
                    )}
                  </div>

                  <textarea name="descripcion" required rows="3" placeholder="Instrucciones especiales de decoración, dedicatoria..." value={formData.descripcion} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
                  
                  {formData.imagenReferencia ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner group">
                      <img src={formData.imagenReferencia} alt="Referencia" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => setFormData({ ...formData, imagenReferencia: null })} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"><X size={20} /></button>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl py-4 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer group">
                      <Camera size={24} className="mb-2 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-sm font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Añadir foto de referencia (Opcional)</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>

                <div className="space-y-5">
                  <h3 className="font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 pb-2">2. Logística y Finanzas</h3>
                  
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-4 top-3.5 text-emerald-500" size={20} />
                      <input type="date" required value={datePart} onChange={handleDateChange} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl pl-12 pr-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div className="relative flex-1">
                      <Clock className="absolute left-4 top-3.5 text-emerald-500" size={20} />
                      <input type="time" required value={timePart} onChange={handleTimeChange} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl pl-12 pr-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                    <button type="button" onClick={() => setFormData({...formData, tipoEntrega: 'sucursal'})} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${formData.tipoEntrega === 'sucursal' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}><Store size={18}/> Recoger Aquí</button>
                    <button type="button" onClick={() => setFormData({...formData, tipoEntrega: 'domicilio'})} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${formData.tipoEntrega === 'domicilio' ? 'bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-gray-500'}`}><Truck size={18}/> Domicilio</button>
                  </div>
                  {formData.tipoEntrega === 'domicilio' && (
                    <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} type="text" name="direccion" placeholder="Dirección de envío completa" value={formData.direccion} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  )}

                  <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl p-5 space-y-4 mt-6">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <DollarSign className="absolute left-3 top-3.5 text-emerald-600 dark:text-emerald-400" size={18} />
                        <input type="number" name="costoTotal" required min="1" placeholder="Costo Total" value={formData.costoTotal} onChange={handleChange} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-gray-800 dark:text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      </div>
                    </div>

                    {!pedidoAEditar && (
                      <div className="flex flex-col space-y-4 pt-2">
                        <div className="relative">
                          <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Registrar Anticipo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input type="number" name="anticipo" placeholder="0.00" value={formData.anticipo} onChange={handleChange} className="w-full bg-white dark:bg-black/50 border border-gray-200 dark:border-gray-800 rounded-xl pl-10 pr-4 py-3 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50" />
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {anticipo > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden border-t border-emerald-200/50 dark:border-emerald-800/50 pt-4">
                              <label className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-500 tracking-widest ml-1">Método del Anticipo</label>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setMetodoPagoAnticipo('efectivo')}
                                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${metodoPagoAnticipo === 'efectivo' ? 'border-emerald-500 bg-emerald-500/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-gray-300'}`}>
                                  <Banknote size={24} className={`mb-1.5 ${metodoPagoAnticipo === 'efectivo' ? 'text-emerald-500' : 'text-gray-400'}`} />
                                  <span className={`text-[11px] font-bold ${metodoPagoAnticipo === 'efectivo' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Efectivo</span>
                                </button>
                                
                                <button type="button" onClick={() => setMetodoPagoAnticipo('transferencia')}
                                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${metodoPagoAnticipo === 'transferencia' ? 'border-purple-500 bg-purple-500/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-gray-300'}`}>
                                  <Smartphone size={24} className={`mb-1.5 ${metodoPagoAnticipo === 'transferencia' ? 'text-purple-500' : 'text-gray-400'}`} />
                                  <span className={`text-[11px] font-bold ${metodoPagoAnticipo === 'transferencia' ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>Transferencia</span>
                                </button>
                              </div>

                              {metodoPagoAnticipo === 'transferencia' && transferInfo?.bank_accounts && (
                                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                                  {transferInfo.bank_accounts.map(acc => (
                                    <div key={acc.id} className="min-w-[85%] sm:min-w-[240px] p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800/50 rounded-2xl shrink-0">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-black text-[10px] text-purple-800 dark:text-purple-300 uppercase">{acc.bank_name}</span>
                                        <Smartphone className="text-purple-400" size={14} />
                                      </div>
                                      <div className="space-y-1">
                                        {acc.account_holder && <p className="text-[9px] text-purple-900 dark:text-white truncate">Titular: <span className="font-bold">{acc.account_holder}</span></p>}
                                        {acc.account_number && <p className="text-[9px] text-purple-900 dark:text-white">Cta: <span className="font-mono font-bold tracking-wider">{acc.account_number}</span></p>}
                                      </div>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {(!pedidoAEditar && costo > 0) && (
                      <div className="flex justify-between items-center pt-3 mt-2 border-t border-emerald-200/50 dark:border-emerald-800/50">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Resta por Pagar:</span>
                        <span className={`text-2xl font-black ${deuda === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>${deuda.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 shrink-0 flex justify-end gap-4">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
              <button type="submit" form="pedidoForm" className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/30 hover:scale-[1.02] transition-transform active:scale-95">
                {pedidoAEditar ? 'Guardar Cambios' : 'Confirmar y Agendar'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}