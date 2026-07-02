// src/modules/cafeteria/views/components/MesasHeader.jsx
import React from 'react';
import { Grid, ShoppingBag, CheckCircle, Trash2, Store, Zap, Loader2 } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, borderClass, iconColors, onClick, isActive }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl p-4 sm:p-5 shadow-sm border-l-4 flex justify-between items-center cursor-pointer transition-all duration-200 active:scale-95 hover:shadow-md ${borderClass} ${
      isActive 
        ? 'ring-1 ring-gray-200 dark:ring-gray-700 lya:ring-lya-border/50 shadow-md opacity-100 scale-[1.02]' 
        : 'opacity-70 hover:opacity-100'
    }`}
  >
    <div>
      <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 lya:text-lya-text/60 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text">{value}</h3>
    </div>
    {/* 🔥 Refactorizado: Se eliminó bg-opacity obsoleto para usar la sintaxis moderna de Tailwind */}
    <div className={`p-2 sm:p-3 rounded-xl ${iconColors.bg}`}>
      <Icon size={24} className={iconColors.text} />
    </div>
  </div>
);

export const MesasHeader = ({ 
  activeTab, 
  setActiveTab, 
  handleCreateMostrador, 
  isCreatingMostrador, 
  mesasOcupadas, 
  mesasSalonLength, 
  mesasLlevarLength, 
  ingresosTotalesLength, 
  papeleraCount, 
  showVendidos, 
  setShowVendidos, 
  showPapelera, 
  setShowPapelera 
}) => {
  return (
    <div className="shrink-0 p-4 md:p-6 pb-4 space-y-6 md:space-y-8 z-10 relative">
      
      {/* TARJETA PRINCIPAL Y BOTONES NAVEGACIÓN */}
      <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2.5rem] p-6 md:p-8 shadow-sm flex flex-col xl:flex-row xl:items-center justify-between gap-6 transition-colors duration-300">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 lya:bg-lya-primary/20 text-orange-500 lya:text-lya-primary rounded-2xl flex-shrink-0">
            <Store size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
              Punto de Venta
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Gestión operativa de comandas y cuentas.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setActiveTab('salon')} 
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border ${
              activeTab === 'salon' 
                ? 'bg-orange-500 text-white border-orange-500 shadow-md lya:bg-lya-primary lya:border-lya-primary lya:shadow-lya-primary/30' 
                : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/40 border-orange-100 dark:border-orange-900/30 lya:bg-lya-primary/10 lya:text-lya-primary lya:border-lya-primary/20 lya:hover:bg-lya-primary/20'
            }`}
          >
            <Grid size={18} /> Mesas
          </button>
          
          <button 
            onClick={() => setActiveTab('llevar')} 
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 border ${
              activeTab === 'llevar'
                ? 'bg-blue-500 text-white border-blue-500 shadow-md lya:bg-lya-secondary lya:border-lya-secondary lya:shadow-lya-secondary/30'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-100 dark:border-blue-900/30 lya:bg-lya-secondary/10 lya:text-lya-secondary lya:border-lya-secondary/20 lya:hover:bg-lya-secondary/20'
            }`}
          >
            <ShoppingBag size={18} /> Llevar
          </button>
          
          <button 
            onClick={handleCreateMostrador}
            disabled={isCreatingMostrador}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] ${
              isCreatingMostrador 
                ? 'bg-amber-400/70 text-amber-950/70 cursor-not-allowed' 
                : 'bg-amber-400 hover:bg-amber-500 text-amber-950 active:scale-95'
            }`}
          >
            {isCreatingMostrador ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />} Mostrador
          </button>
        </div>
      </div>
      
      {/* CUADRÍCULA DE ESTADÍSTICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard 
          title="Mesas Ocupadas" 
          value={`${mesasOcupadas} / ${mesasSalonLength}`} 
          icon={Grid} 
          borderClass="border-orange-500 lya:border-orange-400 lya:border-lya-primary" 
          iconColors={{ 
            bg: "bg-orange-500/10 dark:bg-orange-500/20 lya:bg-lya-primary/20", 
            text: "text-orange-500 lya:text-lya-primary" 
          }} 
          onClick={() => { setActiveTab('salon'); setShowVendidos(false); setShowPapelera(false); }}
          isActive={activeTab === 'salon' && !showVendidos && !showPapelera}
        />
        <StatCard 
          title="Cuentas Llevar" 
          value={mesasLlevarLength} 
          icon={ShoppingBag} 
          borderClass="border-blue-500 lya:border-blue-400 lya:border-lya-secondary" 
          iconColors={{ 
            bg: "bg-blue-500/10 dark:bg-blue-500/20 lya:bg-lya-secondary/20", 
            text: "text-blue-500 lya:text-lya-secondary" 
          }} 
          onClick={() => { setActiveTab('llevar'); setShowVendidos(false); setShowPapelera(false); }}
          isActive={activeTab === 'llevar' && !showVendidos && !showPapelera}
        />
        <StatCard 
          title="Vendidos Hoy" 
          value={ingresosTotalesLength} 
          icon={CheckCircle} 
          borderClass="border-[#24d366] lya:border-[#24d366]" 
          iconColors={{ 
            bg: "bg-[#24d366]/10 dark:bg-[#24d366]/20 lya:bg-[#24d366]/20", 
            text: "text-[#24d366]" 
          }} 
          onClick={() => { setShowVendidos(true); setShowPapelera(false); }}
          isActive={showVendidos}
        />
        <StatCard 
          title="Cancelados Hoy" 
          value={papeleraCount} 
          icon={Trash2} 
          borderClass="border-red-500 lya:border-red-400" 
          iconColors={{ 
            bg: "bg-red-500/10 dark:bg-red-500/20 lya:bg-red-500/20", 
            text: "text-red-500" 
          }} 
          onClick={() => { setShowPapelera(true); setShowVendidos(false); }}
          isActive={showPapelera}
        />
      </div>
    </div>
  );
};