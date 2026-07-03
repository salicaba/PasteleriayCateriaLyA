// src/modules/admin/views/settings-tabs/HardwareTab.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Printer, Wifi, Usb, RefreshCw, AlertCircle, Barcode, Keyboard, Save, Loader2 } from 'lucide-react';
import client from '../../../../api/client';

export const HardwareTab = ({ showNotification, globalScroll }) => {
  const [printerConfig, setPrinterConfig] = useState({ type: 'usb', interface: '' });
  const [barcodeConfig, setBarcodeConfig] = useState({ autoAdd: true }); 
  const [lastScanned, setLastScanned] = useState(''); 

  const [isScanning, setIsScanning] = useState(false);
  const [isTestingPrint, setIsTestingPrint] = useState(false);
  const [detectedPorts, setDetectedPorts] = useState([]);
  const [printerStatus, setPrinterStatus] = useState('unknown'); 

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchHardwareConfig();
  }, []);

  const fetchHardwareConfig = async () => {
    setFetching(true);
    try {
      const res = await client.get('/settings');
      if (res.data) {
        if (res.data.printer_config) setPrinterConfig(res.data.printer_config);
        if (res.data.barcode_config) setBarcodeConfig(res.data.barcode_config);
      }
    } catch (err) {
      showNotification('error', "Error al obtener la configuración de hardware");
    } finally {
      setFetching(false);
    }
  };

  const saveSettingsToDB = async () => {
    setLoading(true);
    try {
      const current = await client.get('/settings');
      const payload = { 
        ...current.data,
        printer_config: printerConfig,
        barcode_config: barcodeConfig
      };
      
      await client.put('/settings', payload);
      showNotification('success', "¡Configuración de hardware guardada exitosamente!");
    } catch (e) {
      showNotification('error', "Error de base de datos al guardar ajustes");
    } finally { 
      setLoading(false); 
    }
  };

  const scanPrinters = async () => {
    setIsScanning(true);
    setPrinterStatus('unknown');
    try {
      const response = await client.get('/hardware/scan-printers');
      if (response.data && response.data.ports) {
        setDetectedPorts(response.data.ports);
        showNotification('success', "Puertos de hardware analizados");
      } else {
        setDetectedPorts(['USB001', 'COM3', '/dev/usb/lp0']);
      }
    } catch (e) {
      setDetectedPorts(['USB001', 'COM3']);
      showNotification('error', "Mostrando puertos por defecto");
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestPrint = async () => {
    if (!printerConfig.interface) return showNotification('error', "Falta especificar la interfaz.");
    setIsTestingPrint(true);
    setPrinterStatus('unknown');
    try {
      await client.post('/hardware/print-test', printerConfig);
      showNotification('success', "Ticket de prueba impreso en miniprinter");
      setPrinterStatus('online'); 
    } catch (e) {
      showNotification('error', "La impresora no respondió");
      setPrinterStatus('offline');
    } finally {
      setIsTestingPrint(false);
    }
  };

  if (fetching) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-700 lya:border-lya-border/40"
        >
          <Printer size={40} className="text-emerald-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center">
          Cargando Hardware
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 text-center">
          <Loader2 size={16} className="animate-spin text-emerald-500 lya:text-lya-primary" /> Sincronizando periféricos...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col w-full transition-all duration-300 ${globalScroll ? 'space-y-6' : 'h-full overflow-hidden'}`}
    >
      
      <div className={`shrink-0 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex flex-col sm:flex-row items-center sm:items-start gap-4 ${globalScroll ? '' : 'mb-6 z-10'}`}>
        <div className="bg-gray-900 dark:bg-gray-700 lya:bg-lya-primary p-4 rounded-[1.5rem] text-white shadow-lg shrink-0">
          <Printer size={32} />
        </div>
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">
            Administración de Hardware
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-2 text-justify sm:text-left">
            Configuración de impresoras térmicas, lectores de código de barras y periféricos locales para el sistema <strong>𝓛𝔂𝓪</strong>.
          </p>
        </div>
      </div>

      <div className={`flex-1 w-full relative flex flex-col ${globalScroll ? 'space-y-6' : 'overflow-y-auto custom-scrollbar pr-1 sm:pr-2 pb-4 space-y-6'}`}>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-1">
          
          <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-900/10 dark:bg-white/10 lya:bg-lya-primary/10 flex items-center justify-center text-gray-900 dark:text-white lya:text-lya-primary shrink-0">
                  <Printer size={24} />
                </div>
                <h2 className="font-bold text-xl text-gray-900 dark:text-white lya:text-lya-text">Impresora Térmica</h2>
              </div>
              <div className="flex items-center shrink-0">
                {printerStatus === 'online' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 rounded-xl text-[10px] uppercase font-black tracking-wider border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Conectada
                  </div>
                )}
                {printerStatus === 'offline' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-600 rounded-xl text-[10px] uppercase font-black tracking-wider border border-red-500/20">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div> Desconectada
                  </div>
                )}
                {printerStatus === 'unknown' && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-500/10 text-gray-500 rounded-xl text-[10px] uppercase font-black tracking-wider border border-gray-500/20">
                    <AlertCircle size={12} /> Sin verificar
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-6 flex-1 text-justify">
              Ajusta el puerto de conexión (USB) o la dirección IP de red de la miniprinter encargada de emitir los tickets de mostrador y comandas.
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-2">Medio de Conexión</label>
                <div className="flex bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl p-1.5 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/40">
                  <button 
                    onClick={() => { setPrinterConfig({...printerConfig, type: 'usb'}); setPrinterStatus('unknown'); }} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-[1rem] transition-all ${
                      printerConfig.type === 'usb' 
                        ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Usb size={18}/> Cable USB
                  </button>
                  <button 
                    onClick={() => { setPrinterConfig({...printerConfig, type: 'network'}); setPrinterStatus('unknown'); }} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-[1rem] transition-all ${
                      printerConfig.type === 'network' 
                        ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40' 
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <Wifi size={18}/> Red / LAN
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-2">
                  {printerConfig.type === 'network' ? 'Dirección IP de la Impresora' : 'Puerto USB Detectado'}
                </label>
                <div className="flex gap-2">
                  {printerConfig.type === 'usb' && detectedPorts.length > 0 ? (
                    <select 
                      value={printerConfig.interface} 
                      onChange={e => { setPrinterConfig({...printerConfig, interface: e.target.value}); setPrinterStatus('unknown'); }} 
                      className="flex-1 px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm font-bold"
                    >
                      {detectedPorts.map(port => <option key={port} value={port}>{port}</option>)}
                    </select>
                  ) : (
                    <input 
                      type="text" 
                      value={printerConfig.interface} 
                      onChange={e => { setPrinterConfig({...printerConfig, interface: e.target.value}); setPrinterStatus('unknown'); }} 
                      placeholder={printerConfig.type === 'network' ? "Ej. 192.168.1.100" : "Ingresa puerto o escanea"} 
                      className="flex-1 px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm font-mono" 
                    />
                  )}
                  {printerConfig.type === 'usb' && (
                    <button 
                      onClick={scanPrinters} 
                      disabled={isScanning} 
                      title="Escanear Puertos"
                      className="px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 lya:bg-lya-primary/10 lya:hover:bg-lya-primary/20 lya:text-lya-primary rounded-2xl font-bold flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100 border border-transparent lya:border-lya-primary/20"
                    >
                      {isScanning ? <Loader2 className="animate-spin text-gray-500 lya:text-lya-primary" size={24}/> : <RefreshCw size={24} className="text-gray-600 dark:text-gray-300 lya:text-lya-primary" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleTestPrint} 
                  disabled={isTestingPrint || !printerConfig.interface} 
                  className="w-full py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-700 dark:text-gray-300 lya:text-lya-text font-bold rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 text-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:bg-gray-50"
                >
                  {isTestingPrint ? (
                    <><Loader2 className="animate-spin" size={18}/> Enviando impresión...</>
                  ) : (
                    <><Printer size={18}/> Realizar Prueba de Conexión</>
                  )}
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                  <Barcode size={24} />
                </div>
                <h2 className="font-bold text-xl text-gray-900 dark:text-white lya:text-lya-text">Lector de Códigos</h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 rounded-xl text-[10px] uppercase font-black tracking-wider border border-blue-500/20 shrink-0">
                <Keyboard size={12} /> Plug & Play
              </div>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-6 flex-1 text-justify">
              Los lectores láser estándar emulan la escritura de un teclado. Configura su comportamiento al escanear productos físicos en la pantalla de ventas.
            </p>

            <div className="space-y-6">
              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-2">Comportamiento en POS</label>
                <button 
                  onClick={() => setBarcodeConfig({...barcodeConfig, autoAdd: !barcodeConfig.autoAdd})} 
                  className={`w-full flex items-center justify-between px-6 py-4 rounded-2xl border transition-all active:scale-[0.98] ${
                    barcodeConfig.autoAdd 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 lya:bg-lya-primary/10 lya:border-lya-primary/30 lya:text-lya-primary' 
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 lya:bg-lya-bg lya:border-lya-border/40'
                  }`}
                >
                  <span className="text-sm font-bold">Añadir al carrito automáticamente</span>
                  <div className={`w-12 h-7 rounded-full flex items-center p-1 transition-colors ${barcodeConfig.autoAdd ? 'bg-blue-500 lya:bg-lya-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${barcodeConfig.autoAdd ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-2">Área de Prueba del Lector</label>
                <input 
                  type="text" 
                  value={lastScanned} 
                  onChange={e => setLastScanned(e.target.value)} 
                  placeholder="Haz clic aquí y dispara el láser..." 
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm font-mono" 
                />
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/20 shrink-0">
          <button 
            onClick={saveSettingsToDB} 
            disabled={loading} 
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 bg-gray-900 hover:bg-black dark:bg-emerald-500 dark:hover:bg-emerald-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-2xl text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
          >
            {loading ? (
              <><Loader2 className="animate-spin" size={20} /> Guardando...</>
            ) : (
              <><Save size={20} /> Guardar Configuración</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};