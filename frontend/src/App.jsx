import React, { useState, useEffect } from 'react';
import { LayoutGrid, ChefHat, Menu, PieChart, Settings, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './hooks/useTheme';
import { ThemeToggle } from './components/ThemeToggle';

// Vistas
import { MesasPage } from './modules/cafeteria/views/MesasPage';
import { KitchenPage } from './modules/kitchen/views/KitchenPage';

function App() {
  const [activeTab, setActiveTab] = useState('mesas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uiSize, setUiSize] = useState('large'); 
  
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (uiSize === 'large') root.style.fontSize = '16px'; 
    if (uiSize === 'medium') root.style.fontSize = '14px'; 
    if (uiSize === 'small') root.style.fontSize = '12px';  
  }, [uiSize]);

  const formattedTime = currentTime.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
  
  const formattedDate = currentTime.toLocaleDateString('es-MX', { 
    weekday: 'short', // 'short' para que ocupe menos espacio en móvil
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  const menuItems = [
    { id: 'mesas', label: 'Salón', icon: LayoutGrid },
    { id: 'cocina', label: 'Cocina', icon: ChefHat },
    { id: 'reportes', label: 'Reportes', icon: PieChart },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-300">

      {/* --- SIDEBAR LATERAL --- */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 0 }}
        style={{ borderRightWidth: isSidebarOpen ? '1px' : '0px' }}
        className="h-full bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-800 shadow-xl z-30 shrink-0 overflow-hidden transition-colors duration-300 flex flex-col"
      >
        <div className="w-[240px] flex flex-col h-full">
          
          <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700/50 shrink-0">
            <div className="w-8 h-8 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-lg flex items-center justify-center text-white font-lya font-bold text-lg shadow-md shrink-0">
              L
            </div>
            <span className="ml-3 font-bold text-gray-700 dark:text-gray-200">Menú Principal</span>
          </div>

          <nav className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-y-auto hide-scrollbar">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative overflow-hidden outline-none ${
                    isActive
                      ? 'bg-brand-primary/10 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-primary font-bold'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <div className="shrink-0 flex items-center justify-center w-6">
                    <item.icon size={20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
                  </div>
                  <span className="whitespace-nowrap">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-brand-primary rounded-r-full"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 space-y-5">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Modo Oscuro</span>
              <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
            </div>

            <div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1 mb-2 block">
                Tamaño de Pantalla
              </span>
              <div className="flex bg-gray-200/50 dark:bg-gray-900 rounded-lg p-1">
                <button
                  onClick={() => setUiSize('small')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    uiSize === 'small' 
                      ? 'bg-white dark:bg-gray-700 text-brand-dark dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Chica
                </button>
                <button
                  onClick={() => setUiSize('medium')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    uiSize === 'medium' 
                      ? 'bg-white dark:bg-gray-700 text-brand-dark dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Media
                </button>
                <button
                  onClick={() => setUiSize('large')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    uiSize === 'large' 
                      ? 'bg-white dark:bg-gray-700 text-brand-dark dark:text-white shadow-sm' 
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                  }`}
                >
                  Grande
                </button>
              </div>
            </div>
          </div>

        </div>
      </motion.aside>

      {/* --- ÁREA PRINCIPAL --- */}
      <div className="flex flex-col h-full relative min-w-0 w-full shrink-0 md:w-auto md:flex-1 md:shrink">
        
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-black/10 dark:bg-black/40 z-20 md:hidden cursor-pointer backdrop-blur-[1px]"
            />
          )}
        </AnimatePresence>

        {/* Header Superior */}
        <header className="h-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-3 sm:px-6 shrink-0 z-10 transition-colors duration-300 relative">
          
          <div className="flex items-center gap-2 sm:gap-4">
             <button
               onClick={() => setIsSidebarOpen(!isSidebarOpen)}
               className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-700 outline-none active:scale-95"
             >
               <Menu size={20} />
             </button>

             <div className="flex items-center ml-1">
               <span className="text-2xl sm:text-3xl text-brand-dark dark:text-white tracking-wider pb-1">
                 𝓛𝔂𝓐
               </span>
             </div>

             <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

             <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400 capitalize hidden sm:block">
               {menuItems.find(i => i.id === activeTab)?.label}
             </h2>
          </div>

          {/* CENTRO: Reloj visible en móviles, ajustando tamaño con clases 'sm:' */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none w-max">
             <div className="flex items-center gap-1 sm:gap-1.5 text-brand-dark dark:text-gray-100">
               <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-brand-primary" />
               <span className="text-sm sm:text-lg font-bold leading-none">{formattedTime}</span>
             </div>
             {/* La fecha se oculta en celulares extremadamente estrechos, pero se ve en casi todos */}
             <span className="text-[9px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 capitalize mt-0.5 hidden min-[380px]:block">
               {formattedDate}
             </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-700/50 px-2 sm:px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-none">Cajero Principal</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Sucursal Centro</p>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-brand-dark rounded-full overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm shrink-0">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Contenedor de Vistas */}
        <main className="flex-1 overflow-hidden relative bg-gray-50/50 dark:bg-gray-900 transition-colors">
          {activeTab === 'mesas' && <MesasPage />}
          {activeTab === 'cocina' && <KitchenPage />}
          
          {activeTab === 'reportes' && (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 font-medium text-center p-4">
              Módulo de Reportes en construcción...
            </div>
          )}
          {activeTab === 'ajustes' && (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 font-medium text-center p-4">
              Módulo de Ajustes en construcción...
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;