import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  QrCode, RefreshCw, Trash2, Smartphone, 
  Link as LinkIcon, LayoutGrid, ShoppingBag, Printer, Plus, X 
} from 'lucide-react';
import { useQrController } from '../controllers/useQrController';

export const QrControlPage = () => {
  const { 
    mesas, isLoading, 
    zonas, zonaActiva, setZonaActiva, 
    addMesa, removeMesa 
  } = useQrController();

  const [previewMesa, setPreviewMesa] = useState(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full lya:bg-lya-bg">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500 lya:text-lya-primary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg p-4 md:p-8 transition-colors duration-300 overflow-hidden relative print:bg-white">
      
      {/* MAGIA CSS PARA IMPRESIÓN REFORZADA CON LÍNEA DE RECORTE */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 0; }
          html, body, #root, main { background-color: #ffffff !important; color: #000000 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          aside, header.h-16 { display: none !important; }
          .no-print { display: none !important; }
          
          /* Estructura del Ticket con Borde de Recorte */
          .print-card {
            background-color: #ffffff !important;
            max-width: 10.5cm !important;
            margin: 2cm auto !important;
            box-shadow: none !important;
            border: 2px dashed #9ca3af !important; /* <-- Borde gris punteado para recortar */
            border-radius: 12px !important;
            padding: 2rem !important; /* <-- Espacio para que no quede pegado al borde */
            text-align: center !important;
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* HEADER EN PANTALLA */}
      <header className="no-print flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white dark:bg-gray-900 lya:bg-lya-surface p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 shrink-0 z-10">
        <div className="flex items-center space-x-4">
          <div className="bg-orange-500 lya:bg-lya-primary text-white lya:text-lya-surface p-3 rounded-2xl shadow-md shadow-orange-500/20 lya:shadow-lya-primary/20">
            <QrCode size={28} />
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

        {zonaActiva === 'salon' && (
          <button 
            onClick={addMesa}
            className="flex items-center gap-2 bg-gray-900 dark:bg-orange-600 hover:bg-gray-800 dark:hover:bg-orange-500 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-6 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95"
          >
            <Plus size={20} />
            <span>Agregar Mesa</span>
          </button>
        )}
      </header>

      {/* TABS EN PANTALLA */}
      <div className="no-print flex gap-2 bg-gray-200 dark:bg-gray-800 lya:bg-lya-border/20 p-1 rounded-2xl overflow-x-auto w-fit mb-6 shrink-0 z-10">
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

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24 relative">
        <AnimatePresence mode='wait'>
          
          {zonaActiva === 'salon' ? (
            <motion.div 
              key="salon" 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -10 }}
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start auto-rows-max ${previewMesa ? 'no-print' : ''}`}
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
                    className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-100 dark:border-gray-800 lya:border-lya-border/30 p-6 rounded-3xl shadow-sm relative group overflow-hidden flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-orange-100 dark:bg-orange-500/10 lya:bg-lya-secondary/10 p-3 rounded-2xl">
                          <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400 lya:text-lya-secondary" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white lya:text-lya-text">Mesa {mesa.number}</h3>
                      </div>
                      <button 
                        onClick={() => removeMesa(mesa.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 lya:text-lya-text/40 lya:hover:text-red-500 lya:hover:bg-red-500/10 rounded-xl transition-all"
                        title="Eliminar Mesa"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    
                    {/* Visualizador Miniatura del QR */}
                    <div className="w-full bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg rounded-2xl flex items-center justify-center py-6 mb-4 border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 transition-colors">
                       <QrCode className="w-24 h-24 text-gray-300 dark:text-gray-600 lya:text-lya-text/20" />
                    </div>
                    
                    {/* Enlace de contingencia */}
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
                    
                    {/* BOTÓN "MOSTRAR QR" */}
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
                <div className="col-span-full py-20 flex flex-col items-center text-gray-400 lya:text-lya-text/50">
                  <LayoutGrid size={48} className="mb-4 opacity-20" />
                  <p className="font-medium">No hay mesas en el sistema. Haz clic en "Agregar Mesa".</p>
                </div>
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
              <div className="bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-800 lya:border-lya-border/30 rounded-3xl p-8 max-w-md w-full shadow-xl flex flex-col items-center text-center print-card print:bg-white">
                
                <div className="no-print bg-orange-500/10 lya:bg-lya-secondary/10 p-4 rounded-full mb-4">
                  <Smartphone className="w-10 h-10 text-orange-500 lya:text-lya-secondary" />
                </div>
                
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white lya:text-lya-text mb-2 print:text-black text-3xl print:mb-4">Mostrador LyA</h2>
                
                <p className="no-print text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-sm mb-6">QR único para que los clientes en fila puedan escanear el menú.</p>
                
                <div className="hidden print:block mb-8 px-4">
                  <p className="text-xl font-bold italic print:text-black mb-2">"Evita la fila, ordena desde tu celular"</p>
                  <p className="text-sm print:text-gray-800">Escanea este código para ver nuestro menú de repostería y bebidas.</p>
                </div>

                <div className="w-full bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl flex items-center justify-center py-10 mb-4 border-2 border-dashed border-gray-300 dark:border-gray-700 lya:border-lya-border/40 print:py-8 print:bg-white print:border-none">
                   <QrCode className="w-32 h-32 text-gray-300 dark:text-gray-700 lya:text-lya-text/30 print:text-black print:bg-white rounded-lg" />
                </div>

                <div className="bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg p-3 w-full rounded-xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 mb-6 print:bg-white print:border-none">
                  <LinkIcon className="no-print w-4 h-4 text-gray-500 lya:text-lya-text/50 shrink-0" />
                  <span className="text-sm text-gray-600 dark:text-gray-300 lya:text-lya-text/80 truncate font-medium print:text-black print:text-lg">
                    lya.menu/llevar
                  </span>
                </div>

                {/* AQUÍ CAMBIAMOS EL BOTÓN DE "IMPRIMIR" A "MOSTRAR QR" COMO QUERÍAS */}
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

      {/* MODAL DE PREVISUALIZACIÓN */}
      <AnimatePresence>
        {previewMesa && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:p-0 print:bg-white">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setPreviewMesa(null)}
              className="absolute inset-0 bg-black/50 dark:bg-black/80 lya:bg-lya-text/60 backdrop-blur-sm no-print"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface p-8 rounded-[2rem] shadow-2xl relative z-10 w-full max-w-sm flex flex-col items-center text-center border border-gray-100 dark:border-gray-800 lya:border-lya-border/20 print-card print:bg-white"
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
              
              {/* TÍTULO DINÁMICO */}
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white lya:text-lya-text mb-6 print:text-black print:text-4xl print:mb-4">
                {previewMesa.isLlevar ? 'Mostrador LyA' : `Mesa ${previewMesa.number}`}
              </h2>
              
              {/* MENSAJE DINÁMICO (Visible Solo en Papel) */}
              <div className="hidden print:block mb-8 px-2">
                 <p className="text-xl font-bold italic print:text-black mb-2">
                   {previewMesa.isLlevar ? '"Evita la fila..."' : '"Un dulce momento te espera..."'}
                 </p>
                 <p className="text-sm print:text-gray-800">
                   {previewMesa.isLlevar 
                     ? 'Ordena desde tu celular para retirar en mostrador.' 
                     : 'Por favor, escanea este código con tu celular para ver nuestro menú y ordenar a tu mesa.'}
                 </p>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-inner border border-gray-200 lya:border-lya-border/30 mb-6 flex items-center justify-center w-full print:bg-white print:border-none print:shadow-none print:p-0">
                <QrCode className="w-48 h-48 text-gray-900 lya:text-lya-text print:text-black print:bg-white rounded-xl" />
              </div>

              {/* ENLACE DINÁMICO */}
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
      
    </div>
  );
};