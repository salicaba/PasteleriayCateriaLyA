// src/modules/admin/views/SettingsPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import { UsersTab } from './settings-tabs/UsersTab';
import { AccountsTab } from './settings-tabs/AccountsTab';
import { InterfaceTab } from './settings-tabs/InterfaceTab';
import { HardwareTab } from './settings-tabs/HardwareTab';

export const SettingsPage = ({ uiSize, setUiSize, activeTab, globalScroll, setGlobalScroll }) => {
  const [notification, setNotification] = useState({ show: false, type: '', message: '' });

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification((prev) => ({ ...prev, show: false }));
    }, 4000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`w-full bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg transition-colors duration-300 relative flex flex-col ${
        globalScroll ? 'min-h-full p-4 md:p-6' : 'h-full overflow-hidden p-4 md:p-6'
      }`}
    >
      <AnimatePresence>
        {notification.show && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className={`bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center justify-center gap-3 font-bold border pointer-events-auto transition-colors max-w-md w-full sm:w-auto ${
                notification.type === 'error' ? 'border-red-100 dark:border-red-900/30 lya:border-red-500/30' : 'border-emerald-100 dark:border-emerald-900/30 lya:border-lya-primary/30'
              }`}
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                notification.type === 'error' 
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-500' 
                  : 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
              }`}>
                {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              </div>
              <div className="flex flex-col items-center justify-center text-center w-full">
                  <span className="text-sm leading-tight text-center">{notification.message}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔥 AQUÍ ESTÁ LA MAGIA: Aseguramos flex-1 siempre, y quitamos el pb-4 que afectaba el centro */}
      <div className={`max-w-7xl mx-auto w-full flex flex-col flex-1 ${globalScroll ? 'space-y-6' : 'overflow-hidden'}`}>
        
        {activeTab === 'usuarios' && (
          <UsersTab showNotification={showNotification} globalScroll={globalScroll} />
        )}
        
        {activeTab === 'cuentas' && (
          <AccountsTab showNotification={showNotification} globalScroll={globalScroll} />
        )}
        
        {activeTab === 'interfaz' && (
          <InterfaceTab 
            uiSize={uiSize} 
            setUiSize={setUiSize}
            globalScroll={globalScroll}
            setGlobalScroll={setGlobalScroll}
            showNotification={showNotification} 
          />
        )}
        
        {activeTab === 'hardware' && (
          <HardwareTab showNotification={showNotification} globalScroll={globalScroll} />
        )}

      </div>
    </motion.div>
  );
};