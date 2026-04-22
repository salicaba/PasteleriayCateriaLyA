// src/modules/admin/views/ProductFormModal.jsx
import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { motion } from 'framer-motion';
import { X, Upload, RotateCw, Package, Folder, Settings2, CheckCircle2, Star } from 'lucide-react';
import clsx from 'clsx';

const createImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (error) => reject(error));
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url;
});
function getRadianAngle(degreeValue) { return (degreeValue * Math.PI) / 180; }
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
           if (typeof item === 'string') return { nombre: item, precioAdicional: 0 };
           return item;
        });
      }
    });
    return result;
  };

  const [formData, setFormData] = useState({
    id: initialData?.id || undefined,
    name: initialData?.name || initialData?.nombre || '',
    basePrice: initialData ? (initialData.basePrice ?? initialData.precioBase ?? 0) : '',
    categoryId: initialData?.categoryId || (categories.length > 0 ? categories[0].id : ''),
    controlarStock: initialData?.controlarStock || false,
    stockQuantity: initialData ? (initialData.stockQuantity ?? initialData.stock ?? 0) : '',
    imageUrl: initialData?.imageUrl || initialData?.image || null,
    isActive: initialData?.isActive !== undefined ? initialData.isActive : (initialData?.disponible !== undefined ? initialData.disponible : true),
    opciones: normalizeOptions(initialData?.opciones)
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const toggleOption = (tipo, globalOpt) => {
    const current = formData.opciones[tipo];
    const exists = current.some(opt => opt.nombre === globalOpt.nombre);
    
    let newArray;
    if (exists) {
      newArray = current.filter(opt => opt.nombre !== globalOpt.nombre);
    } else {
      newArray = [...current, { nombre: globalOpt.nombre, precioAdicional: globalOpt.precioAdicional }];
    }

    let newDefaults = { ...formData.opciones.defaults };
    // Si desmarcamos la opción que era la predeterminada, la borramos del default
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
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
      setFormData({ ...formData, imageUrl: croppedImage });
      setImageSrc(null);
    } catch (e) {
      console.error('Error al recortar la imagen', e);
    }
  };

  const handleSaveSubmit = () => {
    const finalData = {
      ...formData,
      basePrice: formData.basePrice === '' ? 0 : formData.basePrice,
      stockQuantity: formData.stockQuantity === '' ? 0 : formData.stockQuantity
    };
    onSave(finalData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl my-auto">
        
        {imageSrc ? (
          <div className="relative h-[500px] w-full bg-gray-950">
            <Cropper
              image={imageSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={1}
              onCropChange={setCrop} onRotationChange={setRotation} onZoomChange={setZoom}
              onCropComplete={(croppedArea, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 p-4 rounded-2xl backdrop-blur-md z-10">
              <button onClick={() => setRotation(rotation + 90)} className="text-white p-2 hover:bg-white/10 rounded-full"><RotateCw size={20}/></button>
              <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="w-32 accent-orange-500" />
              <button onClick={handleApplyCrop} className="bg-orange-500 hover:bg-orange-600 transition-colors text-white px-6 py-2 rounded-xl font-bold">Aplicar Recorte</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[90vh]">
            <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
              <h2 className="text-2xl font-black dark:text-white">{initialData ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </header>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              {/* DATOS BÁSICOS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-6 hover:border-orange-500 transition-colors bg-gray-50/50 dark:bg-gray-800/30 h-full">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} className="w-40 h-40 object-cover rounded-2xl mb-4 shadow-md" />
                    ) : (
                      <div className="w-40 h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-4 flex items-center justify-center">
                        <Upload size={48} className="text-gray-400" />
                      </div>
                    )}
                    <label className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl cursor-pointer font-bold text-sm shadow-lg shadow-orange-500/20 w-full text-center">
                      Subir Foto
                      <input type="file" className="hidden" onChange={onFileChange} accept="image/*" />
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nombre del Producto</label>
                    <input 
                      type="text" value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-orange-500 rounded-2xl outline-none dark:text-white transition-all font-medium"
                      placeholder="Ej: Frappé de Moka"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Categoría</label>
                    <div className="relative">
                      <Folder className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                        className="w-full p-4 pl-12 bg-gray-50 dark:bg-gray-800 focus:border-orange-500 rounded-2xl outline-none dark:text-white appearance-none cursor-pointer transition-all font-medium"
                      >
                        <option value="" disabled>Selecciona una categoría...</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Precio Base</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input 
                          type="number" value={formData.basePrice}
                          onChange={(e) => setFormData({...formData, basePrice: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                          placeholder="Ej: 45.00"
                          className="w-full p-4 pl-8 bg-gray-50 dark:bg-gray-800 focus:border-orange-500 rounded-2xl outline-none dark:text-white transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 flex flex-col justify-center">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Controlar Inventario</label>
                        <button onClick={() => setFormData({...formData, controlarStock: !formData.controlarStock})} className={`w-11 h-6 rounded-full flex items-center transition-colors px-1 ${formData.controlarStock ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${formData.controlarStock ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      {formData.controlarStock && (
                        <div className="relative animate-in fade-in zoom-in duration-200">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="number" value={formData.stockQuantity}
                            onChange={(e) => setFormData({...formData, stockQuantity: e.target.value === '' ? '' : parseInt(e.target.value)})}
                            placeholder="Ej: 15"
                            className="w-full p-2 pl-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 focus:border-orange-500 rounded-xl outline-none dark:text-white text-sm transition-all font-medium"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECCIÓN DE OPCIONES Y PREDETERMINADOS */}
              <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <h3 className="font-black text-xl text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                  <Settings2 size={24} className="text-blue-500" />
                  Personalización del Producto
                </h3>
                <p className="text-gray-500 text-sm mb-6">Marca las opciones disponibles y elige cuál se aplicará en Venta Rápida.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {['tamanos', 'leches', 'extras'].map((tipo) => {
                    const optsDisponibles = globalOptions.filter(o => o.tipo === tipo);
                    const optsSeleccionadas = formData.opciones[tipo] || [];
                    
                    return (
                      <div key={tipo} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-800">
                        <h4 className="font-bold text-gray-700 dark:text-gray-200 capitalize mb-4">{tipo}</h4>
                        
                        {/* Checkboxes de opciones */}
                        {optsDisponibles.length === 0 ? (
                           <p className="text-xs text-gray-400 italic">No hay {tipo} en el catálogo global.</p>
                        ) : (
                           <div className="flex flex-col gap-2 mb-4">
                             {optsDisponibles.map((opt) => {
                               const isSelected = optsSeleccionadas.some(s => s.nombre === opt.nombre);
                               return (
                                 <button
                                   key={opt.id}
                                   onClick={() => toggleOption(tipo, opt)}
                                   className={clsx(
                                     "flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition-all text-left",
                                     isSelected 
                                       ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400" 
                                       : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-300"
                                   )}
                                 >
                                   <span className="flex items-center gap-2">
                                     {isSelected && <CheckCircle2 size={16} className="text-blue-500" />}
                                     {opt.nombre}
                                   </span>
                                   {opt.precioAdicional > 0 && <span className="text-xs opacity-70">+${opt.precioAdicional}</span>}
                                 </button>
                               );
                             })}
                           </div>
                        )}

                        {/* SELECTOR DE PREDETERMINADO (Solo para Tamaños y Leches) */}
                        {(tipo === 'tamanos' || tipo === 'leches') && optsSeleccionadas.length > 0 && (
                          <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-500/10 rounded-2xl border border-orange-100 dark:border-orange-500/20">
                            <label className="text-[11px] font-black text-orange-600 dark:text-orange-400 uppercase flex items-center gap-1 mb-2">
                              <Star size={12} /> {tipo} por defecto
                            </label>
                            <select
                              value={formData.opciones.defaults[tipo === 'tamanos' ? 'tamano' : 'leche']}
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
                              className="w-full p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-orange-200 dark:border-orange-500/30 outline-none text-sm font-bold text-gray-800 dark:text-gray-200"
                            >
                              <option value="">-- Sin predeterminado --</option>
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

            <footer className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex gap-4 shrink-0">
              <button onClick={onClose} className="flex-1 py-4 font-bold text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-2xl transition-colors">Cancelar</button>
              <button onClick={handleSaveSubmit} className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/30 transition-all transform hover:-translate-y-0.5">
                {formData.id ? 'Actualizar Producto' : 'Guardar Producto'}
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};