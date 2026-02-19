import React, { useState } from 'react';
import { LayoutGrid, ChefHat } from 'lucide-react'; // Ya no importamos Sun/Moon aquí
import { useTheme } from './hooks/useTheme';
import { ThemeToggle } from './components/ThemeToggle'; // <--- Importamos el nuevo componente

// Vistas
import { PosModal } from './modules/cafeteria/views/PosModal';
import { MesasPage } from './modules/cafeteria/views/MesasPage';
import { KitchenPage } from './modules/kitchen/views/KitchenPage';

function App() {
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [activeTab, setActiveTab] = useState('mesas');
  
  // Usamos nuestro hook de tema
  const { theme, toggleTheme } = useTheme();

  return (
    // Agregamos dark:bg-gray-900 y dark:text-gray-100 al contenedor principal
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">
      
      {/* Navbar con soporte Dark Mode */}
      <header className="h-16 bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-900/50 flex items-center justify-between px-6 z-10 shrink-0 relative transition-colors duration-300">
        
        {/* Logo */}
        <div className="flex items-center gap-2 w-48">
           <div className="w-9 h-9 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center text-white font-lya font-bold text-xl shadow-lg shadow-brand-primary/30">
             L
           </div>
           <span className="font-bold text-xl tracking-tight text-brand-dark dark:text-white">LyA <span className="text-gray-300 dark:text-gray-500 font-normal text-base">POS</span></span>
        </div>
        
        {/* Navegación Central */}
        <nav className="absolute left-1/2 -translate-x-1/2 flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl transition-colors">
          <button 
            onClick={() => setActiveTab('mesas')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'mesas' 
                ? 'bg-white dark:bg-gray-600 text-brand-dark dark:text-white shadow-sm' 
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <LayoutGrid size={18} />
            <span>Salón</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('cocina')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'cocina' 
                ? 'bg-white dark:bg-gray-600 text-brand-dark dark:text-white shadow-sm' 
                : 'text-gray-400 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
            }`}
          >
            <ChefHat size={18} />
            <span>Cocina</span>
          </button>
        </nav>

        {/* Lado Derecho: Toggle + Usuario */}
        <div className="flex items-center justify-end gap-4 w-48">
          
          {/* AQUÍ ESTÁ EL CAMBIO: Usamos el nuevo componente */}
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} />

          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-700/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700 transition-colors">
             <div className="text-right hidden sm:block">
               <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-none">Cajero Principal</p>
               <p className="text-[10px] text-gray-400 dark:text-gray-500">Sucursal Centro</p>
             </div>
             <div className="w-8 h-8 bg-brand-dark rounded-full overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm">
               <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {activeTab === 'mesas' ? (
          <MesasPage onSelectMesa={setMesaSeleccionada} />
        ) : (
          <KitchenPage />
        )}
      </main>

      <PosModal 
        isOpen={!!mesaSeleccionada} 
        onClose={() => setMesaSeleccionada(null)} 
        mesa={mesaSeleccionada}
      />

    </div>
  );
}

export default App;