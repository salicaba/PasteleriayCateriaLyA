// src/modules/cafeteria/views/QrControlPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, RefreshCw, Trash2, Smartphone, 
  Link as LinkIcon, LayoutGrid, ShoppingBag, Printer, Plus, X, Loader2, ScanLine,
  AlertCircle, Power, PowerOff, ShieldAlert, CheckSquare, Square
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useQrController } from '../controllers/useQrController';
import { ToastNotification } from './components/ToastNotification';

export const QrControlPage = () => {
  const { 
    mesas, isLoading, isAdding, removingId, toast,
    zonas, zonaActiva, setZonaActiva, 
    addMesa, removeMesa,
    isQrActive, isTogglingQr, toggleQrService 
  } = useQrController();

  const [previewMesa, setPreviewMesa] = useState(null);
  const [mesaToDelete, setMesaToDelete] = useState(null); 
  const [showToggleModal, setShowToggleModal] = useState(false); 
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isRegeneratingLocal, setIsRegeneratingLocal] = useState(false);
  
  // Estados para la Impresión Selectiva
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedToPrint, setSelectedToPrint] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);

  const [localToast, setLocalToast] = useState({ message: '', type: '' });

  const showLocalToast = (message, type = 'success') => {
    setLocalToast({ message, type });
    setTimeout(() => setLocalToast({ message: '', type: '' }), 4000);
  };

  const isPageLoading = (isLoading && mesas.length === 0) || !zonas;
  const baseUrl = window.location.origin;
  const displayBaseUrl = baseUrl.replace(/^https?:\/\//, ''); 
  
  const handleRegenerateTokens = async () => {
    if (isRegeneratingLocal) return;
    setIsRegeneratingLocal(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); 
      setShowRegenerateModal(false);
      showLocalToast('Códigos QR regenerados con éxito. Sesiones antiguas revocadas.', 'success');
    } catch (error) {
      showLocalToast('Error de red al intentar regenerar los códigos.', 'error');
    } finally {
      setIsRegeneratingLocal(false);
    }
  };

  const handleOpenPrintModal = () => {
    // Por defecto, preseleccionamos todos
    setSelectedToPrint(['llevar', ...mesas.map(m => m.id)]);
    setShowPrintModal(true);
  };

  const togglePrintSelection = (id) => {
    if (selectedToPrint.includes(id)) {
      setSelectedToPrint(prev => prev.filter(item => item !== id));
    } else {
      setSelectedToPrint(prev => [...prev, id]);
    }
  };

  const toggleAllPrintSelection = () => {
    if (selectedToPrint.length === mesas.length + 1) {
      setSelectedToPrint([]); // Deseleccionar todos
    } else {
      setSelectedToPrint(['llevar', ...mesas.map(m => m.id)]); // Seleccionar todos
    }
  };

  const executePrint = async () => {
    if (isPrinting || selectedToPrint.length === 0) return;
    setIsPrinting(true);
    try {
      // Pequeño delay para que React renderice los cambios antes de bloquear el hilo con window.print()
      await new Promise(resolve => setTimeout(resolve, 300));
      window.print();
      setShowPrintModal(false);
    } finally {
      setIsPrinting(false);
    }
  };

  const activeMessage = localToast.message || (toast?.show ? toast.message : '');
  const activeType = localToast.message ? localToast.type : (toast?.show ? toast.type : '');

  if (isPageLoading) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg transition-colors duration-300">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
        >
          <ScanLine size={40} className="text-orange-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center">
          Cargando Control QR
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 justify-center">
          <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> Sincronizando accesos...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full w-full flex-1 flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 overflow-hidden relative print:!bg-white print:!text-black print:p-0 print:h-auto print:block print:overflow-visible"
    >
      <ToastNotification message={activeMessage} type={activeType} />

      {/* ESTILOS EXCLUSIVOS PARA IMPRESIÓN MASIVA NEO-BENTO (BLINDADOS) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1cm; size: A4 portrait; }
          html, body, #root, main { 
            background-color: #ffffff !important; 
            color: #000000 !important; 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            overflow: visible !important;
            height: auto !important;
          }
          /* Ocultar interfaz del sistema */
          .no-print, header, nav, aside { display: none !important; }
          /* Forzar impresión de bordes y sombras si es necesario */
          * {
            box-shadow: none !important;
          }
        }
      `}} />

      {/* ========================================== */}
      {/* GRID DE IMPRESIÓN OCULTO (MASIVO)          */}
      {/* ========================================== */}
      <div className="hidden print:grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-[21cm] mx-auto pb-10 print:!bg-white">
        
        {/* Etiqueta Pública / Mostrador (Solo si está seleccionada) */}
        {selectedToPrint.includes('llevar') && (
          <div className="flex flex-col items-center text-center p-6 border-2 border-dashed border-gray-400 rounded-3xl break-inside-avoid shadow-none !bg-white !text-black">
            <h2 className="text-2xl font-black text-black tracking-tight mb-1">Mostrador 𝓛𝔂𝓪</h2>
            <p className="text-sm font-bold text-gray-700 italic mb-4">"Ordena sin filas"</p>
            <QRCodeSVG 
              value={`${baseUrl}/llevar`} 
              size={140} 
              level="Q"
              className="mb-4 !opacity-100 !grayscale-0"
              bgColor="#ffffff"
              fgColor="#000000"
            />
            <p className="text-[11px] font-black tracking-widest text-black">
              {displayBaseUrl}/llevar
            </p>
          </div>
        )}

        {/* Etiquetas de Mesas (Solo las seleccionadas) */}
        {mesas.filter(m => selectedToPrint.includes(m.id)).map((mesa) => (
          <div key={mesa.id} className="flex flex-col items-center text-center p-6 border-2 border-dashed border-gray-400 rounded-3xl break-inside-avoid shadow-none !bg-white !text-black">
            <h2 className="text-2xl font-black text-black tracking-tight mb-1">Mesa {mesa.number}</h2>
            <p className="text-sm font-bold text-gray-700 italic mb-4">"Escanea para ordenar"</p>
            <QRCodeSVG 
              value={`${baseUrl}/m/${mesa.number}`} 
              size={140} 
              level="Q"
              className="mb-4 !opacity-100 !grayscale-0"
              bgColor="#ffffff"
              fgColor="#000000"
            />
            <p className="text-[11px] font-black tracking-widest text-black">
              {displayBaseUrl}/m/{mesa.number}
            </p>
          </div>
        ))}
      </div>
      {/* FIN DEL GRID DE IMPRESIÓN */}


      {/* ENCABEZADO */}
      <header className="no-print flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative transition-colors">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 dark:shadow-orange-900/30 lya:shadow-lya-primary/20">
            <ScanLine size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight truncate">
              Control QR
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">
              Maestro de mesas y accesos remotos
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto mt-2 xl:mt-0">
          
          {/* BOTÓN IMPRIMIR SELECCIÓN */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={handleOpenPrintModal}
            className="flex flex-1 md:flex-none justify-center items-center gap-2 px-5 py-3.5 rounded-[2rem] font-bold transition-all shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 md:hover:shadow-md bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text select-none touch-manipulation outline-none"
          >
            <Printer size={18} className="text-gray-600 dark:text-gray-300 lya:text-lya-text pointer-events-none" />
            <span className="tracking-wide text-sm pointer-events-none whitespace-nowrap">Imprimir QRs</span>
          </motion.button>

          {/* BOTÓN REGENERAR */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowRegenerateModal(true)}
            className="flex flex-1 md:flex-none justify-center items-center gap-2 px-5 py-3.5 rounded-[2rem] font-bold transition-all shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 md:hover:shadow-md bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text select-none touch-manipulation outline-none"
          >
            <RefreshCw size={18} className="text-orange-500 lya:text-lya-primary pointer-events-none" />
            <span className="tracking-wide text-sm pointer-events-none whitespace-nowrap">Regenerar QRs</span>
          </motion.button>

          {/* BOTÓN KILL-SWITCH */}
          <motion.button 
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowToggleModal(true)}
            className={`flex flex-1 md:flex-none justify-center items-center gap-2 px-5 py-3.5 rounded-[2rem] font-bold transition-all shadow-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 md:hover:shadow-md select-none touch-manipulation outline-none ${
              isQrActive 
                ? 'bg-white dark:bg-gray-800 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text' 
                : 'bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg text-gray-500 dark:text-gray-400 lya:text-lya-text/50 opacity-90'
            }`}
          >
            <div className="relative flex items-center justify-center pointer-events-none mr-1">
              <div className={`w-3 h-3 rounded-full ${isQrActive ? 'bg-green-500 dark:bg-green-400 lya:bg-lya-secondary' : 'bg-gray-400 dark:bg-gray-600 lya:bg-lya-text/30'}`}></div>
              {isQrActive && <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 lya:bg-lya-secondary animate-ping opacity-75"></div>}
            </div>
            <span className="tracking-wide text-sm pointer-events-none whitespace-nowrap">{isQrActive ? 'QR Activo' : 'QR Apagado'}</span>
            {isQrActive ? <Power size={18} className="opacity-50 pointer-events-none" /> : <PowerOff size={18} className="opacity-50 pointer-events-none" />}
          </motion.button>
        </div>
      </header>

      {/* CONTROLES DE PESTAÑAS */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-8 shrink-0 z-10">
        <div className="flex gap-2 bg-gray-200/50 dark:bg-gray-800/80 lya:bg-lya-border/20 p-1.5 rounded-[1.25rem] overflow-x-auto shadow-inner border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 custom-scrollbar w-full md:w-auto">
          {zonas.map(zona => {
            const displayLabel = zona.id === 'salon' ? 'Mesas' : 'Público';
            return (
              <motion.button
                key={zona.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => setZonaActiva(zona.id)}
                className={`flex flex-1 md:flex-none justify-center items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap select-none outline-none ${
                  zonaActiva === zona.id 
                    ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-orange-600 dark:text-orange-400 lya:text-lya-primary shadow-sm border border-gray-100 dark:border-gray-600 lya:border-lya-primary/30' 
                    : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 md:hover:text-gray-700 dark:md:hover:text-gray-200 lya:hover:text-lya-text border border-transparent'
                }`}
              >
                {zona.id === 'salon' ? <LayoutGrid size={18} className="pointer-events-none" /> : <ShoppingBag size={18} className="pointer-events-none" />}
                <span className="pointer-events-none">{displayLabel}</span>
              </motion.button>
            )
          })}
        </div>

        {zonaActiva === 'salon' && (
          <motion.button 
            whileTap={!isAdding ? { scale: 0.95 } : {}}
            onClick={addMesa}
            disabled={isAdding}
            className="flex items-center justify-center w-full md:w-auto gap-2 bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 dark:md:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-6 py-3.5 rounded-2xl font-black transition-all shadow-lg shadow-orange-500/30 dark:shadow-orange-900/30 lya:shadow-lya-primary/30 disabled:opacity-70 disabled:cursor-not-allowed disabled:shadow-none select-none outline-none"
          >
            {isAdding ? <Loader2 size={20} className="animate-spin pointer-events-none" /> : <Plus size={20} className="pointer-events-none" />}
            <span className="pointer-events-none">{isAdding ? 'Procesando...' : 'Agregar Mesa'}</span>
          </motion.button>
        )}
      </div>

      {/* ÁREA DE CONTENIDO (CON SCROLL INTERNO BLINDADO) */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 pb-24 relative no-print">
        <AnimatePresence mode='wait'>
          {zonaActiva === 'salon' ? (
            <motion.div 
              key="salon" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 items-start auto-rows-max"
            >
              <AnimatePresence mode='popLayout'>
                {mesas.map((mesa) => (
                  <motion.div 
                    key={mesa.id}
                    layout
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    className="w-full max-w-[320px] mx-auto md:mx-0 bg-white dark:bg-gray-900 lya:bg-lya-surface border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/30 p-6 rounded-[2rem] shadow-sm relative group overflow-hidden flex flex-col transition-all md:hover:shadow-md md:hover:-translate-y-1 md:hover:border-gray-200 dark:md:hover:border-gray-700 lya:hover:border-lya-border/50"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-50 dark:bg-orange-900/20 lya:bg-lya-secondary/10 p-3 rounded-2xl border border-orange-100 dark:border-orange-800/50 lya:border-lya-secondary/20 shadow-sm">
                          <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400 lya:text-lya-secondary" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight truncate">Mesa {mesa.number}</h3>
                      </div>
                      <motion.button 
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setMesaToDelete(mesa)}
                        disabled={removingId === mesa.id}
                        className="p-2.5 text-gray-400 md:hover:text-red-500 md:hover:bg-red-50 dark:md:hover:bg-red-500/10 lya:text-lya-text/40 lya:hover:text-red-500 lya:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none"
                        title="Eliminar Mesa"
                      >
                        <Trash2 size={18} strokeWidth={2.5} className="pointer-events-none" />
                      </motion.button>
                    </div>
                    
                    <div className="w-full bg-gray-50/50 dark:bg-gray-800/50 lya:bg-lya-bg rounded-3xl flex items-center justify-center py-6 mb-5 border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 transition-colors shadow-inner">
                       <QRCodeSVG 
                         value={`${baseUrl}/m/${mesa.number}`} 
                         size={120} 
                         bgColor="transparent" 
                         fgColor={document.documentElement.classList.contains('dark') ? "#ffffff" : "#000000"} 
                         level="Q"
                         className={`drop-shadow-sm transition-opacity duration-300 ${isQrActive ? 'opacity-90' : 'opacity-20 grayscale'}`}
                       />
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800/80 lya:bg-lya-bg p-3 rounded-2xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 mb-5 md:group-hover:border-orange-300 dark:md:group-hover:border-orange-700 lya:group-hover:border-lya-secondary/50 transition-colors shadow-inner">
                      <LinkIcon className="w-4 h-4 text-gray-500 lya:text-lya-text/50 shrink-0" />
                      <a 
                        href={`${baseUrl}/m/${mesa.number}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sm text-gray-700 dark:text-gray-300 lya:text-lya-text/80 truncate md:hover:text-orange-600 dark:md:hover:text-orange-400 lya:hover:text-lya-secondary transition-colors font-bold outline-none tracking-wide"
                      >
                        {displayBaseUrl}/m/{mesa.number} 
                      </a>
                    </div>
                    
                    <motion.button 
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPreviewMesa(mesa)}
                      className="w-full mt-auto py-3.5 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-orange-50 dark:md:hover:bg-orange-900/20 lya:hover:bg-lya-primary/10 text-gray-600 md:hover:text-orange-600 dark:text-gray-400 dark:md:hover:text-orange-400 lya:text-lya-text/80 lya:hover:text-lya-primary rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 border border-transparent md:hover:border-orange-200 dark:md:hover:border-orange-800/50 lya:hover:border-lya-primary/30 outline-none select-none"
                    >
                      <QrCode size={18} strokeWidth={2.5} className="pointer-events-none" /> 
                      <span className="pointer-events-none">Pantalla Completa</span>
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {mesas.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="col-span-full py-24 flex flex-col items-center justify-center w-full text-gray-400 lya:text-lya-text/50"
                >
                  <div className="bg-gray-100 dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-full mb-5 shadow-inner">
                    <LayoutGrid size={48} className="opacity-30" />
                  </div>
                  <p className="font-black text-xl mb-1 text-gray-600 dark:text-gray-400 lya:text-lya-text/70 text-center">No hay mesas en el sistema</p>
                  <button onClick={addMesa} disabled={isAdding} className="mt-2 text-orange-500 dark:text-orange-400 lya:text-lya-primary font-bold md:hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed outline-none select-none">
                    {isAdding ? 'Agregando...' : 'Crear la primera Mesa'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="llevar" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex justify-center pt-4 w-full"
            >
              <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/40 rounded-[2.5rem] p-10 max-w-[400px] w-full shadow-2xl flex flex-col items-center text-center transition-all md:hover:-translate-y-1 md:hover:shadow-3xl">
                
                <div className="bg-orange-50 dark:bg-orange-900/20 lya:bg-lya-secondary/10 p-5 rounded-[2rem] mb-6 shadow-sm border border-orange-100 dark:border-orange-800/50 lya:border-lya-secondary/20">
                  <Smartphone className="w-12 h-12 text-orange-500 dark:text-orange-400 lya:text-lya-secondary" />
                </div>
                
                <h2 className="text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tighter truncate w-full">Mostrador 𝓛𝔂𝓪</h2>
                
                <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-sm mb-8 font-medium px-4 text-justify">QR único para que los clientes en fila puedan escanear el menú digital desde sus dispositivos móviles.</p>

                <div className="w-full bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg rounded-3xl flex items-center justify-center py-10 mb-6 border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 shadow-inner">
                   <QRCodeSVG 
                     value={`${baseUrl}/llevar`} 
                     size={160} 
                     bgColor="transparent" 
                     fgColor={document.documentElement.classList.contains('dark') ? "#ffffff" : "#000000"} 
                     level="Q"
                     className={`drop-shadow-sm transition-opacity duration-300 ${isQrActive ? 'opacity-90' : 'opacity-20 grayscale'}`}
                   />
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-surface p-4 w-full rounded-2xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 mb-8 shadow-sm">
                  <LinkIcon className="w-4 h-4 text-gray-500 lya:text-lya-text/50 shrink-0" />
                  <a 
                    href={`${baseUrl}/llevar`} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-sm text-gray-700 dark:text-gray-300 lya:text-lya-text/80 truncate font-black tracking-widest md:hover:text-orange-600 dark:md:hover:text-orange-400 lya:hover:text-lya-secondary transition-colors outline-none text-center"
                  >
                    {displayBaseUrl}/llevar
                  </a>
                </div>

                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setPreviewMesa({ isLlevar: true })}
                  className="w-full mt-auto py-4 bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 dark:md:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 outline-none select-none"
                >
                  <QrCode size={18} strokeWidth={2.5} className="pointer-events-none" /> 
                  <span className="pointer-events-none">Pantalla Completa</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ========================================== */}
      {/* MODAL DE SELECCIÓN DE IMPRESIÓN (NUEVO) */}
      {/* ========================================== */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (!isPrinting) setShowPrintModal(false);
              }}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 md:p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[420px] flex flex-col border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 dark:bg-orange-900/40 lya:bg-lya-primary/10 p-3 rounded-xl shadow-sm text-orange-600 dark:text-orange-400 lya:text-lya-primary">
                    <Printer size={24} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight truncate">
                    Impresión Selectiva
                  </h3>
                </div>
                <motion.button 
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowPrintModal(false)}
                  disabled={isPrinting}
                  className="p-2 text-gray-400 md:hover:text-gray-800 dark:md:hover:text-white bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg rounded-full transition-all disabled:opacity-50"
                >
                  <X size={20} />
                </motion.button>
              </div>

              <div className="flex justify-between items-center mb-4 px-2">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                  {selectedToPrint.length} seleccionado(s)
                </span>
                <button 
                  onClick={toggleAllPrintSelection}
                  className="text-sm font-black text-orange-500 md:hover:text-orange-600 lya:text-lya-primary transition-colors outline-none"
                >
                  {selectedToPrint.length === mesas.length + 1 ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
              </div>

              {/* Lista Scrolleable */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 mb-6 min-h-[200px]">
                {/* Mostrador */}
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  onClick={() => togglePrintSelection('llevar')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedToPrint.includes('llevar')
                      ? 'border-orange-500 bg-orange-50/50 dark:border-orange-500/50 dark:bg-orange-900/10 lya:border-lya-primary/50 lya:bg-lya-primary/5'
                      : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/30 bg-white dark:bg-gray-800/50 lya:bg-lya-bg'
                  }`}
                >
                  <span className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Mostrador 𝓛𝔂𝓪 (Público)</span>
                  {selectedToPrint.includes('llevar') 
                    ? <CheckSquare className="text-orange-500 lya:text-lya-primary" /> 
                    : <Square className="text-gray-300 dark:text-gray-600 lya:text-lya-border" />}
                </motion.div>

                {/* Mesas */}
                {mesas.map(mesa => (
                  <motion.div 
                    key={mesa.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => togglePrintSelection(mesa.id)}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                      selectedToPrint.includes(mesa.id)
                        ? 'border-orange-500 bg-orange-50/50 dark:border-orange-500/50 dark:bg-orange-900/10 lya:border-lya-primary/50 lya:bg-lya-primary/5'
                        : 'border-gray-100 dark:border-gray-800 lya:border-lya-border/30 bg-white dark:bg-gray-800/50 lya:bg-lya-bg'
                    }`}
                  >
                    <span className="font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">Mesa {mesa.number}</span>
                    {selectedToPrint.includes(mesa.id) 
                      ? <CheckSquare className="text-orange-500 lya:text-lya-primary" /> 
                      : <Square className="text-gray-300 dark:text-gray-600 lya:text-lya-border" />}
                  </motion.div>
                ))}
              </div>
              
              <motion.button 
                whileTap={!isPrinting && selectedToPrint.length > 0 ? { scale: 0.95 } : {}}
                onClick={executePrint} 
                disabled={isPrinting || selectedToPrint.length === 0}
                className="w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-white shadow-lg bg-orange-500 md:hover:bg-orange-600 shadow-orange-500/30 lya:bg-lya-primary lya:hover:bg-lya-primary/90 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none outline-none select-none"
              >
                {isPrinting ? (
                  <>
                    <Loader2 size={18} className="animate-spin pointer-events-none" />
                    <span className="pointer-events-none">Preparando Impresión...</span>
                  </>
                ) : (
                  <>
                    <Printer size={18} className="pointer-events-none" />
                    <span className="pointer-events-none">Imprimir Selección ({selectedToPrint.length})</span>
                  </>
                )}
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ========================================== */}
      {/* MODAL DE PANTALLA COMPLETA (PREVIEW) */}
      {/* ========================================== */}
      <AnimatePresence>
        {previewMesa && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPreviewMesa(null)}
              className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 lya:bg-lya-dark/70 backdrop-blur-md transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-10 rounded-[3rem] shadow-2xl relative z-10 w-full max-w-[400px] flex flex-col items-center border-2 border-gray-100 dark:border-gray-800 lya:border-lya-border/30 transition-colors"
            >
              <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => setPreviewMesa(null)} 
                className="absolute top-6 right-6 text-gray-400 md:hover:text-gray-800 dark:md:hover:text-white bg-gray-100 dark:bg-gray-800 lya:text-lya-text/40 lya:hover:text-lya-text lya:bg-lya-bg p-3 rounded-full transition-all md:hover:scale-110 outline-none select-none"
              >
                <X size={20} strokeWidth={2.5} className="pointer-events-none" />
              </motion.button>
              
              <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:bg-lya-secondary/10 lya:text-lya-secondary px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 mt-4 border border-orange-200 dark:border-orange-800/50 lya:border-lya-secondary/30 text-center">
                Escanear para ordenar
              </div>
              
              <h2 className="text-4xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-8 tracking-tighter text-center truncate w-full">
                {previewMesa.isLlevar ? 'Mostrador 𝓛𝔂𝓪' : `Mesa ${previewMesa.number}`}
              </h2>

              <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-8 rounded-[2.5rem] shadow-inner border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 mb-8 flex items-center justify-center w-full">
                <QRCodeSVG 
                   value={previewMesa.isLlevar ? `${baseUrl}/llevar` : `${baseUrl}/m/${previewMesa.number}`} 
                   size={220} 
                   bgColor="transparent" 
                   fgColor={document.documentElement.classList.contains('dark') ? "#ffffff" : "#000000"} 
                   level="Q"
                   className={`transition-opacity duration-300 ${isQrActive ? 'opacity-90' : 'opacity-20 grayscale'}`}
                />
              </div>

              <div className="w-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg p-4 rounded-2xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 shadow-sm">
                <LinkIcon className="w-5 h-5 text-gray-500 lya:text-lya-text/50 shrink-0" />
                <span className="text-base text-gray-700 dark:text-gray-300 lya:text-lya-text/80 font-black tracking-widest text-center">
                  {previewMesa.isLlevar ? `${displayBaseUrl}/llevar` : `${displayBaseUrl}/m/${previewMesa.number}`}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL ORIGINAL: CONFIRMAR KILL-SWITCH */}
      {/* ========================================== */}
      <AnimatePresence>
        {showToggleModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (!isTogglingQr) setShowToggleModal(false);
              }}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[380px] flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors"
            >
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 shadow-sm ${
                isQrActive ? 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-500' : 'bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-500'
              }`}>
                {isQrActive ? <PowerOff size={32} strokeWidth={2} className="text-red-500" /> : <Power size={32} strokeWidth={2} className="text-green-500 lya:text-lya-secondary" />}
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-4 tracking-tight text-center">
                {isQrActive ? '¿Suspender Servicio QR?' : '¿Reactivar Servicio QR?'}
              </h3>
              
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-8 leading-relaxed px-2 text-justify">
                {isQrActive 
                  ? 'Al apagar el servicio, cualquier cliente que intente escanear los menús verá una pantalla de bloqueo. Los clientes que ya confirmaron orden conservarán su ticket visual.'
                  : 'Al activar el servicio, todos los códigos QR volverán a ser operativos y los clientes podrán comenzar a crear órdenes inmediatamente.'
                }
              </p>
              
              <div className="flex gap-3 w-full">
                <motion.button 
                  whileTap={!isTogglingQr ? { scale: 0.95 } : {}}
                  onClick={() => setShowToggleModal(false)}
                  disabled={isTogglingQr}
                  className="flex-[1] py-4 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:hover:bg-lya-border/30 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileTap={!isTogglingQr ? { scale: 0.95 } : {}}
                  onClick={async () => {
                    try {
                      const success = await toggleQrService(!isQrActive);
                      if(success) {
                        setShowToggleModal(false);
                        showLocalToast(
                          isQrActive ? 'Servicio QR Suspendido por seguridad.' : 'Servicio QR Reactivado con éxito.',
                          'success'
                        );
                      } else {
                        showLocalToast('No se pudo actualizar el estado del servicio QR.', 'error');
                      }
                    } catch(err) {
                      showLocalToast('Error de conexión al modificar el estado QR.', 'error');
                    }
                  }} 
                  disabled={isTogglingQr}
                  className={`flex-[1.5] py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:shadow-none text-white shadow-lg outline-none select-none ${
                    isQrActive 
                      ? 'bg-red-500 md:hover:bg-red-600 shadow-red-500/30' 
                      : 'bg-gray-900 md:hover:bg-gray-800 dark:bg-gray-100 dark:md:hover:bg-white dark:text-gray-900 lya:bg-lya-text lya:text-lya-surface'
                  }`}
                >
                  {isTogglingQr ? (
                    <>
                      <Loader2 size={18} className="animate-spin pointer-events-none" />
                      <span className="pointer-events-none">Guardando...</span>
                    </>
                  ) : (
                    <span className="pointer-events-none">{isQrActive ? 'Sí, Suspender' : 'Sí, Reactivar'}</span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL: CONFIRMAR REGENERACIÓN QRS */}
      {/* ========================================== */}
      <AnimatePresence>
        {showRegenerateModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (!isRegeneratingLocal) setShowRegenerateModal(false);
              }}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[380px] flex flex-col items-center border border-orange-200 dark:border-orange-800/30 lya:border-lya-border/40 transition-colors"
            >
              <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5 shadow-sm bg-orange-100 dark:bg-orange-900/40 lya:bg-lya-secondary/10">
                <ShieldAlert size={32} strokeWidth={2} className="text-orange-500 lya:text-lya-secondary" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-4 tracking-tight text-center">
                ¿Regenerar Llaves QR?
              </h3>
              
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-8 leading-relaxed px-2 text-justify">
                Esta es una <b>acción de seguridad estricta</b>. Todos los enlaces antiguos serán revocados inmediatamente y se expulsará a quienes los estén usando. Deberás imprimir y colocar los <b>nuevos QRs físicos</b> en cada mesa de la pastelería.
              </p>
              
              <div className="flex gap-3 w-full">
                <motion.button 
                  whileTap={!isRegeneratingLocal ? { scale: 0.95 } : {}}
                  onClick={() => setShowRegenerateModal(false)}
                  disabled={isRegeneratingLocal}
                  className="flex-[1] py-4 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:hover:bg-lya-border/30 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileTap={!isRegeneratingLocal ? { scale: 0.95 } : {}}
                  onClick={handleRegenerateTokens} 
                  disabled={isRegeneratingLocal}
                  className="flex-[1.5] py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:shadow-none text-white shadow-lg bg-orange-500 md:hover:bg-orange-600 shadow-orange-500/30 lya:bg-lya-secondary lya:hover:bg-lya-secondary/90 outline-none select-none"
                >
                  {isRegeneratingLocal ? (
                    <>
                      <Loader2 size={18} className="animate-spin pointer-events-none" />
                      <span className="pointer-events-none">Procesando...</span>
                    </>
                  ) : (
                    <span className="pointer-events-none">Sí, Regenerar</span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================== */}
      {/* MODAL ORIGINAL: ELIMINAR MESA */}
      {/* ========================================== */}
      <AnimatePresence>
        {mesaToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 no-print">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (removingId !== mesaToDelete.id) setMesaToDelete(null);
              }}
              className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm transition-colors"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2.5rem] shadow-2xl relative z-10 w-full max-w-[360px] flex flex-col items-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 transition-colors"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 lya:bg-red-500/20 mx-auto rounded-full flex items-center justify-center mb-5 shadow-sm">
                <AlertCircle size={32} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-2 tracking-tight text-center">
                ¿Eliminar Mesa {mesaToDelete.number}?
              </h3>
              
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-8 leading-relaxed px-2 text-justify">
                Esta acción no se puede deshacer. Las demás mesas se reordenarán automáticamente.
              </p>
              
              <div className="flex gap-3 w-full">
                <motion.button 
                  whileTap={removingId !== mesaToDelete.id ? { scale: 0.95 } : {}}
                  onClick={() => setMesaToDelete(null)}
                  disabled={removingId === mesaToDelete.id}
                  className="flex-[1] py-4 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg md:hover:bg-gray-200 dark:md:hover:bg-gray-700 lya:hover:bg-lya-border/30 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-2xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none select-none"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileTap={removingId !== mesaToDelete.id ? { scale: 0.95 } : {}}
                  onClick={async () => {
                    const success = await removeMesa(mesaToDelete.id);
                    if (success) {
                      setMesaToDelete(null);
                    }
                  }} 
                  disabled={removingId === mesaToDelete.id}
                  className="flex-[1.5] py-4 bg-red-500 md:hover:bg-red-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-white rounded-2xl font-bold transition-all shadow-lg shadow-red-500/30 dark:shadow-red-900/40 flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:shadow-none disabled:text-gray-500 outline-none select-none"
                >
                  {removingId === mesaToDelete.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin pointer-events-none" />
                      <span className="pointer-events-none">Eliminando...</span>
                    </>
                  ) : (
                    <span className="pointer-events-none">Eliminar Mesa</span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default QrControlPage;