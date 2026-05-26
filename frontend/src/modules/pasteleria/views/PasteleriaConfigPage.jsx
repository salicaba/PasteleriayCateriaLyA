import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tags, Layers, Hash, Plus, Trash2, CheckCircle2, GripVertical } from 'lucide-react';
import { usePasteleriaConfig } from '../controllers/usePasteleriaConfig';

// Importaciones de dnd-kit para Drag & Drop
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- COMPONENTES ARRASTRABLES ---

const SortableCategoria = ({ cat, setAsDefault, deleteCategoria }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto', 
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative flex items-center justify-between p-3 mb-2 rounded-xl border transition-colors ${
        cat.isDefault 
          ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 lya:bg-lya-primary/10 lya:border-lya-primary/40' 
          : 'bg-white border-gray-100 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 lya:bg-lya-surface lya:border-lya-border/40'
      } ${isDragging ? 'opacity-50 shadow-2xl scale-105' : 'shadow-sm'}`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2 overflow-hidden">
        <div {...attributes} {...listeners} className="text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 lya:hover:text-lya-primary cursor-grab active:cursor-grabbing p-1 transition-colors -ml-1">
          <GripVertical size={18} />
        </div>

        <button 
          onClick={()=>setAsDefault(cat.id)} 
          title={cat.isDefault ? "Categoría predeterminada" : "Fijar como predeterminado"} 
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            cat.isDefault 
              ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-500/20 dark:text-emerald-400 lya:text-lya-secondary lya:bg-lya-secondary/20 shadow-inner' 
              : 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 lya:bg-lya-bg lya:hover:bg-lya-border/50'
          }`}
        >
          <CheckCircle2 size={16} className={cat.isDefault ? 'opacity-100' : 'opacity-40'} /> 
          <span className="hidden xl:inline">{cat.isDefault ? 'Por defecto' : 'Fijar'}</span>
        </button>
        
        <span className={`font-bold text-sm truncate ${cat.isDefault ? 'text-emerald-800 dark:text-emerald-300 lya:text-lya-primary' : 'text-gray-700 dark:text-gray-300 lya:text-lya-text'}`}>
          {cat.nombre}
        </span>
      </div>

      <div className="flex items-center shrink-0">
        <button onClick={()=>deleteCategoria(cat.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 lya:hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={16}/>
        </button>
      </div>
    </div>
  );
};

