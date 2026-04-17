import React, { useState } from 'react';
import Cropper from 'react-easy-crop';
import { X, Upload, RotateCw, ZoomIn, Package, Settings2, PlusCircle } from 'lucide-react';

export const ProductFormModal = ({ initialData, onClose, onSave, categories }) => {
  const [formData, setFormData] = useState(initialData || {
    nombre: '',
    precioBase: 0,
    categoria: categories[0] || 'cafeteria',
    controlarStock: false, // <-- NUEVO: Por defecto es ilimitado
    stock: 0,
    image: null,
    disponible: true,
    opciones: {
      tamanos: [],
      leches: [],
      extras: []
    }
  });

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const addOption = (type) => {
    const newValue = window.prompt(`Añadir nuevo ${type.slice(0, -1)}:`);
    if (newValue && newValue.trim() !== '') {
      setFormData({
        ...formData,
        opciones: { ...formData.opciones, [type]: [...formData.opciones[type], newValue.trim()] }
      });
    }
  };

  const removeOption = (type, index) => {
    const updatedList = formData.opciones[type].filter((_, i) => i !== index);
    setFormData({ ...formData, opciones: { ...formData.opciones, [type]: updatedList } });
  };

  const onFileChange = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => setImageSrc(reader.result), false);
      reader.readAsDataURL(file);
    }
  };

  const handleApplyCrop = () => {
    setFormData({ ...formData, image: imageSrc });
    setImageSrc(null);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl my-auto">
        
        {imageSrc ? (
          <div className="relative h-[500px] w-full bg-gray-950">
            <Cropper
              image={imageSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={1}
              onCropChange={setCrop} onRotationChange={setRotation} onZoomChange={setZoom}
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 p-4 rounded-2xl backdrop-blur-md z-10">
               <button onClick={() => setRotation(rotation + 90)} className="text-white p-2 hover:bg-white/10 rounded-full"><RotateCw size={20}/></button>
               <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(e.target.value)} className="w-32 accent-orange-500" />
               <button onClick={handleApplyCrop} className="bg-orange-500 text-white px-6 py-2 rounded-xl font-bold">Aplicar Recorte</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full max-h-[90vh]">
            <header className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10">
              <h2 className="text-2xl font-black dark:text-white">Configurar Producto</h2>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X size={24} className="text-gray-400" />
              </button>
            </header>

            <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* ZONA DE IMAGEN */}
                <div className="md:col-span-1">
                   <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl p-6 hover:border-orange-500 transition-colors bg-gray-50/50 dark:bg-gray-800/30">
                    {formData.image ? (
                      <img src={formData.image} className="w-40 h-40 object-cover rounded-2xl mb-4 shadow-md" />
                    ) : (
                      <div className="w-40 h-40 bg-gray-200 dark:bg-gray-800 rounded-2xl mb-4 flex items-center justify-center">
                        <Upload size={48} className="text-gray-400" />
                      </div>
                    )}
                    <label className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl cursor-pointer font-bold text-sm shadow-lg shadow-orange-500/20">
                      Subir Foto
                      <input type="file" className="hidden" onChange={onFileChange} accept="image/*" />
                    </label>
                  </div>
                </div>

                {/* ZONA DE DATOS Y STOCK */}
                <div className="md:col-span-2 space-y-5">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nombre del Producto</label>
                    <input 
                      type="text" value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Precio Base</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                        <input 
                          type="number" value={formData.precioBase}
                          onChange={(e) => setFormData({...formData, precioBase: parseFloat(e.target.value)})}
                          className="w-full p-4 pl-8 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none dark:text-white"
                        />
                      </div>
                    </div>

                    {/* NUEVO: CONTROL DE INVENTARIO */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-3 flex flex-col justify-center">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Controlar Inventario</label>
                        {/* TOGGLE SWITCH */}
                        <button 
                          onClick={() => setFormData({...formData, controlarStock: !formData.controlarStock})}
                          className={`w-11 h-6 rounded-full flex items-center transition-colors px-1 ${formData.controlarStock ? 'bg-orange-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${formData.controlarStock ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>
                      
                      {/* INPUT DE STOCK (Aparece o desaparece suavemente) */}
                      {formData.controlarStock ? (
                        <div className="relative animate-in fade-in zoom-in duration-200">
                          <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input 
                            type="number" value={formData.stock}
                            onChange={(e) => setFormData({...formData, stock: parseInt(e.target.value)})}
                            className="w-full p-2 pl-9 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none dark:text-white text-sm"
                            placeholder="Cant."
                          />
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400 py-2 rounded-xl text-center">
                          Stock Ilimitado
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* ZONA DE VARIANTES */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['tamanos', 'leches', 'extras'].map((tipo) => (
                  <div key={tipo} className="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200 capitalize flex items-center gap-2">
                        <Settings2 size={16} className="text-orange-500" />
                        {tipo}
                      </h3>
                      <button onClick={() => addOption(tipo)} className="text-orange-500 p-1">
                        <PlusCircle size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.opciones[tipo].map((opt, idx) => (
                        <div key={idx} className="bg-white dark:bg-gray-700 px-3 py-1 rounded-xl flex items-center gap-2">
                          <span className="text-sm dark:text-gray-200">{opt}</span>
                          <button onClick={() => removeOption(tipo, idx)} className="text-red-400"><X size={14} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 flex gap-4">
              <button onClick={onClose} className="flex-1 py-4 font-bold text-gray-500 rounded-2xl">Cancelar</button>
              <button onClick={() => onSave(formData)} className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-500/30">
                Guardar Producto
              </button>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};