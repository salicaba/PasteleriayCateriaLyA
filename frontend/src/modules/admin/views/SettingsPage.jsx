// src/modules/admin/views/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Save, Landmark, User, CreditCard, Hash, 
  Plus, Trash2, Edit2, X, Check, Printer, 
  Settings, Sliders, Info 
} from 'lucide-react';
import client from '../../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export const SettingsPage = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printQuantity, setPrintQuantity] = useState(2);

  useEffect(() => {
    setFetching(true);
    client.get('/settings')
      .then(res => {
        if (res.data && Array.isArray(res.data.bank_accounts)) {
          setAccounts(res.data.bank_accounts);
        }
      })
      .catch(err => {
        console.error("Error cargando configuración:", err);
        toast.error("No se pudieron cargar las cuentas");
      })
      .finally(() => setFetching(false));
  }, []);

  const handleSaveToServer = async () => {
    setLoading(true);
    try {
      await client.put('/settings', { bank_accounts: accounts });
      toast.success("¡Configuración guardada permanentemente!");
    } catch (e) {
      toast.error("Error al guardar en el servidor");
    } finally { setLoading(false); }
  };

  const handleAddOrUpdate = () => {
    if (!form.bank_name || !form.account_number) return toast.error("Datos obligatorios incompletos");
    
    if (editingId) {
      setAccounts(accounts.map(acc => acc.id === editingId ? form : acc));
      toast.success("Cuenta actualizada en la lista");
    } else {
      setAccounts([...accounts, { ...form, id: Date.now().toString() }]);
      toast.success("Cuenta agregada a la lista");
    }
    resetForm();
  };

  const editAccount = (acc) => {
    setEditingId(acc.id);
    setForm(acc);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' });
  };

  const deleteAccount = (id) => {
    setAccounts(accounts.filter(a => a.id !== id));
    toast.success("Cuenta eliminada");
  };

  const executePrint = () => {
    const cantidad = parseInt(printQuantity);
    if (isNaN(cantidad) || cantidad <= 0) return;
    setShowPrintModal(false);
    
    const tarjetasArray = Array.from({ length: cantidad });
    
    // ARREGLO 1: Creamos un iframe invisible para no abrir pestañas nuevas
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    // ARREGLO 2: La L cursiva correcta (𝓛) y estilos exactos
    const htmlContent = `
      <html>
        <head>
          <title>Tarjetas de Pago - LyA</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: white; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .card { 
              border: 2px dashed #D4A373; 
              padding: 20px; 
              border-radius: 15px; 
              text-align: center;
              page-break-inside: avoid;
            }
            .logo { 
              font-size: 24px; 
              font-weight: bold; 
              color: #4A2B29; 
              margin-bottom: 5px;
              letter-spacing: -0.11em; 
              transform: scaleX(0.95); 
              display: inline-block;
            }
            .subtitle { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 15px; }
            .bank { font-size: 16px; font-weight: 800; color: #D4A373; margin: 10px 0; }
            .info-group { margin-bottom: 8px; text-align: left; background: #f9f9f9; padding: 8px; border-radius: 8px; }
            .label { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; display: block; }
            .val { font-size: 13px; font-weight: bold; color: #333; word-break: break-all; }
            .footer { font-size: 9px; margin-top: 15px; font-style: italic; color: #666; line-height: 1.2; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${tarjetasArray.map(() => `
              <div class="card">
                <div class="logo">𝓛𝔂𝓐</div>
                <div class="subtitle">Datos de Transferencia</div>
                ${accounts.map(acc => `
                  <div class="bank">${acc.bank_name}</div>
                  <div class="info-group">
                    <span class="label">Titular</span>
                    <span class="val">${acc.account_holder}</span>
                  </div>
                  <div class="info-group">
                    <span class="label">Cuenta/Tarjeta</span>
                    <span class="val">${acc.account_number}</span>
                  </div>
                  ${acc.clabe ? `
                    <div class="info-group">
                      <span class="label">CLABE</span>
                      <span class="val">${acc.clabe}</span>
                    </div>
                  ` : ''}
                `).join('<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">')}
                <div class="footer">
                  <b>Importante:</b> Escribe tu número de mesa o folio en el concepto.<br>
                  Envía tu comprobante por WhatsApp. ¡Gracias!
                </div>
              </div>
            `).join('')}
          </div>
          <script>
            window.onload = function() { 
              setTimeout(() => { 
                window.print(); 
              }, 500);
            }
          </script>
        </body>
      </html>
    `;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(htmlContent);
    iframe.contentWindow.document.close();

    // Limpiamos el iframe oculto después de un rato para no consumir memoria
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 10000);
  };

  if (fetching) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Sliders className="text-orange-500" size={40} />
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -15 }}
      className="h-full w-full bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg transition-colors duration-300 overflow-y-auto custom-scrollbar p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-10">
        
        {/* --- ENCABEZADO "TARJETA FLOTANTE" --- */}
        <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-orange-500 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shadow-orange-500/20 lya:shadow-lya-primary/20 shrink-0">
              <Settings size={28} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Ajustes de Negocio</h1>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Configuración global y cuentas bancarias</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button 
              onClick={() => accounts.length > 0 ? setShowPrintModal(true) : toast.error("No hay cuentas para imprimir")}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-gray-50 dark:bg-gray-700 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              <Printer size={18} /> Imprimir Tarjetas
            </button>
            <button 
              onClick={handleSaveToServer}
              disabled={loading}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black dark:bg-orange-500 dark:hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50"
            >
              <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>

        {/* --- CONTENIDO PRINCIPAL --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Columna Izquierda: Formulario */}
          <section className="space-y-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40">
              <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <Landmark size={20} />
                </div>
                <h2 className="font-bold text-lg dark:text-white">{editingId ? 'Modificar Cuenta' : 'Registrar Nueva Cuenta'}</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Banco / Institución</label>
                  <input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} placeholder="Ej. BBVA o Mercado Pago" 
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" />
                </div>
                
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Nombre del Titular</label>
                  <input type="text" value={form.account_holder} onChange={e => setForm({...form, account_holder: e.target.value})} placeholder="Como aparece en el estado de cuenta" 
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Número de Cuenta/Tarjeta</label>
                    <input type="text" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} 
                      className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CLABE (18 dígitos)</label>
                    <input type="text" value={form.clabe} onChange={e => setForm({...form, clabe: e.target.value})} 
                      className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 focus:ring-2 focus:ring-orange-500 outline-none transition-all dark:text-white" />
                  </div>
                </div>

                <button onClick={handleAddOrUpdate} 
                  className="w-full py-4 bg-orange-500/10 lya:bg-lya-primary/10 text-orange-600 lya:text-lya-primary font-bold rounded-2xl hover:bg-orange-500 hover:text-white lya:hover:bg-lya-primary transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                  {editingId ? <><Check size={20}/> Actualizar Cuenta</> : <><Plus size={20}/> Añadir a la Lista</>}
                </button>
                {editingId && <button onClick={resetForm} className="w-full text-sm text-gray-400 font-bold hover:text-red-500 transition-colors">Cancelar edición</button>}
              </div>
            </div>
          </section>

          {/* Columna Derecha: Lista Visual */}
          <section className="flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex-1 flex flex-col min-h-[400px]">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text uppercase text-xs tracking-widest">Cuentas Registradas ({accounts.length})</h3>
                 <Info size={16} className="text-gray-300" />
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                <AnimatePresence mode="popLayout">
                  {accounts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 italic py-20">
                      <Sliders size={48} className="opacity-10 mb-4" />
                      <p className="text-sm">Aún no has agregado cuentas bancarias.</p>
                    </div>
                  ) : (
                    accounts.map(acc => (
                      <motion.div key={acc.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="group relative p-5 rounded-3xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 bg-gray-50/50 dark:bg-gray-900/40 lya:bg-lya-bg/30 hover:border-orange-500/30 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-tight">{acc.bank_name}</p>
                            <p className="text-xs text-gray-400 font-mono mt-1">{acc.account_number}</p>
                            <p className="text-[10px] text-gray-400 mt-2 italic">Titular: {acc.account_holder}</p>
                          </div>
                          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => editAccount(acc)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-blue-500 hover:scale-110 transition-transform"><Edit2 size={16}/></button>
                            <button onClick={() => deleteAccount(acc.id)} className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-red-500 hover:scale-110 transition-transform"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </section>

        </div>
      </div>

      {/* --- MODAL DE IMPRESIÓN --- */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
            >
              <div className="mx-auto bg-orange-500/10 lya:bg-lya-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6">
                <Printer size={36} className="text-orange-500 lya:text-lya-primary" />
              </div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Imprimir Tarjetas</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">¿Cuántas tarjetas de datos bancarios deseas imprimir para tus mesas?</p>
              
              <div className="flex items-center justify-center gap-6 mb-10">
                <button onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))} className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-2xl font-bold active:scale-90 transition-transform">-</button>
                <span className="text-4xl font-black dark:text-white w-16">{printQuantity}</span>
                <button onClick={() => setPrintQuantity(printQuantity + 1)} className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-2xl font-bold active:scale-90 transition-transform">+</button>
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => setShowPrintModal(false)} className="flex-1 py-4 font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 transition-colors">Cerrar</button>
                <button onClick={executePrint} className="flex-1 py-4 font-bold text-white bg-gray-900 dark:bg-orange-500 lya:bg-lya-primary rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all">Imprimir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};