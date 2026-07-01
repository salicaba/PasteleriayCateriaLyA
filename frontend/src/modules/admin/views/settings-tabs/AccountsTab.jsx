// src/modules/admin/views/settings-tabs/AccountsTab.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Plus, Trash2, Edit2, Check, Printer, Sliders, Info, MessageCircle, Save, Loader2 } from 'lucide-react';
import client from '../../../../api/client';

export const AccountsTab = ({ showNotification }) => {
  const [accounts, setAccounts] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printQuantity, setPrintQuantity] = useState(2);

  useEffect(() => {
    fetchAccountsData();
  }, []);

  const fetchAccountsData = async () => {
    setFetching(true);
    try {
      const res = await client.get('/settings');
      if (res.data) {
        if (Array.isArray(res.data.bank_accounts)) setAccounts(res.data.bank_accounts);
        if (res.data.whatsapp_number) setWhatsappNumber(res.data.whatsapp_number);
      }
    } catch (err) {
      showNotification('error', "Error al obtener la configuración de cuentas");
    } finally {
      setFetching(false);
    }
  };

  const saveSettingsToDB = async (payloadToOverride) => {
    try {
      const current = await client.get('/settings');
      const payload = {
        ...current.data,
        bank_accounts: accounts,
        whatsapp_number: whatsappNumber,
        ...payloadToOverride
      };
      
      await client.put('/settings', payload);
      showNotification('success', "¡Configuración guardada exitosamente!");
    } catch (e) {
      showNotification('error', "Error de base de datos al guardar ajustes");
      throw e;
    }
  };

  const handleSaveWhatsapp = async () => {
    setIsSavingWhatsapp(true);
    try {
      await saveSettingsToDB({ whatsapp_number: whatsappNumber });
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!form.bank_name || !form.account_number) return showNotification('error', "Completa los campos obligatorios");
    
    setIsSavingAccount(true);
    let newAccounts;
    if (editingId) {
      newAccounts = accounts.map(acc => acc.id === editingId ? form : acc);
    } else {
      newAccounts = [...accounts, { ...form, id: Date.now().toString() }];
    }
    
    setAccounts(newAccounts); 
    resetForm(); 
    try {
      await saveSettingsToDB({ bank_accounts: newAccounts }); 
    } catch (err) {
    } finally {
      setIsSavingAccount(false);
    }
  };

  const editAccount = (acc) => { setEditingId(acc.id); setForm(acc); };
  
  const resetForm = () => { 
    setEditingId(null); 
    setForm({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' }); 
  };
  
  const deleteAccount = async (id) => { 
    const newAccounts = accounts.filter(a => a.id !== id);
    setAccounts(newAccounts); 
    try {
      await saveSettingsToDB({ bank_accounts: newAccounts });
    } catch (err) {}
  };

  const executePrint = () => {
    const cantidad = parseInt(printQuantity);
    if (isNaN(cantidad) || cantidad <= 0) return;
    setShowPrintModal(false);
    
    const tarjetasArray = Array.from({ length: cantidad });
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const footerText = whatsappNumber 
      ? `<b>Importante:</b> En el concepto escribe tu número de mesa o folio (si es para llevar, tu nombre).<br>Envía tu comprobante al WhatsApp <b>${whatsappNumber}</b> o muéstraselo a tu mesero. ¡Gracias!`
      : `<b>Importante:</b> En el concepto escribe tu número de mesa o folio (si es para llevar, tu nombre).<br>Muestra tu comprobante al mesero. ¡Gracias!`;

    const htmlContent = `
      <html>
        <head>
          <title>Datos de Transferencia - 𝓛𝔂𝓪</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: white; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .card { border: 2px dashed #D4A373; padding: 20px; border-radius: 15px; text-align: center; page-break-inside: avoid; }
            .logo { font-size: 24px; font-weight: bold; color: #4A2B29; margin-bottom: 5px; display: inline-block; }
            .subtitle { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 15px; }
            .bank { font-size: 16px; font-weight: 800; color: #D4A373; margin: 10px 0; }
            .info-group { margin-bottom: 8px; text-align: left; background: #f9f9f9; padding: 8px; border-radius: 8px; }
            .label { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; display: block; }
            .val { font-size: 13px; font-weight: bold; color: #333; word-break: break-all; }
            .footer { font-size: 9px; margin-top: 15px; font-style: italic; color: #666; line-height: 1.3; background: #fff5eb; padding: 10px; border-radius: 8px; border: 1px solid #ffe8cc; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="grid">
            ${tarjetasArray.map(() => `
              <div class="card">
                <div class="logo"> 𝓛𝔂𝓪 </div>
                <div class="subtitle">Datos de Transferencia</div>
                ${accounts.map(acc => `
                  <div class="bank">${acc.bank_name}</div>
                  <div class="info-group"><span class="label">Titular</span><span class="val">${acc.account_holder}</span></div>
                  <div class="info-group"><span class="label">Cuenta</span><span class="val">${acc.account_number}</span></div>
                  ${acc.clabe ? `<div class="info-group"><span class="label">CLABE</span><span class="val">${acc.clabe}</span></div>` : ''}
                `).join('<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">')}
                <div class="footer">${footerText}</div>
              </div>
            `).join('')}
          </div>
          <script>window.onload = function() { setTimeout(() => { window.print(); }, 500); }</script>
        </body>
      </html>
    `;
    iframe.contentWindow.document.open(); iframe.contentWindow.document.write(htmlContent); iframe.contentWindow.document.close();
    setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 10000);
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
          <Landmark size={40} className="text-emerald-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Cuentas
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-emerald-500 lya:text-lya-primary" /> Obteniendo datos de transferencia y CLABEs...
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
        <div className="bg-emerald-500 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0"><Landmark size={28} /></div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Cuentas Bancarias</h1>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Gestión de cuentas y CLABEs para transferencias en 𝓛𝔂𝓪</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-14 h-14 rounded-full bg-emerald-500/10 lya:bg-lya-primary/10 flex items-center justify-center shrink-0">
            <MessageCircle size={28} className="text-emerald-500 lya:text-lya-primary" />
        </div>
        <div className="flex-1 w-full text-center sm:text-left">
          <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">WhatsApp para Comprobantes</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Este número se imprimirá en los tickets de datos para que los clientes envíen sus comprobantes.</p>
        </div>
        <div className="w-full sm:w-80 flex items-center gap-2">
          <input 
            type="text" 
            value={whatsappNumber} 
            onChange={e => setWhatsappNumber(e.target.value)} 
            placeholder="Ej. 961 123 4567" 
            className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text font-bold" 
          />
          <button 
            onClick={handleSaveWhatsapp} 
            disabled={isSavingWhatsapp}
            className="h-[52px] px-5 min-w-[52px] bg-gray-900 hover:bg-black dark:bg-emerald-500 dark:hover:bg-emerald-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-2xl font-bold transition-all shadow-md active:scale-95 flex items-center justify-center disabled:opacity-50" 
            title="Guardar Número"
          >
            {isSavingWhatsapp ? <Loader2 className="animate-spin w-5 h-5"/> : <Save size={20}/>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-6">
          <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40">
            <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><Landmark size={20} /></div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">{editingId ? 'Modificar Cuenta' : 'Registrar Nueva Cuenta'}</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Banco / Institución</label>
                <input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} placeholder="Ej. BBVA o Mercado Pago" 
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Nombre del Titular</label>
                <input type="text" value={form.account_holder} onChange={e => setForm({...form, account_holder: e.target.value})} placeholder="Como aparece en el estado de cuenta" 
                  className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">Número de Cuenta</label>
                  <input type="text" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} placeholder="10 a 16 dígitos"
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text font-mono" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CLABE (18 dígitos)</label>
                  <input type="text" value={form.clabe} onChange={e => setForm({...form, clabe: e.target.value})} placeholder="Opcional"
                    className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text font-mono" />
                </div>
              </div>

              <button onClick={handleAddOrUpdate} disabled={isSavingAccount} className="w-full py-4 bg-emerald-500 lya:bg-lya-primary text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
                {isSavingAccount ? (
                    <><Loader2 className="animate-spin" size={20}/> Espere...</>
                ) : editingId ? (
                    <><Check size={20}/> Guardar Cambios</>
                ) : (
                    <><Plus size={20}/> Guardar Cuenta</>
                )}
              </button>
              {editingId && <button onClick={resetForm} className="w-full text-sm text-gray-400 font-bold hover:text-red-500 transition-colors">Cancelar edición</button>}
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex-1 flex flex-col min-h-[400px]">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text uppercase text-xs tracking-widest">Cuentas Registradas ({accounts.length})</h3>
                <Info size={16} className="text-gray-300 dark:text-gray-600 lya:text-lya-text/40" />
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 mb-6">
              <AnimatePresence mode="popLayout">
                {accounts.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="h-full flex flex-col items-center justify-center text-gray-400 italic py-20"
                  >
                    <Sliders size={48} className="opacity-10 mb-4" />
                    <p className="text-sm">Aún no has agregado cuentas bancarias.</p>
                  </motion.div>
                ) : (
                  accounts.map((acc, index) => (
                    <motion.div 
                      key={acc.id} 
                      layout 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.03, type: "spring", stiffness: 200, damping: 20 }}
                      className="group relative p-5 rounded-3xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 bg-gray-50/50 dark:bg-gray-900/40 lya:bg-lya-bg/30 hover:border-emerald-500/30 lya:hover:border-lya-primary/30 transition-colors flex justify-between items-start"
                    >
                      <div className="flex-1 pr-4 space-y-1.5">
                        <p className="text-sm font-black text-gray-800 dark:text-white lya:text-lya-text uppercase tracking-tight mb-3 flex items-center gap-2">
                          <Landmark size={14} className="text-emerald-500 lya:text-lya-primary" /> {acc.bank_name}
                        </p>
                        
                        {acc.account_holder && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[9px] uppercase font-bold text-gray-400 w-14 shrink-0">Titular</span>
                            <span className="text-gray-700 dark:text-gray-300 lya:text-lya-text/90 font-medium truncate">{acc.account_holder}</span>
                          </div>
                        )}
                        
                        {acc.account_number && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[9px] uppercase font-bold text-gray-400 w-14 shrink-0">Cuenta</span>
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">{acc.account_number}</span>
                          </div>
                        )}

                        {acc.clabe && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-[9px] uppercase font-bold text-gray-400 w-14 shrink-0">CLABE</span>
                            <span className="font-mono font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text">{acc.clabe}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 flex-col">
                        <button onClick={() => editAccount(acc)} className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-xl shadow-sm text-blue-500 hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700"><Edit2 size={16}/></button>
                        <button onClick={() => deleteAccount(acc.id)} className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-xl shadow-sm text-red-500 hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700"><Trash2 size={16}/></button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            <div className="pt-6 border-t border-gray-100 dark:border-gray-700 lya:border-lya-border/20">
              <button onClick={() => accounts.length > 0 ? setShowPrintModal(true) : showNotification('error', "No hay cuentas para imprimir")}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gray-50 dark:bg-gray-700 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-all active:scale-95"
              >
                <Printer size={18} /> Imprimir Tickets de Transferencia
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* --- MODAL DE IMPRESIÓN DE TICKETS DE TRANSFERENCIA --- */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.8, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="relative bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
            >
              <div className="mx-auto bg-emerald-500/10 lya:bg-lya-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6"><Printer size={36} className="text-emerald-500 lya:text-lya-primary" /></div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-2">Imprimir Tickets</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8">¿Cuántos tickets de datos bancarios deseas imprimir para tus mesas?</p>
              
              <div className="flex items-center justify-center gap-6 mb-10">
                <button onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))} className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-2xl font-bold dark:text-white lya:text-lya-text active:scale-90 transition-transform">-</button>
                <span className="text-4xl font-black dark:text-white lya:text-lya-text w-16">{printQuantity}</span>
                <button onClick={() => setPrintQuantity(printQuantity + 1)} className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-2xl font-bold dark:text-white lya:text-lya-text active:scale-90 transition-transform">+</button>
              </div>
              
              <div className="flex gap-4">
                <button onClick={() => setShowPrintModal(false)} className="flex-1 py-4 font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">Cerrar</button>
                <button onClick={executePrint} className="flex-1 py-4 font-bold text-white bg-gray-900 dark:bg-emerald-500 lya:bg-lya-primary rounded-2xl shadow-lg active:scale-95 transition-all">Imprimir</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};