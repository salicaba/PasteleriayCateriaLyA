// src/modules/cafeteria/views/QrControlPage.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, RefreshCw, Trash2, Smartphone, 
  Link as LinkIcon, LayoutGrid, ShoppingBag, Printer, Plus, X, Loader2, ScanLine,
  CheckCircle2, AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useQrController } from '../controllers/useQrController';

export const QrControlPage = () => {
  const { 
    mesas, isLoading, isAdding, removingId, toast,
    zonas, zonaActiva, setZonaActiva, 
    addMesa, removeMesa 
  } = useQrController();

  const [previewMesa, setPreviewMesa] = useState(null);
  const [mesaToDelete, setMesaToDelete] = useState(null); 

  const isPageLoading = (isLoading && mesas.length === 0) || !zonas;
  
  // ==========================================
  // PANTALLA DE CARGA ANIMADA NEO-BENTO
  // ==========================================
  if (isPageLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-800"
        >
          <ScanLine size={40} className="text-orange-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Control QR
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-orange-500 lya:text-lya-primary" /> Sincronizando accesos y zonas...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 overflow-hidden relative print:bg-white"
    >
      
      {/* NOTIFICACIÓN FLOTANTE (ESTILO INVENTARIO) */}
      <AnimatePresence>
        {toast?.show && (
          <div className="fixed top-8 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4">
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface text-gray-800 dark:text-white lya:text-lya-text px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-bold border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 pointer-events-auto"
            >
              <div className={`p-1.5 rounded-full shrink-0 ${
                toast.type === 'error' 
                  ? 'bg-red-100 dark:bg-red-500/20 text-red-500' 
                  : 'bg-emerald-100 dark:bg-emerald-500/20 lya:bg-lya-primary/20 text-emerald-500 lya:text-lya-primary'
              }`}>
                {toast.type === 'error' ? (
                  <AlertCircle size={20} />
                ) : (
                  <CheckCircle2 size={20} />
                )}
              </div>
              <div className="flex flex-col">
                  <span className="text-sm">{toast.message}</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; }
          html, body, #root, main { background-color: #ffffff !important; color: #000000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          aside, header.h-16 { display: none !important; }
          .no-print { display: none !important; }
          
          .print-card {
            background-color: #ffffff !important;
            max-width: 10.5cm !important;
            margin: 2cm auto !important;
            box-shadow: none !important;
            border: 2px dashed #9ca3af !important; 
            border-radius: 12px !important;
            padding: 2rem !important; 
            text-align: center !important;
            page-break-inside: avoid;
          }
        }
      `}} />

      <header className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10 relative">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 lya:shadow-lya-primary/20">
            <ScanLine size={28} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white lya:text-lya-text tracking-tight">
              Control QR
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">
              Maestro de mesas y accesos remotos
            </p>
          </div>
        </div>
      </header>

      <div className="no-print flex flex-wrap items-center justify-between gap-4 mb-6 shrink-0 z-10">
        <div className="flex gap-2 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/20 p-1 rounded-2xl overflow-x-auto">
          {zonas.map(zona => (
            <button
              key={zona.id}
              onClick={() => setZonaActiva(zona.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                zonaActiva === zona.id 
                  ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-orange-500 lya:text-lya-primary shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-300 lya:hover:text-lya-text'
              }`}
            >
              {zona.id === 'salon' ? <LayoutGrid size={18} /> : <ShoppingBag size={18} />}
              {zona.label}
            </button>
          ))}
        </div>

        {zonaActiva === 'salon' && (
          <button 
            onClick={addMesa}
            disabled={isAdding}
            className="flex items-center gap-2 bg-gray-900 dark:bg-orange-600 hover:bg-gray-800 dark:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-5 py-2.5 rounded-xl font-bold transition-colors shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isAdding ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
            <span>{isAdding ? 'Procesando...' : 'Agregar Mesa'}</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar pr-2 pb-24 relative">
        <AnimatePresence mode='wait'>
          {zonaActiva === 'salon' ? (
            <motion.div 
              key="salon" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className={`grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6 items-start auto-rows-max ${previewMesa ? 'no-print' : ''}`}
            >
              <AnimatePresence mode='popLayout'>
                {mesas.map((mesa) => (
                  <motion.div 
                    key={mesa.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="w-full max-w-[300px] mx-auto md:mx-0 bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 p-6 rounded-3xl shadow-sm relative group overflow-hidden flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 dark:bg-orange-500/10 lya:bg-lya-secondary/10 p-3 rounded-2xl">
                          <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400 lya:text-lya-secondary" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text">Mesa {mesa.number}</h3>
                      </div>
                      <button 
                        onClick={() => setMesaToDelete(mesa)}
                        disabled={removingId === mesa.id}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 lya:text-lya-text/40 lya:hover:text-red-500 lya:hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Eliminar Mesa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    <div className="w-full bg-white rounded-2xl flex items-center justify-center py-6 mb-4 border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 transition-colors">
                       <QRCodeSVG 
                         value={`https://lya.menu/m/${mesa.number}`} 
                         size={110} 
                         bgColor="#ffffff" 
                         fgColor="#000000" 
                         level="Q"
                       />
                    </div>
                    
                    <div className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg p-3 rounded-xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 mb-4 group-hover:border-orange-500/30 lya:group-hover:border-lya-secondary/50 transition-colors">
                      <LinkIcon className="w-4 h-4 text-gray-500 lya:text-lya-text/50 shrink-0" />
                      <a 
                        href={`https://lya.menu/m/${mesa.number}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-sm text-gray-600 dark:text-gray-300 lya:text-lya-text/80 truncate hover:text-orange-500 dark:hover:text-orange-400 lya:hover:text-lya-secondary transition-colors font-medium outline-none"
                      >
                        lya.menu/m/{mesa.number}
                      </a>
                    </div>
                    
                    <button 
                      onClick={() => setPreviewMesa(mesa)}
                      className="w-full mt-auto py-2.5 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 lya:bg-lya-primary/10 lya:hover:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <QrCode size={18} /> Mostrar QR
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {mesas.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="col-span-full py-20 flex flex-col items-center justify-center w-full text-gray-400 lya:text-lya-text/50"
                >
                  <LayoutGrid size={48} className="mb-4 opacity-20" />
                  <p className="font-medium text-lg">No hay mesas en el sistema.</p>
                  <button onClick={addMesa} disabled={isAdding} className="mt-2 text-orange-500 lya:text-lya-primary font-bold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed">
                    {isAdding ? 'Agregando...' : 'Agregar Mesa'}
                  </button>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="llevar" 
              initial={{ opacity: 0, x: 20 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -20 }}
              className={`flex justify-center print:fixed print:inset-0 print:items-start print:bg-white ${previewMesa ? 'no-print' : ''}`}
            >
              <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 rounded-3xl p-8 max-w-[340px] w-full shadow-xl flex flex-col items-center text-center print-card print:bg-white">
                
                <div className="no-print bg-orange-500/10 lya:bg-lya-secondary/10 p-4 rounded-full mb-4">
                  <Smartphone className="w-10 h-10 text-orange-500 lya:text-lya-secondary" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white lya:text-lya-text mb-2 print:text-black text-3xl print:mb-4">Mostrador 𝓛𝔂𝓪</h2>
                
                <p className="no-print text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-sm mb-6">QR único para que los clientes en fila puedan escanear el menú.</p>
                
                <div className="hidden print:block mb-8 px-2">
                  <p className="text-xl font-bold italic print:text-black mb-2">"Evita la fila..."</p>
                  <p className="text-sm print:text-gray-800">Ordena desde tu celular.</p>
                </div>

                <div className="w-full bg-white rounded-2xl flex items-center justify-center py-8 mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700 lya:border-lya-border/40 print:py-8 print:bg-white print:border-none">
                   <QRCodeSVG 
                     value="https://lya.menu/llevar" 
                     size={140} 
                     bgColor="#ffffff" 
                     fgColor="#000000" 
                     level="Q"
                   />
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg p-3 w-full rounded-xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 mb-6 print:bg-white print:border-none">
                  <LinkIcon className="no-print w-4 h-4 text-gray-500 lya:text-lya-text/50 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300 lya:text-lya-text/80 truncate font-medium print:text-black print:text-lg">
                    lya.menu/llevar
                  </span>
                </div>

                <button 
                  onClick={() => setPreviewMesa({ isLlevar: true })}
                  className="w-full mt-auto py-2.5 bg-orange-50 dark:bg-orange-500/10 hover:bg-orange-100 dark:hover:bg-orange-500/20 lya:bg-lya-primary/10 lya:hover:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 no-print"
                >
                  <QrCode size={18} /> Mostrar QR
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {previewMesa && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPreviewMesa(null)}
              className="absolute inset-0 bg-black/50 dark:bg-black/80 lya:bg-lya-text/60 backdrop-blur-sm no-print"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2rem] shadow-2xl relative z-10 w-full max-w-[340px] flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/20 print-card print:bg-white"
            >
              <button 
                onClick={() => setPreviewMesa(null)} 
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 dark:hover:text-white bg-gray-100 dark:bg-gray-800 lya:text-lya-text/40 lya:hover:text-lya-text lya:bg-lya-bg p-2 rounded-full transition-colors no-print"
              >
                <X size={20} />
              </button>
              
              <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:bg-lya-secondary/10 lya:text-lya-secondary px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase mb-4 mt-2 no-print">
                Escanear para ordenar
              </div>
              
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white lya:text-lya-text mb-6 print:text-black print:text-4xl print:mb-4">
                {previewMesa.isLlevar ? 'Mostrador 𝓛𝔂𝓪' : `Mesa ${previewMesa.number}`}
              </h2>
              
              <div className="hidden print:block mb-6 px-2">
                 <p className="text-xl font-bold italic print:text-black mb-2">
                   {previewMesa.isLlevar ? '"Evita la fila..."' : '"Un dulce momento te espera..."'}
                 </p>
                 <p className="text-sm print:text-gray-800">
                   {previewMesa.isLlevar 
                     ? 'Ordena desde tu celular para retirar en mostrador.' 
                     : 'Escanea el código con tu celular para ordenar a tu mesa.'}
                 </p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-inner border border-gray-200 lya:border-lya-border/30 mb-6 flex items-center justify-center w-full print:bg-white print:border-none print:shadow-none print:p-0">
                <QRCodeSVG 
                   value={previewMesa.isLlevar ? 'https://lya.menu/llevar' : `https://lya.menu/m/${previewMesa.number}`}
                   size={200} 
                   bgColor="#ffffff" 
                   fgColor="#000000" 
                   level="Q"
                />
              </div>

              <div className="w-full bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-3 rounded-xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/20 mb-6 print:bg-white print:border-none">
                <LinkIcon className="w-4 h-4 text-gray-500 lya:text-lya-text/50 shrink-0 no-print" />
                <span className="text-sm text-gray-600 dark:text-gray-300 lya:text-lya-text/80 font-medium print:text-black print:text-lg">
                  {previewMesa.isLlevar ? 'lya.menu/llevar' : `lya.menu/m/${previewMesa.number}`}
                </span>
              </div>

              <button 
                onClick={() => window.print()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white lya:bg-lya-primary lya:hover:bg-lya-primary/90 lya:text-lya-surface py-3.5 rounded-2xl font-bold transition-colors shadow-lg shadow-orange-500/20 lya:shadow-lya-primary/20 flex items-center justify-center gap-2 no-print"
              >
                <Printer size={20} /> Imprimir QR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN CON ESTADOS DE CARGA */}
      <AnimatePresence>
        {mesaToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => {
                if (removingId !== mesaToDelete.id) setMesaToDelete(null);
              }}
              className="absolute inset-0 bg-black/50 dark:bg-black/80 lya:bg-lya-text/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2rem] shadow-2xl relative z-10 w-full max-w-[340px] flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/20"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-500 lya:bg-red-500/20 mx-auto rounded-full flex items-center justify-center mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white lya:text-lya-text mb-2">
                ¿Eliminar Mesa {mesaToDelete.number}?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium text-sm mb-8">
                Esta acción no se puede deshacer. Las demás mesas se reordenarán automáticamente.
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={() => setMesaToDelete(null)}
                  disabled={removingId === mesaToDelete.id}
                  className="flex-1 py-3.5 bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/30 text-gray-700 dark:text-gray-300 lya:text-lya-text rounded-2xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    const success = await removeMesa(mesaToDelete.id);
                    if (success) {
                      setMesaToDelete(null);
                    }
                  }} 
                  disabled={removingId === mesaToDelete.id}
                  className="flex-1 py-3.5 bg-red-500 hover:bg-red-600 disabled:bg-red-400 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-red-500/20 lya:shadow-red-500/10 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
                >
                  {removingId === mesaToDelete.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span>Eliminando...</span>
                    </>
                  ) : (
                    <span>Eliminar</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};

export default QrControlPage;