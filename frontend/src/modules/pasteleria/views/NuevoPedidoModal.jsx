// src/modules/pasteleria/views/NuevoPedidoModal.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Calendar, Truck, Store, Camera, Layers, Hash, Clock, Smartphone, Banknote, Tag } from 'lucide-react';
import client from '../../../api/client';
import { usePasteleriaConfig } from '../controllers/usePasteleriaConfig';

export default function NuevoPedidoModal({ isOpen, onClose, onSave, fechaPredefinida, pedidoAEditar }) {
  const { config } = usePasteleriaConfig();

  const [formData, setFormData] = useState({
    cliente: '', telefono: '', descripcion: '', categoria: '',
    porciones: [], saborPan: [], tipoEntrega: 'sucursal', direccion: '', fechaEntrega: '', costoTotal: '', anticipo: '',
    imagenReferencia: null 
  });

  // Arreglos simples de strings: ['Vainilla', 'Chocolate']
  const [porcionesTags, setPorcionesTags] = useState([]);
  const [saboresTags, setSaboresTags] = useState([]);
  
  const [customPorcion, setCustomPorcion] = useState('');
  const [customSabor, setCustomSabor] = useState('');

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
        // Usamos los arreglos directamente
        setPorcionesTags(Array.isArray(pedidoAEditar.porciones) ? pedidoAEditar.porciones : []);
        setSaboresTags(Array.isArray(pedidoAEditar.saborPan) ? pedidoAEditar.saborPan : []);
      } else {
        let defaultDate = '';
        if (fechaPredefinida) {
          const year = fechaPredefinida.getFullYear();
          const month = String(fechaPredefinida.getMonth() + 1).padStart(2, '0');
          const day = String(fechaPredefinida.getDate()).padStart(2, '0');
          defaultDate = `${year}-${month}-${day}T12:00`; 
        } else {
          const hoy = new Date();
          defaultDate = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}T12:00`;
        }
        
        const catDefecto = config.categorias.find(c => c.isDefault)?.nombre || 'Pastel';

        setFormData({
          cliente: '', telefono: '', descripcion: '', categoria: catDefecto,
          porciones: [], saborPan: [], tipoEntrega: 'sucursal', 
          direccion: '', fechaEntrega: defaultDate, costoTotal: '', anticipo: '',
          imagenReferencia: null 
        });
        setPorcionesTags([]);
        setSaboresTags([]);
      }
      setCustomPorcion('');
      setCustomSabor('');
      setMetodoPagoAnticipo('efectivo');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pedidoAEditar]);

  useEffect(() => {
    if (isOpen && metodoPagoAnticipo === 'transferencia' && !pedidoAEditar) {
      client.get('/settings').then(res => { if (res.data) setTransferInfo(res.data); }).catch(err => console.error("Error banco:", err));
    }
  }, [isOpen, metodoPagoAnticipo, pedidoAEditar]);

  // Función mágica simplificada: Agrega o quita el tag de la lista
  const toggleTag = (stateArray, setState, nombre, isAddOnly = false) => {
    if (stateArray.includes(nombre)) {
      if (!isAddOnly) setState(stateArray.filter(t => t !== nombre)); // Desmarcar
    } else {
      setState([...stateArray, nombre]); // Marcar
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let datosFinales = { ...formData };
    
    // Guardamos los arreglos de tags directamente
    datosFinales.porciones = porcionesTags;
    datosFinales.saborPan = saboresTags;
    
    if (!pedidoAEditar && parseFloat(formData.anticipo) > 0) {
      datosFinales.metodoPagoAnticipo = metodoPagoAnticipo;
    }
    onSave(datosFinales);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const datePart = formData.fechaEntrega ? formData.fechaEntrega.split('T')[0] : '';
  const timePart = formData.fechaEntrega && formData.fechaEntrega.includes('T') ? formData.fechaEntrega.split('T')[1].substring(0, 5) : '';

  const handleDateChange = (e) => setFormData({ ...formData, fechaEntrega: `${e.target.value}T${timePart || '12:00'}` });
  const handleTimeChange = (e) => setFormData({ ...formData, fechaEntrega: `${datePart || new Date().toISOString().split('T')[0]}T${e.target.value}` });

  const costo = parseFloat(formData.costoTotal) || 0;
  const anticipo = !pedidoAEditar ? (parseFloat(formData.anticipo) || 0) : 0; 
  const deuda = Math.max(costo - anticipo, 0);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, imagenReferencia: reader.result });
      reader.readAsDataURL(file);
    }
  };

  // Componente Reutilizable: Botones simples de selección
  const renderSelectorInteractivos = (opcionesBase, seleccionados, setSeleccionados, customInput, setCustomInput, Icono, placeholder) => (
    <div className="space-y-3 p-3 bg-white dark:bg-gray-800/50 lya:bg-lya-bg border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-2xl">
      <div className="flex flex-wrap gap-2">
         {opcionesBase.map(opcion => {
            const isSelected = seleccionados.includes(opcion);
            return (
              <button
                key={opcion}
                type="button"
                onClick={() => toggleTag(seleccionados, setSeleccionados, opcion)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border outline-none active:scale-95 ${
                  isSelected 
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-300 lya:bg-lya-primary/10 lya:border-lya-primary lya:text-lya-primary shadow-sm' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 hover:border-emerald-300 lya:bg-lya-surface lya:border-lya-border/40 lya:text-lya-text hover:shadow-md'
                }`}
              >
                {opcion}
              </button>
            )
         })}
         
         {/* Render de tags personalizados que agregaste a mano */}
         {seleccionados.filter(s => !opcionesBase.includes(s)).map(custom => (
            <button
              key={custom}
              type="button"
              onClick={() => toggleTag(seleccionados, setSeleccionados, custom)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border outline-none active:scale-95 bg-purple-50 border-purple-500 text-purple-800 dark:bg-purple-900/30 dark:border-purple-500 dark:text-purple-300 lya:bg-lya-secondary/10 lya:border-lya-secondary lya:text-lya-secondary shadow-sm"
              title="Haz clic para eliminar"
            >
              {custom} <X size={14} className="opacity-70 hover:opacity-100 transition-opacity"/>
            </button>
         ))}
      </div>

      <div className="flex relative items-center pt-1">
        <Icono className="absolute left-3 text-gray-400" size={16} />
        <input type="text" placeholder={placeholder} value={customInput} onChange={(e) => setCustomInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); if(e.target.value.trim()){ toggleTag(seleccionados, setSeleccionados, e.target.value.trim(), true); setCustomInput(''); } } }} 
          className="w-full bg-gray-50 dark:bg-black/50 border border-gray-200 dark:border-gray-800 lya:bg-lya-surface lya:border-lya-border/50 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50" />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 m-auto w-full max-w-5xl h-fit max-h-[90vh] bg-white dark:bg-gray-900 lya:bg-lya-bg border border-white/20 dark:border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0">
              <h2 className="text-2xl font-bold dark:text-white lya:text-lya-text flex items-center gap-2">
                <span className="bg-gradient-to-r from-emerald-500 to-teal-400 lya:from-lya-primary lya:to-lya-secondary text-transparent bg-clip-text">
                  {pedidoAEditar ? `Editar Pedido: ${pedidoAEditar.id}` : 'Agendar Nuevo Pedido'}
                </span>
              </h2>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white lya:hover:text-lya-primary bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="overflow-y-auto p-6 flex-1 custom-scrollbar">
              <form id="pedidoForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="space-y-6">
                  <h3 className="font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 pb-2">1. Detalles del Cliente y Diseño</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" name="cliente" required placeholder="Nombre del Cliente" value={formData.cliente} onChange={handleChange} className="col-span-2 bg-gray-50 dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl px-4 py-3 text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    <input type="tel" name="telefono" placeholder="Teléfono" value={formData.telefono} onChange={handleChange} className="col-span-2 bg-gray-50 dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl px-4 py-3 text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 lya:text-lya-text/50 uppercase flex items-center gap-1">
                      <Tag size={12} className="text-emerald-500 lya:text-lya-primary" /> Categoría (Solo 1)
                    </label>
                    <div className="flex flex-wrap gap-2 p-1">
                      {config.categorias.map(cat => (
                        <button type="button" key={cat.id} onClick={() => setFormData({...formData, categoria: cat.nombre})}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${formData.categoria === cat.nombre ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20 lya:bg-lya-primary lya:border-lya-primary' : 'bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-600 dark:text-gray-300 lya:text-lya-text border-gray-200 dark:border-gray-700 lya:border-lya-border/40 hover:border-emerald-300'}`}
                        >
                          {cat.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 lya:text-lya-text/50 uppercase flex items-center gap-1">
                      <Hash size={12} className="text-emerald-500 lya:text-lya-primary" /> Tamaños / Porciones (Selecciona varios)
                    </label>
                    {renderSelectorInteractivos(config.tamanos, porcionesTags, setPorcionesTags, customPorcion, setCustomPorcion, Hash, "+ Otro tamaño y presiona Enter")}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 lya:text-lya-text/50 uppercase flex items-center gap-1">
                      <Layers size={12} className="text-emerald-500 lya:text-lya-primary" /> Sabores (Selecciona varios)
                    </label>
                    {renderSelectorInteractivos(config.sabores, saboresTags, setSaboresTags, customSabor, setCustomSabor, Layers, "+ Otro sabor y presiona Enter")}
                  </div>

                  <textarea name="descripcion" required rows="3" placeholder="Instrucciones especiales de decoración, dedicatoria..." value={formData.descripcion} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl px-4 py-3 text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none" />
                  
                  {formData.imagenReferencia ? (
                    <div className="relative w-full h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner group">
                      <img src={formData.imagenReferencia} alt="Referencia" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => setFormData({ ...formData, imagenReferencia: null })} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors shadow-lg"><X size={20} /></button>
                      </div>
                    </div>
                  ) : (
                    <label className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 lya:border-lya-border/50 rounded-xl py-4 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 lya:hover:bg-lya-surface/50 transition-colors cursor-pointer group">
                      <Camera size={24} className="mb-2 group-hover:text-emerald-500 lya:group-hover:text-lya-primary transition-colors" />
                      <span className="text-sm font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 lya:group-hover:text-lya-primary transition-colors">Añadir foto de referencia (Opcional)</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  )}
                </div>

                <div className="space-y-5">
                  <h3 className="font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 pb-2">2. Logística y Finanzas</h3>
                  
                  <div className="flex gap-4">
                    <div className="relative flex-1">
                      <Calendar className="absolute left-4 top-3.5 text-emerald-500 lya:text-lya-primary" size={20} />
                      <input type="date" required value={datePart} onChange={handleDateChange} className="w-full bg-gray-50 dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl pl-12 pr-4 py-3 text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                    <div className="relative flex-1">
                      <Clock className="absolute left-4 top-3.5 text-emerald-500 lya:text-lya-primary" size={20} />
                      <input type="time" required value={timePart} onChange={handleTimeChange} className="w-full bg-gray-50 dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl pl-12 pr-4 py-3 text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50" />
                    </div>
                  </div>

                  <div className="flex bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface p-1 rounded-xl">
                    <button type="button" onClick={() => setFormData({...formData, tipoEntrega: 'sucursal'})} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${formData.tipoEntrega === 'sucursal' ? 'bg-white dark:bg-gray-700 lya:bg-lya-primary/20 text-emerald-600 dark:text-emerald-400 lya:text-lya-primary shadow-sm' : 'text-gray-500 lya:text-lya-text/60'}`}><Store size={18}/> Recoger Aquí</button>
                    <button type="button" onClick={() => setFormData({...formData, tipoEntrega: 'domicilio'})} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${formData.tipoEntrega === 'domicilio' ? 'bg-white dark:bg-gray-700 lya:bg-lya-primary/20 text-emerald-600 dark:text-emerald-400 lya:text-lya-primary shadow-sm' : 'text-gray-500 lya:text-lya-text/60'}`}><Truck size={18}/> Domicilio</button>
                  </div>
                  {formData.tipoEntrega === 'domicilio' && (
                    <motion.input initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} type="text" name="direccion" placeholder="Dirección de envío completa" value={formData.direccion} onChange={handleChange} className="w-full bg-gray-50 dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl px-4 py-3 text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50" />
                  )}

                  <div className="bg-emerald-50 dark:bg-emerald-900/10 lya:bg-lya-primary/5 border border-emerald-100 dark:border-emerald-500/20 lya:border-lya-primary/20 rounded-2xl p-5 space-y-4 mt-6">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <DollarSign className="absolute left-3 top-3.5 text-emerald-600 dark:text-emerald-400 lya:text-lya-primary" size={18} />
                        <input type="number" name="costoTotal" required min="1" placeholder="Costo Total" value={formData.costoTotal} onChange={handleChange} className="w-full bg-white dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-3 text-gray-800 dark:text-white lya:text-lya-text font-bold outline-none focus:ring-2 focus:ring-emerald-500/50" />
                      </div>
                    </div>

                    {!pedidoAEditar && (
                      <div className="flex flex-col space-y-4 pt-2">
                        <div className="relative">
                          <label className="text-[10px] font-black uppercase text-gray-400 lya:text-lya-text/50 mb-2 block ml-1">Registrar Anticipo</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-3.5 text-gray-400" size={18} />
                            <input type="number" name="anticipo" placeholder="0.00" value={formData.anticipo} onChange={handleChange} className="w-full bg-white dark:bg-black/50 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/40 rounded-xl pl-10 pr-4 py-3 text-gray-800 dark:text-white lya:text-lya-text outline-none focus:ring-2 focus:ring-emerald-500/50" />
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {anticipo > 0 && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 overflow-hidden border-t border-emerald-200/50 dark:border-emerald-800/50 lya:border-lya-primary/20 pt-4">
                              <label className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-500 lya:text-lya-primary tracking-widest ml-1">Método del Anticipo</label>
                              
                              <div className="grid grid-cols-2 gap-3">
                                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setMetodoPagoAnticipo('efectivo')}
                                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-colors ${metodoPagoAnticipo === 'efectivo' ? 'border-emerald-500 bg-emerald-500/10 lya:border-lya-primary lya:bg-lya-primary/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-gray-300'}`}>
                                  <Banknote size={24} className={`mb-1.5 ${metodoPagoAnticipo === 'efectivo' ? 'text-emerald-500 lya:text-lya-primary' : 'text-gray-400'}`} />
                                  <span className={`text-[11px] font-bold ${metodoPagoAnticipo === 'efectivo' ? 'text-gray-900 dark:text-white lya:text-lya-text' : 'text-gray-400'}`}>Efectivo</span>
                                </motion.button>
                                
                                <motion.button type="button" whileTap={{ scale: 0.95 }} onClick={() => setMetodoPagoAnticipo('transferencia')}
                                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-colors ${metodoPagoAnticipo === 'transferencia' ? 'border-purple-500 bg-purple-500/10 lya:border-lya-secondary lya:bg-lya-secondary/10 shadow-sm' : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-white dark:bg-gray-800 lya:bg-lya-surface hover:border-gray-300'}`}>
                                  <Smartphone size={24} className={`mb-1.5 ${metodoPagoAnticipo === 'transferencia' ? 'text-purple-500 lya:text-lya-secondary' : 'text-gray-400'}`} />
                                  <span className={`text-[11px] font-bold ${metodoPagoAnticipo === 'transferencia' ? 'text-gray-900 dark:text-white lya:text-lya-text' : 'text-gray-400'}`}>Transferencia</span>
                                </motion.button>
                              </div>

                              <AnimatePresence mode="wait">
                                {metodoPagoAnticipo === 'transferencia' && transferInfo?.bank_accounts && (
                                  <motion.div key="panel-transferencia" initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden mt-4">
                                    <div className="flex gap-2 overflow-x-auto custom-scrollbar pt-2 pb-2">
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
                                    </div>
                                  </motion.div>
                                )}
                                
                                {metodoPagoAnticipo === 'efectivo' && (
                                  <motion.div key="panel-efectivo" initial={{ opacity: 0, height: 0, y: -10 }} animate={{ opacity: 1, height: 'auto', y: 0 }} exit={{ opacity: 0, height: 0, y: -10 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="overflow-hidden mt-4">
                                    <div className="text-center p-3 bg-emerald-50 dark:bg-emerald-900/10 lya:bg-lya-primary/10 rounded-xl border border-emerald-100 dark:border-emerald-800/50 lya:border-lya-primary/20">
                                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 lya:text-lya-primary">El pago se ingresará a caja en mostrador.</span>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    
                    {(!pedidoAEditar && costo > 0) && (
                      <div className="flex justify-between items-center pt-3 mt-2 border-t border-emerald-200/50 dark:border-emerald-800/50 lya:border-lya-primary/20">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400 lya:text-lya-text/70">Resta por Pagar:</span>
                        <span className={`text-2xl font-black ${deuda === 0 ? 'text-emerald-500 lya:text-lya-primary' : 'text-rose-500'}`}>${deuda.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/40 bg-gray-50/50 dark:bg-black/20 lya:bg-lya-surface/50 shrink-0 flex justify-end gap-4">
              <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-bold text-gray-500 lya:text-lya-text/60 hover:bg-gray-200 dark:hover:bg-gray-800 lya:hover:bg-lya-bg transition-colors">Cancelar</button>
              <button type="submit" form="pedidoForm" className="bg-gradient-to-r from-emerald-500 to-teal-500 lya:from-lya-primary lya:to-lya-secondary text-white lya:text-lya-surface font-bold px-8 py-3 rounded-xl shadow-lg shadow-emerald-500/30 lya:shadow-lya-primary/30 hover:scale-[1.02] transition-transform active:scale-95">
                {pedidoAEditar ? 'Guardar Cambios' : 'Confirmar y Agendar'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}