const SortableString = ({ item, field, deleteString }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 999 : 'auto',
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`relative flex items-center justify-between p-3 mb-2 rounded-xl border bg-white border-gray-100 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-800 lya:bg-lya-surface lya:border-lya-border/40 transition-colors ${
        isDragging ? 'opacity-50 shadow-2xl scale-105' : 'shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-2 overflow-hidden">
        <div {...attributes} {...listeners} className="text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 lya:hover:text-lya-primary cursor-grab active:cursor-grabbing p-1 transition-colors -ml-1">
          <GripVertical size={18} />
        </div>
        <span className="font-bold text-sm text-gray-700 dark:text-gray-300 lya:text-lya-text truncate pr-2">
          {item}
        </span>
      </div>
      <div className="flex items-center shrink-0">
        <button onClick={()=>deleteString(field, item)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 lya:hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={16}/>
        </button>
      </div>
    </div>
  );
};

// --- PANTALLA PRINCIPAL ---

export default function PasteleriaConfigPage() {
  const { config, updateConfig } = usePasteleriaConfig();
  
  const [newCategoria, setNewCategoria] = useState('');
  const [newTamano, setNewTamano] = useState('');
  const [newSabor, setNewSabor] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEndCategorias = (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = config.categorias.findIndex((c) => c.id === active.id);
      const newIndex = config.categorias.findIndex((c) => c.id === over.id);
      updateConfig({ ...config, categorias: arrayMove(config.categorias, oldIndex, newIndex) });
    }
  };

  const handleDragEndString = (field) => (event) => {
    const { active, over } = event;
    if (active && over && active.id !== over.id) {
      const oldIndex = config[field].indexOf(active.id);
      const newIndex = config[field].indexOf(over.id);
      updateConfig({ ...config, [field]: arrayMove(config[field], oldIndex, newIndex) });
    }
  };

  const handleAddCategoria = (e) => {
    e.preventDefault();
    if (!newCategoria.trim()) return;
    const isFirst = config.categorias.length === 0;
    const newItem = { id: Date.now().toString(), nombre: newCategoria.trim(), isDefault: isFirst };
    updateConfig({ ...config, categorias: [...config.categorias, newItem] });
    setNewCategoria('');
  };

  const setAsDefault = (id) => {
    const updated = config.categorias.map(cat => ({ ...cat, isDefault: cat.id === id }));
    updateConfig({ ...config, categorias: updated });
  };

  const deleteCategoria = (id) => {
    const updated = config.categorias.filter(cat => cat.id !== id);
    if (updated.length > 0 && !updated.some(c => c.isDefault)) updated[0].isDefault = true;
    updateConfig({ ...config, categorias: updated });
  };

  const handleAddString = (e, field, value, setValue) => {
    e.preventDefault();
    if (!value.trim() || config[field].includes(value.trim())) return;
    updateConfig({ ...config, [field]: [...config[field], value.trim()] });
    setValue('');
  };

  const deleteString = (field, valueToRemove) => {
    updateConfig({ ...config, [field]: config[field].filter(v => v !== valueToRemove) });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      // CRUCIAL: Aquí quitamos el scroll de la página global (overflow-hidden en lugar de overflow-y-auto)
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 overflow-hidden relative"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0">
        <div className="flex items-center space-x-4">
          <div className="bg-emerald-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-emerald-500/20 lya:shadow-lya-primary/20">
            <Tags size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text">Catálogo</h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Configura y ordena las opciones para el formulario de pedidos</p>
          </div>
        </div>
      </header>

      {/* NUEVO CONTENEDOR: Este es el único div que hace scroll y dibuja la barra de navegación lateral */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUMNA CATEGORIAS */}
          <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 rounded-3xl p-6 shadow-sm flex flex-col relative z-0">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
               <Tags className="text-emerald-500 lya:text-lya-primary" size={20} />
               <h2 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text">Categorías</h2>
            </div>
            <form onSubmit={handleAddCategoria} className="flex gap-2 mb-4">
               <input type="text" placeholder="Nueva Categoría" value={newCategoria} onChange={(e)=>setNewCategoria(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white lya:text-lya-text" />
               <button type="submit" className="bg-emerald-500 lya:bg-lya-primary text-white p-2 rounded-xl hover:opacity-90 transition-opacity"><Plus size={20}/></button>
            </form>
            
            <div className="flex flex-col mt-2">
               {config.categorias.length === 0 && <p className="text-center text-gray-400 text-xs py-4 font-medium italic">Sin categorías. Agrega una arriba.</p>}
               
               <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategorias}>
                 <SortableContext items={config.categorias.map(c => c.id)} strategy={verticalListSortingStrategy}>
                     {config.categorias.map(cat => (
                       <SortableCategoria key={cat.id} cat={cat} setAsDefault={setAsDefault} deleteCategoria={deleteCategoria} />
                     ))}
                 </SortableContext>
               </DndContext>
            </div>
          </div>

          {/* COLUMNA TAMAÑOS */}
          <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 rounded-3xl p-6 shadow-sm flex flex-col relative z-0">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
               <Hash className="text-emerald-500 lya:text-lya-primary" size={20} />
               <h2 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text">Tamaños</h2>
            </div>
            <form onSubmit={(e) => handleAddString(e, 'tamanos', newTamano, setNewTamano)} className="flex gap-2 mb-4">
               <input type="text" placeholder="Ej. 20 Personas" value={newTamano} onChange={(e)=>setNewTamano(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white lya:text-lya-text" />
               <button type="submit" className="bg-emerald-500 lya:bg-lya-primary text-white p-2 rounded-xl hover:opacity-90 transition-opacity"><Plus size={20}/></button>
            </form>

            <div className="flex flex-col mt-2">
               {config.tamanos.length === 0 && <p className="text-center text-gray-400 text-xs py-4 font-medium italic">Sin tamaños. Agrega uno arriba.</p>}
               
               <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndString('tamanos')}>
                 <SortableContext items={config.tamanos} strategy={verticalListSortingStrategy}>
                     {config.tamanos.map(tam => (
                       <SortableString key={tam} item={tam} field="tamanos" deleteString={deleteString} />
                     ))}
                 </SortableContext>
               </DndContext>
            </div>
          </div>

          {/* COLUMNA SABORES */}
          <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 rounded-3xl p-6 shadow-sm flex flex-col relative z-0">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
               <Layers className="text-emerald-500 lya:text-lya-primary" size={20} />
               <h2 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text">Sabores</h2>
            </div>
            <form onSubmit={(e) => handleAddString(e, 'sabores', newSabor, setNewSabor)} className="flex gap-2 mb-4">
               <input type="text" placeholder="Ej. Chocolate" value={newSabor} onChange={(e)=>setNewSabor(e.target.value)} className="flex-1 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white lya:text-lya-text" />
               <button type="submit" className="bg-emerald-500 lya:bg-lya-primary text-white p-2 rounded-xl hover:opacity-90 transition-opacity"><Plus size={20}/></button>
            </form>

            <div className="flex flex-col mt-2">
               {config.sabores.length === 0 && <p className="text-center text-gray-400 text-xs py-4 font-medium italic">Sin sabores. Agrega uno arriba.</p>}
               
               <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndString('sabores')}>
                 <SortableContext items={config.sabores} strategy={verticalListSortingStrategy}>
                     {config.sabores.map(sabor => (
                       <SortableString key={sabor} item={sabor} field="sabores" deleteString={deleteString} />
                     ))}
                 </SortableContext>
               </DndContext>
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}