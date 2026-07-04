import React, { useState, useEffect } from 'react';
import { LayoutGrid, ChefHat, Cake, Menu, PieChart, BookOpenCheck, Clock, LogOut, QrCode, Coffee, ChevronDown, Calendar, ShoppingBasket, Settings, Palette, Landmark, Printer, Users, Tags, Wallet, Package, ClipboardCheck, Briefcase } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast'; 
import { useTheme } from './hooks/useTheme';

// Vistas
import { MesasPage } from './modules/cafeteria/views/MesasPage';
import { KitchenPage } from './modules/kitchen/views/KitchenPage';
import { LoginScreen } from './modules/auth/views/LoginScreen';
import PasteleriaDashboard from './modules/pasteleria/views/PasteleriaDashboard';
import PasteleriaCalendar from './modules/pasteleria/views/PasteleriaCalendar';
import PasteleriaConfigPage from './modules/pasteleria/views/PasteleriaConfigPage'; 
import { MenuManagerPage } from './modules/admin/views/MenuManagerPage';
import { QrControlPage } from './modules/cafeteria/views/QrControlPage';
import { SettingsPage } from './modules/admin/views/SettingsPage'; 
import { CashRegisterPage } from './modules/cash/views/CashRegisterPage';
import InventoryPage from './modules/inventory/views/InventoryPage'; 
import { InventoryReconciliationPage } from './modules/inventory/views/InventoryReconciliationPage'; 
import { ExpensesPage } from './modules/finance/views/ExpensesPage'; 
import { NetProfitDashboard } from './modules/finance/views/NetProfitDashboard'; 
import ReportsPage from './modules/reports/views/ReportsPage';

import logoLyA from './assets/logo.jpeg'; 

const getInitials = (name) => {
  if (!name) return 'US';
  const cleanName = name.trim();
  const words = cleanName.split(/\s+/);
  if (words.length >= 2) {
    return (words[0][1] ? words[0][0] + words[1][0] : words[0].substring(0, 2)).toUpperCase();
  }
  return cleanName.substring(0, 2).toUpperCase();
};

