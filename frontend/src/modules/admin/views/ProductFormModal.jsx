import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, RotateCw, Package, Folder, Settings2, CheckCircle2, Star, Store, ChefHat, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

const createImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (error) => reject(error));
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url;
});

function getRadianAngle(degreeValue) { 
  return (degreeValue * Math.PI) / 180; 
}

async function getCroppedImg(imageSrc, pixelCrop, rotation = 0) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const maxSize = Math.max(image.width, image.height);
  const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
  canvas.width = safeArea; canvas.height = safeArea;
  ctx.translate(safeArea / 2, safeArea / 2);
  ctx.rotate(getRadianAngle(rotation));
  ctx.translate(-safeArea / 2, -safeArea / 2);
  ctx.drawImage(image, safeArea / 2 - image.width / 2, safeArea / 2 - image.height / 2);
  const data = ctx.getImageData(0, 0, safeArea, safeArea);
  canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
  ctx.putImageData(data, Math.round(0 - safeArea / 2 + image.width / 2 - pixelCrop.x), Math.round(0 - safeArea / 2 + image.height / 2 - pixelCrop.y));
  return canvas.toDataURL('image/jpeg', 0.9);
}

export const ProductFormModal = ({ initialData, onClose, onSave, categories = [], globalOptions = [] }) => {
  
  const normalizeOptions = (ops) => {
    let parsedOps = ops;
    if (typeof parsedOps === 'string') {
        try { parsedOps = JSON.parse(parsedOps); } catch (e) { parsedOps = {}; }
    }
    if (typeof parsedOps === 'string') {
        try { parsedOps = JSON.parse(parsedOps); } catch (e) { parsedOps = {}; }
    }
    
    if (!parsedOps) parsedOps = {};
    
    const result = { 
      tamanos: [], leches: [], extras: [], 
      defaults: parsedOps.defaults || { tamano: '', leche: '' } 
    };

    ['tamanos', 'leches', 'extras'].forEach(tipo => {
      if (parsedOps[tipo] && Array.isArray(parsedOps[tipo])) {
        result[tipo] = parsedOps[tipo].map(item => {
           if (typeof item === 'string') return { nombre: item, precioAdicional: '' };
           return { ...item, precioAdicional: item.precioAdicional === 0 ? '' : item.precioAdicional };
        });
      }
    });
    return result;
  };

  const [formData, setFormData] = useState({
    id: initialData?.id || undefined,
    name: initialData?.name || initialData?.nombre || '',
    basePrice: initialData ? (initialData.basePrice ?? initialData.precioBase ?? '') : '',
    categoryId: initialData?.categoryId || (categories.length > 0 ? categories[0].id : ''),
    controlarStock: initialData?.controlarStock || false,
    stockQuantity: initialData ? (initialData.stockQuantity ?? initialData.stock ?? '') : '',
    imageUrl: initialData?.imageUrl || initialData?.image || null,
    isActive: initialData?.isActive !== undefined ? initialData.isActive : (initialData?.disponible !== undefined ? initialData.disponible : true),
    departamento: initialData?.departamento || 'cafeteria',
    requiereCocina: initialData?.requiereCocina !== undefined ? initialData.requiereCocina : true,
    opciones: normalizeOptions(initialData?.opciones)
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  // 🔥 ESTADOS DE CARGA PARA PREVENIR DOBLE CLIC
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  // 🔥 ESTADO DE NOTIFICACIÓN INTERNA
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const toggleOption = (tipo, globalOpt) => {
    const current = formData.opciones[tipo];
    const exists = current.some(opt => opt.nombre === globalOpt.nombre);
    
    let newArray;
    if (exists) {
      newArray = current.filter(opt => opt.nombre !== globalOpt.nombre);
    } else {
      newArray = [...current, { 
        nombre: globalOpt.nombre, 
        precioAdicional: globalOpt.precioAdicional === 0 ? '' : globalOpt.precioAdicional 
      }];
    }

    let newDefaults = { ...formData.opciones.defaults };
    if (exists && tipo === 'tamanos' && newDefaults.tamano === globalOpt.nombre) newDefaults.tamano = '';
    if (exists && tipo === 'leches' && newDefaults.leche === globalOpt.nombre) newDefaults.leche = '';

    setFormData(prev => ({
      ...prev,
      opciones: { ...prev.opciones, [tipo]: newArray, defaults: newDefaults }
    }));
  };

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result), false);
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = async () => {
    setIsCropping(true);
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      setFormData({ ...formData, imageUrl: croppedImage });
      setImageSrc(null);
    } catch (e) {
      console.error('Error al recortar la imagen', e);
      showToast('Error al procesar la imagen', 'error');
    } finally {
      setIsCropping(false);
    }
  };

  const handleSaveSubmit = async () => {
    // 🔥 VALIDACIONES DE SEGURIDAD (Evita guardar productos rotos)
    if (!formData.name.trim()) return showToast('El nombre del producto es obligatorio', 'warning');
    if (!formData.categoryId) return showToast('Debes seleccionar una categoría', 'warning');
    if (formData.basePrice === '' || isNaN(formData.basePrice)) return showToast('Ingresa un precio base válido', 'warning');

    setIsSubmitting(true);
    
    const cleanOpts = (arr) => arr.map(opt => ({
      ...opt, 
      precioAdicional: opt.precioAdicional === '' ? 0 : parseFloat(opt.precioAdicional)
    }));

    const finalData = {
      ...formData,
      basePrice: parseFloat(formData.basePrice),
      stockQuantity: formData.stockQuantity === '' ? 0 : parseInt(formData.stockQuantity),
      opciones: {
        tamanos: cleanOpts(formData.opciones.tamanos),
        leches: cleanOpts(formData.opciones.leches),
        extras: cleanOpts(formData.opciones.extras),
        defaults: formData.opciones.defaults
      }
    };
    
    try {
      await onSave(finalData);
      // El closeModal() se dispara desde el controlador externo al haber éxito
    } catch (error) {
      setIsSubmitting(false); // Liberar spinner si falla el backend
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
      {/* Fondo difuminado interactivo */}
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        onClick={() => !isSubmitting && !imageSrc && onClose()} 
        className="absolute inset-0 bg-black/60 lya:bg-black/50 backdrop-blur-sm"
      />

      {/* 🔥 CÁPSULA DE NOTIFICACIONES NEO-BENTO */}
      <AnimatePresence>
        {toast && (
          <div className="absolute top-6 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-5 py-3 rounded-full shadow-2xl flex items-center gap-3 font-bold border pointer-events-auto transition-colors ${
                toast.type === 'success' ? 'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30' :
                toast.type === 'warning' ? 'border-amber-100 dark:border-amber-900/30 lya:border-amber-500/30' :
                'border-red-100 dark:border-red-900/30 lya:border-red-500/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                toast.type === 'success' ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 lya:text-lya-primary' :
                toast.type === 'warning' ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-500 lya:text-amber-400' :
                'bg-red-100 dark:bg-red-500/20 text-red-500 lya:text-red-400'
              }`}>
                {toast.type === 'success' ? <CheckCircle2 size={18} /> : toast.type === 'warning' ? <AlertTriangle size={18} /> : <AlertCircle size={18} />}
              </div>
              <span className="text-xs sm:text-sm">{toast.message}</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-4xl rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh] sm:max-h-[90vh] transition-colors"
      >
        {imageSrc ? (
          // ==========================================
          // INTERFAZ DE RECORTE DE IMAGEN
          // ==========================================
          <div className="relative h-[60vh] sm:h-[500px] w-full bg-gray-950 lya:bg-black/90">
            <Cropper
              image={imageSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={1}
              onCropChange={setCrop} onRotationChange={setRotation} onZoomChange={setZoom}
              onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap justify-center items-center gap-3 sm:gap-4 bg-black/60 p-3 sm:p-4 rounded-2xl backdrop-blur-md z-10 w-[90%] sm:w-auto">
              <button onClick={() => setRotation(rotation + 90)} disabled={isCropping} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"><RotateCw size={20}/></button>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} disabled={isCropping} className="w-24 sm:w-32 accent-orange-500 lya:accent-lya-primary" />
              <button 
                onClick={handleApplyCrop} 
                disabled={isCropping}
                className="bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 transition-all text-white lya:text-lya-surface px-4 sm:px-6 py-2 rounded-xl font-bold active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:active:scale-100"
              >
                {isCropping ? <><Loader2 size={18} className="animate-spin" /> Procesando...</> : 'Aplicar Recorte'}
              </button>
            </div>
          </div>
        ) : (
          // ==========================================
          // INTERFAZ DEL FORMULARIO
          // ==========================================
          <div className="flex flex-col h-full overflow-hidden">
            <header className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0 transition-colors">
              <h2 className="text-xl sm:text-2xl font-black dark:text-white lya:text-lya-text tracking-tight">{initialData ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={onClose} disabled={isSubmitting} className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:bg-lya-border/40 rounded-full transition-colors disabled:opacity-50 active:scale-90">
                <X size={20} className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-8 space-y-6 sm:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                
                {/* COLUMNA 1: FOTO */}
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-[2rem] p-6 hover:border-orange-500 lya:hover:border-lya-primary transition-colors bg-gray-50/50 dark:bg-gray-800/30 lya:bg-lya-bg/50 h-full">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-[1.5rem] mb-4 shadow-md" alt="Product" />
                    ) : (
                      <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white dark:bg-gray-800 lya:bg-lya-bg rounded-[1.5rem] mb-4 flex items-center justify-center shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30">
                        <Upload size={40} className="text-gray-300 dark:text-gray-600 lya:text-lya-text/30" />
                      </div>
                    )}
                    <label className={`bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-5 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-orange-500/20 lya:shadow-lya-primary/20 w-full text-center transition-all active:scale-95 ${isSubmitting ? 'opacity-50 cursor-not-allowed active:scale-100' : 'cursor-pointer'}`}>
                      Subir Foto
                      <input type="file" className="hidden" disabled={isSubmitting} onChange={onFileChange} accept="image/*" />
                    </label>
                  </div>
                </div>

                {/* COLUMNA 2: DATOS BÁSICOS */}
                <div className="md:col-span-2 space-y-5">
                  <div>
                    <label className="text-[10px] sm:text-xs font-black text-gray-400 lya:text-lya-text/50 uppercase tracking-widest ml-1 mb-1 block">Nombre del Producto *</label>
                    <input 
                      type="text" value={formData.name}
                      disabled={isSubmitting}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 focus:border-orange-500 lya:focus:border-lya-primary rounded-2xl outline-none dark:text-white lya:text-lya-text transition-all font-bold disabled:opacity-60 text-sm sm:text-base"
                      placeholder="Ej: Frappé de Moka"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] sm:text-xs font-black text-gray-400 lya:text-lya-text/50 uppercase tracking-widest ml-1 mb-1 block">Categoría *</label>
                      <div className="relative">
                        <Folder className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={18} />
                        {/* 🔥 FIX: pl-11 asegura que el texto no tape al ícono */}
                        <select
                          value={formData.categoryId}
                          disabled={isSubmitting}
                          onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                          className="w-full p-3 sm:p-4 pr-4 pl-11 sm:pl-12 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 focus:border-orange-500 lya:focus:border-lya-primary rounded-2xl outline-none dark:text-white lya:text-lya-text appearance-none transition-all font-bold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                          <option value="" disabled>Selecciona una categoría...</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-[10px] sm:text-xs font-black text-gray-400 lya:text-lya-text/50 uppercase tracking-widest ml-1 mb-1 block" title="A qué caja se irá este dinero en los reportes">Caja de Ingreso</label>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={18} />
                        {/* 🔥 FIX: pl-11 asegura que el texto no tape al ícono */}
                        <select
                          value={formData.departamento}
                          disabled={isSubmitting}
                          onChange={(e) => setFormData({...formData, departamento: e.target.value})}
                          className="w-full p-3 sm:p-4 pr-4 pl-11 sm:pl-12 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 focus:border-orange-500 lya:focus:border-lya-primary rounded-2xl outline-none dark:text-white lya:text-lya-text appearance-none transition-all font-bold disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                          <option value="cafeteria">Caja Cafetería</option>
                          <option value="pasteleria">Caja Pastelería</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] sm:text-xs font-black text-gray-400 lya:text-lya-text/50 uppercase tracking-widest ml-1 mb-1 block">Precio Base *</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/50 font-black text-lg">$</span>
                        {/* 🔥 FIX: pl-10 asegura que los números no pisen el signo de dólar */}
                        <input 
                          type="number" value={formData.basePrice}
                          disabled={isSubmitting}
                          onChange={(e) => setFormData({...formData, basePrice: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                          placeholder="0.00"
                          className="w-full p-3 sm:p-4 pr-4 pl-10 sm:pl-11 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 focus:border-orange-500 lya:focus:border-lya-primary rounded-2xl outline-none dark:text-white lya:text-lya-text transition-all font-bold text-sm sm:text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-60"
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 rounded-2xl p-3 flex flex-col justify-center transition-colors">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <label className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-widest">Stock Fijo</label>
                        <button type="button" disabled={isSubmitting} onClick={() => setFormData({...formData, controlarStock: !formData.controlarStock})} className={`w-11 h-6 rounded-full flex items-center transition-colors px-1 ${formData.controlarStock ? 'bg-orange-500 lya:bg-lya-secondary' : 'bg-gray-300 dark:bg-gray-600 lya:bg-lya-border/50'} ${isSubmitting ? 'opacity-50' : ''}`}>
                          <div className={`w-4 h-4 bg-white lya:bg-lya-surface rounded-full shadow-md transform transition-transform ${formData.controlarStock ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      {formData.controlarStock && (
                        <div className="relative animate-in fade-in zoom-in duration-200">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 lya:text-lya-text/40" size={16} />
                          {/* 🔥 FIX: pl-9 asegura que los números no pisen el ícono del paquete */}
                          <input 
                            type="number" value={formData.stockQuantity}
                            disabled={isSubmitting}
                            onChange={(e) => setFormData({...formData, stockQuantity: e.target.value === '' ? '' : parseInt(e.target.value)})}
                            placeholder="Ej: 15"
                            className="w-full py-2.5 pr-3 pl-9 bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 focus:border-orange-500 lya:focus:border-lya-secondary rounded-xl outline-none dark:text-white lya:text-lya-text text-sm transition-all font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-60"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 rounded-2xl p-3 flex flex-col justify-center transition-colors">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <label className="text-[10px] sm:text-xs font-black text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-widest flex items-center gap-1.5">
                          <ChefHat size={14} className={formData.requiereCocina ? "text-orange-500 lya:text-lya-secondary" : "text-gray-400"} />
                          Enviar a Cocina
                        </label>
                        <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 mt-1 leading-tight font-medium max-w-[280px]">
                          {formData.requiereCocina 
                            ? "El ticket aparecerá en la pantalla de los cocineros." 
                            : "Venta de vitrina. Se cobra y se entrega al instante."}
                        </p>
                      </div>
                      <button 
                        type="button" 
                        disabled={isSubmitting}
                        onClick={() => setFormData({...formData, requiereCocina: !formData.requiereCocina})} 
                        className={`w-11 h-6 rounded-full flex items-center transition-colors px-1 shrink-0 ${formData.requiereCocina ? 'bg-orange-500 lya:bg-lya-secondary' : 'bg-gray-300 dark:bg-gray-600 lya:bg-lya-border/50'} ${isSubmitting ? 'opacity-50' : ''}`}
                      >
                        <div className={`w-4 h-4 bg-white lya:bg-lya-surface rounded-full shadow-md transform transition-transform ${formData.requiereCocina ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* SECCIÓN DE OPCIONES Y EXTRAS */}
              <div className="border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30 pt-6 sm:pt-8">
                <h3 className="font-black text-lg sm:text-xl text-gray-800 dark:text-white lya:text-lya-text mb-1 flex items-center gap-2 tracking-tight">
                  <Settings2 size={22} className="text-blue-500 lya:text-lya-secondary" />
                  Variantes y Extras
                </h3>
                <p className="text-gray-500 lya:text-lya-text/60 text-xs sm:text-sm mb-5 sm:mb-6 font-medium">Asigna qué opciones del catálogo global estarán disponibles para este producto.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                  {['tamanos', 'leches', 'extras'].map((tipo) => {
                    const optsDisponibles = globalOptions.filter(o => o.tipo === tipo);
                    const optsSeleccionadas = formData.opciones[tipo] || [];
                    
                    return (
                      <div key={tipo} className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50 p-4 sm:p-5 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors">
                        <h4 className="font-black text-sm text-gray-700 dark:text-gray-200 lya:text-lya-text uppercase tracking-widest mb-4">{tipo}</h4>
                        
                        {optsDisponibles.length === 0 ? (
                           <p className="text-xs font-medium text-gray-400 lya:text-lya-text/50 italic bg-white dark:bg-gray-900 lya:bg-lya-surface p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40">No hay opciones registradas.</p>
                        ) : (
                           <div className="flex flex-col gap-2.5 mb-4">
                             {optsDisponibles.map((opt) => {
                               const selectedOpt = optsSeleccionadas.find(s => s.nombre === opt.nombre);
                               const isSelected = !!selectedOpt;

                               const handlePriceChange = (e) => {
                                 const val = e.target.value;
                                 const newPrice = val === '' ? '' : parseFloat(val);
                                 
                                 setFormData(prev => ({
                                   ...prev,
                                   opciones: {
                                     ...prev.opciones,
                                     [tipo]: prev.opciones[tipo].map(item => 
                                       item.nombre === opt.nombre ? { ...item, precioAdicional: newPrice } : item
                                     )
                                   }
                                 }));
                               };

                               return (
                                 <div
                                   key={opt.id}
                                   className={clsx(
                                     "flex flex-col p-3 rounded-[1rem] border transition-all overflow-hidden",
                                     isSelected 
                                       ? "border-orange-500 bg-orange-50 dark:bg-orange-500/10 lya:border-lya-primary lya:bg-lya-primary/10 shadow-sm" 
                                       : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 lya:border-lya-border/40 lya:bg-lya-surface hover:border-orange-300 lya:hover:border-lya-primary/50"
                                   )}
                                 >
                                   <button
                                     type="button"
                                     disabled={isSubmitting}
                                     onClick={() => toggleOption(tipo, opt)}
                                     className="flex items-start gap-2.5 text-xs sm:text-sm font-bold w-full text-left outline-none disabled:opacity-70 active:scale-[0.98] transition-transform"
                                   >
                                     <div className="mt-0.5 shrink-0">
                                       {isSelected ? (
                                         <CheckCircle2 size={16} className="text-orange-500 lya:text-lya-primary" />
                                       ) : (
                                         <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 lya:border-lya-border/50" />
                                       )}
                                     </div>
                                     <span className={clsx("flex-1 whitespace-normal break-words leading-tight", isSelected ? "text-orange-700 dark:text-orange-400 lya:text-lya-primary" : "text-gray-600 dark:text-gray-400 lya:text-lya-text/80")}>
                                       {opt.nombre}
                                     </span>
                                   </button>

                                   {isSelected ? (
                                     <div className="mt-3 pt-3 border-t border-orange-200/50 dark:border-orange-500/20 lya:border-lya-primary/30 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                                       <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 lya:text-lya-primary opacity-80">Precio extra:</span>
                                       <div className="flex items-center gap-1 relative">
                                         {/* 🔥 FIX: El ícono está afuera del input, así que no hay problema de solapamiento */}
                                         <span className="text-xs font-black text-orange-600 dark:text-orange-400 lya:text-lya-primary opacity-70">+$</span>
                                         <input 
                                           type="number" min="0" step="1" placeholder="0.00"
                                           disabled={isSubmitting}
                                           value={selectedOpt.precioAdicional}
                                           onChange={handlePriceChange}
                                           className="w-20 p-1.5 text-xs sm:text-sm bg-white dark:bg-gray-900 lya:bg-lya-surface border border-orange-200 dark:border-orange-500/30 lya:border-lya-primary/30 rounded-lg outline-none text-right font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text focus:border-orange-400 lya:focus:border-lya-primary transition-colors shadow-inner [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-60"
                                           onClick={(e) => e.stopPropagation()} 
                                         />
                                       </div>
                                     </div>
                                   ) : (
                                     opt.precioAdicional > 0 && (
                                       <div className="mt-1.5 pl-6 text-[10px] opacity-60 font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                                         Catálogo global: +${opt.precioAdicional}
                                       </div>
                                     )
                                   )}
                                 </div>
                               );
                             })}
                           </div>
                        )}

                        {(tipo === 'tamanos' || tipo === 'leches') && optsSeleccionadas.length > 0 && (
                          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-500/10 lya:bg-lya-primary/5 rounded-xl border border-orange-100 dark:border-orange-500/20 lya:border-lya-primary/20">
                            <label className="text-[10px] font-black text-orange-600 dark:text-orange-400 lya:text-lya-primary uppercase tracking-widest flex items-center gap-1.5 mb-2">
                              <Star size={12} /> Elegir por defecto
                            </label>
                            <select
                              value={formData.opciones.defaults[tipo === 'tamanos' ? 'tamano' : 'leche']}
                              disabled={isSubmitting}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                opciones: {
                                  ...prev.opciones,
                                  defaults: {
                                    ...prev.opciones.defaults,
                                    [tipo === 'tamanos' ? 'tamano' : 'leche']: e.target.value
                                  }
                                }
                              }))}
                              className="w-full p-2.5 rounded-lg bg-white dark:bg-gray-900 lya:bg-lya-surface border border-orange-200 dark:border-orange-500/30 lya:border-lya-primary/30 outline-none text-xs font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text disabled:opacity-60"
                            >
                              <option value="">-- Sin predeterminar --</option>
                              {optsSeleccionadas.map(s => (
                                <option key={s.nombre} value={s.nombre}>{s.nombre}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            <footer className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30 bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-bg flex gap-3 sm:gap-4 shrink-0 transition-colors">
              <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={onClose} 
                className="flex-1 py-3.5 sm:py-4 font-bold text-xs sm:text-sm text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 lya:text-lya-text/60 lya:hover:bg-lya-surface rounded-[1rem] transition-colors disabled:opacity-50 active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={handleSaveSubmit} 
                className={`flex-[1.5] py-3.5 sm:py-4 text-white lya:text-lya-surface rounded-[1rem] font-black text-xs sm:text-sm shadow-md transition-all transform flex items-center justify-center gap-2 ${
                  isSubmitting 
                    ? 'bg-orange-400 lya:bg-lya-primary/70 cursor-not-allowed shadow-none' 
                    : 'bg-orange-500 hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 shadow-orange-500/30 lya:shadow-lya-primary/30 active:scale-95 hover:-translate-y-0.5'
                }`}
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Guardando...' : (formData.id ? 'Actualizar Producto' : 'Guardar Producto')}
              </button>
            </footer>
          </div>
        )}
      </motion.div>
    </div>
  );
};