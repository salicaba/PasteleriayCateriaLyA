import React, { useState, useEffect } from 'react';
import { LayoutGrid, ChefHat, Cake, Menu, PieChart, Settings, Clock, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from './hooks/useTheme';
import { ThemeToggle } from './components/ThemeToggle';

// Vistas
import { MesasPage } from './modules/cafeteria/views/MesasPage';
import { KitchenPage } from './modules/kitchen/views/KitchenPage';
import { LoginScreen } from './modules/auth/views/LoginScreen';
import PasteleriaDashboard from './modules/pasteleria/views/PasteleriaDashboard';
import { MenuManagerPage } from './modules/admin/views/MenuManagerPage'; // <-- NUEVA IMPORTACIÓN DEL GESTOR

function App() {
  // --- ESTADOS DE AUTENTICACIÓN ---
  const [user, setUser] = useState(null);

  // --- ESTADOS DE INTERFAZ ---
  const [activeTab, setActiveTab] = useState('mesas');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uiSize, setUiSize] = useState('large'); 
  
  const { theme, toggleTheme } = useTheme();

  // Reloj en tiempo real
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Escalado de interfaz (rem)
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
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  // --- MENÚ PRINCIPAL ---
  const menuItems = [
    { id: 'mesas', label: 'Salón', icon: LayoutGrid },
    { id: 'cocina', label: 'Cocina', icon: ChefHat },
    { id: 'pasteleria', label: 'Pastelería', icon: Cake },
    { id: 'reportes', label: 'Reportes', icon: PieChart },
    { id: 'ajustes', label: 'Gestor Menú', icon: Settings }, // <-- NOMBRE ACTUALIZADO
  ];

  // --- BARRERA DE AUTENTICACIÓN ---
  if (!user) {
    return <LoginScreen onLogin={(userData) => setUser(userData)} />;
  }

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
            <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 to-orange-400 rounded-lg flex items-center justify-center text-white font-lya font-bold text-lg shadow-md shrink-0">
              L
            </div>
            <span className="ml-3 font-bold text-gray-700 dark:text-gray-200">Menú Principal</span>
          </div>

          <nav className="flex-1 py-4 flex flex-col gap-2 px-3 overflow-y-auto custom-scrollbar">
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
                      ? 'bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold'
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
                      className="absolute left-0 top-0 bottom-0 my-auto w-1 h-[70%] bg-orange-500 rounded-r-full"
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
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setUiSize(size)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      uiSize === size 
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {size === 'small' ? 'Chica' : size === 'medium' ? 'Media' : 'Grande'}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón de Cerrar Sesión */}
            <button 
              onClick={() => setUser(null)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-bold"
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
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
               <span className="text-2xl sm:text-3xl text-gray-900 dark:text-white tracking-wider pb-1 font-bold">
                 LyA
               </span>
             </div>

             <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>

             <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400 capitalize hidden sm:block">
               {menuItems.find(i => i.id === activeTab)?.label}
             </h2>
          </div>

          {/* CENTRO: Reloj */}
          <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none w-max">
             <div className="flex items-center gap-1 sm:gap-1.5 text-gray-900 dark:text-gray-100">
               <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
               <span className="text-sm sm:text-lg font-bold leading-none">{formattedTime}</span>
             </div>
             <span className="text-[9px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 capitalize mt-0.5 hidden min-[380px]:block">
               {formattedDate}
             </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3 bg-white dark:bg-gray-700/50 px-2 sm:px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700 shadow-sm transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-none">{user?.name || 'Admin'}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Sucursal Centro</p>
              </div>
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 rounded-full overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm shrink-0 flex items-center justify-center text-white text-xs font-bold">
                {user?.name?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* Contenedor de Vistas */}
        <main className="flex-1 overflow-hidden relative bg-gray-50/50 dark:bg-gray-950 transition-colors">
          {activeTab === 'mesas' && <MesasPage />}
          {activeTab === 'cocina' && <KitchenPage />}
          {activeTab === 'pasteleria' && <PasteleriaDashboard />}
          
          {/* AQUÍ RENDERIZAMOS EL NUEVO MÓDULO DE GESTIÓN DE MENÚ */}
          {activeTab === 'ajustes' && <MenuManagerPage />} 
          
          {activeTab === 'reportes' && (
            <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500 font-medium text-center p-4">
              <div className="flex flex-col items-center space-y-4">
                <PieChart size={48} className="opacity-50" />
                <p>Módulo de Reportes en construcción...</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;