function App() {
  const [user, setUser] = useState(() => {
    const savedSession = localStorage.getItem('lya_pos_session');
    if (savedSession) {
      try {
        const { userData, expiresAt } = JSON.parse(savedSession);
        if (new Date().getTime() < expiresAt) {
          return userData;
        } else {
          localStorage.removeItem('lya_pos_session');
        }
      } catch (e) {
        localStorage.removeItem('lya_pos_session');
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem('lya_active_tab');
    if (savedTab) return savedTab;
    
    const savedSession = localStorage.getItem('lya_pos_session');
    if (savedSession) {
      try {
        const { userData } = JSON.parse(savedSession);
        return userData?.role === 'Empleado' ? 'mesas' : 'caja';
      } catch (e) {}
    }
    return 'caja'; 
  });

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const savedGroups = localStorage.getItem('lya_expanded_groups');
    return savedGroups ? JSON.parse(savedGroups) : []; 
  }); 

  const [globalScroll, setGlobalScroll] = useState(() => {
    const savedScroll = localStorage.getItem('lya_global_scroll');
    return savedScroll ? JSON.parse(savedScroll) : false; 
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [uiSize, setUiSize] = useState('large'); 
  
  // Estados: Modal de confirmación y carga de cierre de sesión
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  const { theme } = useTheme();

  useEffect(() => {
    localStorage.setItem('lya_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('lya_expanded_groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  useEffect(() => {
    localStorage.setItem('lya_global_scroll', JSON.stringify(globalScroll));
  }, [globalScroll]);

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

  // Cierre automático al llegar la medianoche (Cierre de Turno)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const savedSession = localStorage.getItem('lya_pos_session');
      if (savedSession) {
        const { expiresAt } = JSON.parse(savedSession);
        if (new Date().getTime() >= expiresAt) {
          handleLogout();
          toast("El turno ha finalizado (12:00 AM). Inicia sesión para el nuevo día.", {
            icon: '🌙',
            duration: 6000
          });
        }
      } else {
        handleLogout(); 
      }
    }, 10000); 
    return () => clearInterval(interval);
  }, [user]);

  // Escuchar evento de error 401 desde el Axios Client para evitar recargas completas (Flicker)
  useEffect(() => {
    const handleAuthError = () => {
      if (user) {
        handleLogout();
        toast.error("Tu sesión ha expirado por seguridad. Vuelve a ingresar.");
      }
    };
    window.addEventListener('auth_error', handleAuthError);
    return () => window.removeEventListener('auth_error', handleAuthError);
  }, [user]);

  const handleLogin = (userData) => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    
    localStorage.setItem('lya_pos_session', JSON.stringify({
      userData,
      expiresAt: nextMidnight.getTime()
    }));
    
    setUser(userData);
    
    const initialTab = userData.role === 'Empleado' ? 'mesas' : 'caja';
    setActiveTab(initialTab);
    localStorage.setItem('lya_active_tab', initialTab);
  };

  const handleLogout = () => {
    localStorage.removeItem('lya_pos_session');
    localStorage.removeItem('lya_token'); 
    localStorage.removeItem('lya_user'); 
    localStorage.removeItem('lya_active_tab'); 
    localStorage.removeItem('lya_expanded_groups'); 
    setUser(null);
    setActiveTab('caja'); 
    setExpandedGroups([]); 
    setShowLogoutModal(false); 
  };

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

  const menuConfig = [
    { id: 'caja', label: 'Caja', icon: Wallet },
    { id: 'reportes', label: 'Reportes', icon: PieChart },
    {
      id: 'cafeteria_group',
      label: 'Cafetería',
      icon: Coffee,
      isGroup: true,
      children: [
        { id: 'mesas', label: 'Mesas / Llevar', icon: LayoutGrid },
        { id: 'qr', label: 'Control QR', icon: QrCode },
        { id: 'cocina', label: 'Cocina', icon: ChefHat },
        { id: 'ajustes', label: 'Gestor Menú', icon: BookOpenCheck },
      ]
    },
    {
      id: 'pasteleria_group',
      label: 'Pastelería',
      icon: Cake,
      isGroup: true,
      children: [
        { id: 'pedidos', label: 'Pedidos', icon: ShoppingBasket },
        { id: 'agenda', label: 'Agenda', icon: Calendar },
        { id: 'catalogo', label: 'Catálogo', icon: Tags },
      ]
    },
    {
      id: 'inventario_group',
      label: 'Inventario',
      icon: Package,
      isGroup: true,
      children: [
        { id: 'inventario', label: 'Almacén', icon: Package },
        { id: 'arqueo', label: 'Arqueo Insumos', icon: ClipboardCheck },
      ]
    },
    {
      id: 'finanzas_group',
      label: 'Finanzas',
      icon: PieChart, 
      isGroup: true,
      children: [
        { id: 'egresos', label: 'Gastos Operativos', icon: Briefcase },
        { id: 'dashboard', label: 'Ganancias Netas', icon: Landmark },
      ]
    },
    {
      id: 'sistema_group',
      label: 'Sistema',
      icon: Settings,
      isGroup: true,
      children: [
        { id: 'cuentas', label: 'Cuentas', icon: Landmark },
        { id: 'usuarios', label: 'Usuarios', icon: Users },
        { id: 'interfaz', label: 'Pantalla', icon: Palette },
        { id: 'hardware', label: 'Hardware', icon: Printer },
      ]
    }
  ];

  const visibleMenuConfig = menuConfig.filter(group => {
    if (group.id === 'sistema_group' && user?.role === 'Empleado') {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (user?.role === 'Empleado' && ['usuarios', 'interfaz', 'cuentas', 'hardware'].includes(activeTab)) {
      setActiveTab('mesas'); 
    }
  }, [user, activeTab]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const renderMenuItem = (item, isNested = false) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        className={`flex items-center gap-3 py-3 rounded-xl transition-all relative overflow-hidden outline-none w-full ${isNested ? 'px-3 pl-11' : 'px-3'} ${
          isActive
            ? 'bg-orange-500/10 dark:bg-orange-500/20 lya:bg-lya-secondary/20 text-orange-600 dark:text-orange-400 lya:text-lya-secondary font-bold'
            : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:bg-gray-100 dark:hover:bg-gray-700/50 lya:hover:bg-lya-bg hover:text-gray-800 dark:hover:text-gray-200 lya:hover:text-lya-text'
        }`}
      >
        <div className="shrink-0 flex items-center justify-center w-6">
          <item.icon size={isNested ? 18 : 20} className={isActive ? 'stroke-[2.5px]' : 'stroke-2'} />
        </div>
        <span className="whitespace-nowrap">{item.label}</span>
        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-0 bottom-0 my-auto w-1 h-[70%] bg-orange-500 lya:bg-lya-secondary rounded-r-full"
          />
        )}
      </button>
    );
  };

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#1f2937' : theme === 'lya' ? '#FDF8F5' : '#ffffff',
            color: theme === 'dark' ? '#f3f4f6' : theme === 'lya' ? '#4A2B29' : '#1f2937',
            borderRadius: '1rem',
            border: theme === 'dark' ? '1px solid #374151' : theme === 'lya' ? '1px solid #E6CCB2' : '1px solid #f3f4f6',
            fontWeight: 'bold',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            padding: '14px 20px',
          },
          success: {
            iconTheme: { 
              primary: theme === 'lya' ? '#10b981' : '#10b981', 
              secondary: theme === 'dark' ? '#1f2937' : '#ffffff' 
            },
          },
          error: {
            iconTheme: { 
              primary: '#ef4444', 
              secondary: theme === 'dark' ? '#1f2937' : '#ffffff' 
            },
          }
        }}
      />

      {!user ? (
        <LoginScreen onLogin={handleLogin} />
      ) : (
        <div className="h-screen flex bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-800 dark:text-gray-100 lya:text-lya-text font-sans overflow-hidden transition-colors duration-300">
          
          <motion.aside
            initial={false}
            animate={{ width: isSidebarOpen ? 240 : 0 }}
            style={{ borderRightWidth: isSidebarOpen ? '1px' : '0px' }}
            className="h-full bg-white dark:bg-gray-800 lya:bg-lya-surface border-gray-200 dark:border-gray-800 lya:border-lya-border/40 shadow-xl z-30 shrink-0 overflow-hidden transition-colors duration-300 flex flex-col"
          >
            <div className="w-[240px] flex flex-col h-full">
              <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-orange-500/20 dark:border-gray-600 lya:border-lya-primary shadow-sm bg-white flex items-center justify-center shrink-0">
                  <img 
                    src={logoLyA} 
                    alt="Logo 𝓛𝔂𝓪" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="ml-3 font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text uppercase tracking-tight text-sm">Menú Principal</span>
              </div>

              <nav className="flex-1 py-4 flex flex-col gap-1.5 px-3 overflow-y-auto custom-scrollbar">
                {visibleMenuConfig.map((item) => {
                  if (item.isGroup) {
                    const isExpanded = expandedGroups.includes(item.id);
                    const hasActiveChild = item.children.some(child => child.id === activeTab);

                    return (
                      <div key={item.id} className="flex flex-col w-full">
                        <button
                          onClick={() => toggleGroup(item.id)}
                          className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all relative overflow-hidden outline-none w-full ${
                            hasActiveChild && !isExpanded
                              ? 'text-orange-600 dark:text-orange-400 lya:text-lya-secondary font-bold bg-orange-500/5 dark:bg-orange-500/10 lya:bg-lya-secondary/10'
                              : 'text-gray-700 dark:text-gray-200 lya:text-lya-text font-bold hover:bg-gray-100 dark:hover:bg-gray-700/50 lya:hover:bg-lya-bg'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="shrink-0 flex items-center justify-center w-6">
                              <item.icon size={20} className="stroke-2" />
                            </div>
                            <span className="whitespace-nowrap">{item.label}</span>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={16} className="text-gray-400 dark:text-gray-500 lya:text-lya-text/60" />
                          </motion.div>
                        </button>
                        
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-col gap-1 mt-1">
                                {item.children.map(child => renderMenuItem(child, true))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }
                  return renderMenuItem(item);
                })}
              </nav>

              <div className="p-4 border-t border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 bg-gray-50/50 dark:bg-gray-800/50 lya:bg-lya-surface space-y-5">
                {/* BOTÓN PARA ABRIR MODAL DE LOGOUT */}
                <button 
                  onClick={() => setShowLogoutModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-sm font-bold active:scale-95 outline-none"
                >
                  <LogOut size={16} />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </motion.aside>

          <div className={`flex flex-col relative min-w-0 w-full shrink-0 md:w-auto md:flex-1 md:shrink ${globalScroll ? 'h-full overflow-y-auto custom-scrollbar' : 'h-full'}`}>
            
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="absolute inset-0 bg-black/10 dark:bg-black/40 lya:bg-black/20 z-20 md:hidden cursor-pointer backdrop-blur-[1px]"
                />
              )}
            </AnimatePresence>

            <header className={`h-16 bg-white/50 dark:bg-gray-800/50 lya:bg-lya-surface/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/30 flex items-center justify-between px-3 sm:px-6 shrink-0 transition-colors duration-300 relative ${globalScroll ? 'z-10' : 'z-10 sticky top-0'}`}>
              <div className="flex items-center gap-2 sm:gap-4">
                 <button
                   onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                   className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-100 dark:hover:bg-gray-700 lya:hover:bg-lya-surface text-gray-600 dark:text-gray-300 lya:text-lya-text rounded-lg transition-colors shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 outline-none active:scale-95"
                 >
                   <Menu size={20} />
                 </button>

                 <div className="flex items-center ml-1">
                   <span 
                     className="text-2xl sm:text-3xl text-gray-900 dark:text-white lya:text-lya-text pb-1 font-bold"
                     style={{ letterSpacing: '-0.11em', transform: 'scaleX(0.95)' }}
                   >
                     𝓛𝔂𝓪
                   </span>
                 </div>

                 <div className="hidden sm:block h-6 w-px bg-gray-300 dark:bg-gray-700 lya:bg-lya-border/40 mx-1"></div>

                 <h2 className="text-lg font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 capitalize hidden sm:block">
                   {menuConfig.find(g => g.id === activeTab)?.label || 
                    menuConfig.find(g => g.isGroup)?.children.find(c => c.id === activeTab)?.label ||
                    'Sistema'}
                 </h2>
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center justify-center pointer-events-none w-max">
                 <div className="flex items-center gap-1 sm:gap-1.5 text-gray-900 dark:text-gray-100 lya:text-lya-text">
                   <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 lya:text-lya-secondary" />
                   <span className="text-sm sm:text-lg font-bold leading-none">{formattedTime}</span>
                 </div>
                 <span className="text-[9px] sm:text-xs font-medium text-gray-400 dark:text-gray-500 lya:text-lya-text/50 capitalize mt-0.5 hidden min-[380px]:block">
                   {formattedDate}
                 </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-3 bg-white dark:bg-gray-700/50 lya:bg-lya-bg px-2 sm:px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 shadow-sm transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 lya:hover:opacity-80">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text leading-none">
                      {user?.fullName ? user.fullName.split(' ')[0] : (user?.username || 'Admin')}
                    </p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 lya:text-lya-text/50">
                      {user?.role || 'Administrador'}
                    </p>
                  </div>
                  
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-white dark:border-gray-600 lya:border-lya-surface shadow-sm shrink-0 flex items-center justify-center text-white text-xs font-bold uppercase ${
                    user?.role === 'Administrador' 
                      ? 'bg-purple-600 dark:bg-purple-500' 
                      : 'bg-blue-600 lya:bg-lya-primary'
                  }`}>
                    {getInitials(user?.fullName || user?.username)}
                  </div>

                </div>
              </div>
            </header>

            <main className={`flex-1 relative transition-colors ${globalScroll ? 'overflow-visible' : 'overflow-hidden'}`}>
              {activeTab === 'mesas' && <MesasPage globalScroll={globalScroll} />}
              {activeTab === 'qr' && <QrControlPage />}
              {activeTab === 'cocina' && <KitchenPage />}
              {activeTab === 'pedidos' && <PasteleriaDashboard />} 
              {activeTab === 'agenda' && <PasteleriaCalendar />} 
              {activeTab === 'catalogo' && <PasteleriaConfigPage />}
              {activeTab === 'ajustes' && <MenuManagerPage />} 
              {activeTab === 'caja' && <CashRegisterPage user={user} />}
              
              {activeTab === 'inventario' && <InventoryPage />}
              {activeTab === 'arqueo' && <InventoryReconciliationPage />}
              
              {activeTab === 'egresos' && <ExpensesPage />}
              {activeTab === 'dashboard' && <NetProfitDashboard />} 
              
              {['usuarios', 'interfaz', 'cuentas', 'hardware'].includes(activeTab) && (
                <SettingsPage 
                  uiSize={uiSize} 
                  setUiSize={setUiSize} 
                  activeTab={activeTab} 
                  globalScroll={globalScroll} 
                  setGlobalScroll={setGlobalScroll}
                />
              )}
              
              {activeTab === 'reportes' && <ReportsPage />}
            </main>

            {/* MODAL DE CERRAR SESIÓN */}
            <AnimatePresence>
              {showLogoutModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-3xl shadow-2xl p-6 w-full max-w-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 text-center"
                  >
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <LogOut size={32} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white lya:text-lya-text mb-2">
                      ¿Cerrar Sesión?
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-6 text-sm">
                      Tendrás que volver a ingresar tus credenciales para acceder al sistema POS.
                    </p>
                    <div className="flex gap-3 w-full">
                      <button
                        onClick={() => !isLoggingOut && setShowLogoutModal(false)}
                        disabled={isLoggingOut}
                        className="flex-1 py-3 rounded-2xl font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          setIsLoggingOut(true);
                          // Breve retardo para UX (Se ve el spinner y evita doble clic)
                          await new Promise(r => setTimeout(r, 800)); 
                          handleLogout();
                          setIsLoggingOut(false);
                        }}
                        disabled={isLoggingOut}
                        className="flex-1 py-3 rounded-2xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed"
                      >
                        {isLoggingOut ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Saliendo...</span>
                          </>
                        ) : (
                          'Sí, salir'
                        )}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </div>
        </div>
      )}
    </>
  );
}

export default App;