// src/modules/admin/views/settings-tabs/HardwareTab.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, Wifi, Usb, RefreshCw, AlertCircle, Barcode, Keyboard, Save, Loader2 } from 'lucide-react';
import client from '../../../../api/client';

export const HardwareTab = ({ showNotification }) => {
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

  // ==========================================
  // PANTALLA DE CARGA ANIMADA NEO-BENTO (Centrada Absoluta)
  // ==========================================
  if (fetching) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg z-10 transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-700 lya:border-lya-border/40"
        >
          <Printer size={40} className="text-gray-900 dark:text-white lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Hardware
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-gray-900 dark:text-white lya:text-lya-primary" /> Sincronizando impresoras y periféricos...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }} 
      className="space-y-6 relative"
    >
      <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex items-center gap-4">
        <div className="bg-gray-900 dark:bg-gray-700 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0"><Printer size={28} /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Administración de dispositivos físicos</h1>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Configuración de impresoras térmicas, lectores y periféricos locales de 𝓛𝔂𝓪</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-900/10 dark:bg-white/10 lya:bg-lya-primary/10 flex items-center justify-center text-gray-900 dark:text-white lya:text-lya-primary shrink-0"><Printer size={20} /></div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Impresora Térmica</h2>
            </div>
            <div className="flex items-center">
              {printerStatus === 'online' && <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-full text-[10px] uppercase font-black tracking-wider"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div> Conectada</div>}
              {printerStatus === 'offline' && <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 text-red-600 rounded-full text-[10px] uppercase font-black tracking-wider"><div className="w-2 h-2 rounded-full bg-red-500"></div> Desconectada</div>}
              {printerStatus === 'unknown' && <div className="flex items-center gap-2 px-3 py-1 bg-gray-500/10 text-gray-500 rounded-full text-[10px] uppercase font-black tracking-wider"><AlertCircle size={12} /> Sin verificar</div>}
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-6 flex-1">Ajusta el puerto de conexión (USB) o IP de red de la miniprinter de tickets.</p>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 lya:text-lya-text/60 block ml-1 mb-2">Medio de Conexión</label>
              <div className="flex bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg rounded-xl p-1.5 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30">
                <button onClick={() => { setPrinterConfig({...printerConfig, type: 'usb'}); setPrinterStatus('unknown'); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${printerConfig.type === 'usb' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm lya:border lya:border-lya-border/30' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-200'}`}><Usb size={16}/> Cable USB</button>
                <button onClick={() => { setPrinterConfig({...printerConfig, type: 'network'}); setPrinterStatus('unknown'); }} className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${printerConfig.type === 'network' ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm lya:border lya:border-lya-border/30' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-200'}`}><Wifi size={16}/> Red / LAN</button>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 lya:text-lya-text/60 block ml-1 mb-2">{printerConfig.type === 'network' ? 'Dirección IP de la Impresora' : 'Puerto USB Detectado'}</label>
              <div className="flex gap-2">
                {printerConfig.type === 'usb' && detectedPorts.length > 0 ? (
                  <select value={printerConfig.interface} onChange={e => { setPrinterConfig({...printerConfig, interface: e.target.value}); setPrinterStatus('unknown'); }} className="flex-1 px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm font-bold">
                    {detectedPorts.map(port => <option key={port} value={port}>{port}</option>)}
                  </select>
                ) : (
                  <input type="text" value={printerConfig.interface} onChange={e => { setPrinterConfig({...printerConfig, interface: e.target.value}); setPrinterStatus('unknown'); }} placeholder={printerConfig.type === 'network' ? "Ej. 192.168.1.100" : "Ingresa puerto o escanea"} className="flex-1 px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-orange-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm font-mono" />
                )}
                {printerConfig.type === 'usb' && <button onClick={scanPrinters} disabled={isScanning} className="px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 lya:bg-lya-primary/10 lya:hover:bg-lya-primary/20 lya:text-lya-primary rounded-2xl font-bold flex items-center justify-center transition-colors disabled:opacity-50">{isScanning ? <Loader2 className="animate-spin" size={20}/> : <RefreshCw size={20} />}</button>}
              </div>
            </div>

            <div className="pt-2">
              <button onClick={handleTestPrint} disabled={isTestingPrint} className="w-full py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-600 dark:text-gray-300 lya:text-lya-text font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 active:scale-[0.98] disabled:opacity-50">
                {isTestingPrint ? <><Loader2 className="animate-spin" size={16}/> Espere...</> : <><Printer size={16}/> Realizar Prueba de Conexión</>}
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><Barcode size={20} /></div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Lector de Códigos</h2>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-600 rounded-full text-[10px] uppercase font-black tracking-wider"><Keyboard size={12} /> Plug & Play</div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-6 flex-1">Los lectores láser estándar emulan un teclado. Configura su comportamiento al escanear productos físicos.</p>

          <div className="space-y-5">
            <div>
              <label className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 lya:text-lya-text/60 block ml-1 mb-2">Comportamiento en POS</label>
              <button onClick={() => setBarcodeConfig({...barcodeConfig, autoAdd: !barcodeConfig.autoAdd})} className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all ${barcodeConfig.autoAdd ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400 lya:bg-lya-primary/10 lya:border-lya-primary/30 lya:text-lya-primary' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'}`}>
                <span className="text-sm font-bold">Añadir al carrito automáticamente</span>
                <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${barcodeConfig.autoAdd ? 'bg-blue-500 lya:bg-lya-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${barcodeConfig.autoAdd ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
              </button>
            </div>

            <div>
              <label className="text-xs font-black uppercase text-gray-500 dark:text-gray-400 lya:text-lya-text/60 block ml-1 mb-2">Área de Prueba del Lector</label>
              <input type="text" value={lastScanned} onChange={e => setLastScanned(e.target.value)} placeholder="Haz clic aquí y dispara el láser..." className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white text-sm font-mono" />
            </div>
          </div>
        </section>
      </div>

      <div className="flex justify-end mt-4">
        <button onClick={saveSettingsToDB} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black dark:bg-orange-500 dark:hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50">
          {loading ? <><Loader2 className="animate-spin" size={18} /> Espere...</> : <><Save size={18} /> Guardar Hardware</>}
        </button>
      </div>
    </motion.div>
  );
};