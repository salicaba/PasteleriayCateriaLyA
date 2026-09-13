// src/modules/admin/views/settings-tabs/AccountsTab.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom'; // 🚀 IMPORTACIÓN CLAVE PARA CUBRIR TODA LA PANTALLA
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, Plus, Trash2, Edit2, Check, Download, 
  Sliders, Info, MessageCircle, Save, Loader2, QrCode, Maximize, X, Link as LinkIcon 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; // 🚀 IMPORTACIÓN DEL QR
import client from '../../../../api/client';
import html2pdf from 'html2pdf.js';

export const AccountsTab = ({ showNotification, globalScroll }) => {
  const [accounts, setAccounts] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  const [isSavingWhatsapp, setIsSavingWhatsapp] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [fetching, setFetching] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printQuantity, setPrintQuantity] = useState(2);
  const [isPrinting, setIsPrinting] = useState(false);

  // 🚀 ESTADOS PARA EL NUEVO QR
  const [previewQR, setPreviewQR] = useState(false);
  const [isPrintingQR, setIsPrintingQR] = useState(false);

  // 🚀 OBTENER DOMINIO PARA EL QR
  const baseUrl = import.meta.env.VITE_CLIENT_URL || window.location.origin;
  const displayBaseUrl = baseUrl.replace(/^https?:\/\//, '');

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

  const handleWhatsappChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 10) {
      setWhatsappNumber(value);
    }
  };

  const handleSaveWhatsapp = async () => {
    if (!whatsappNumber.trim()) {
      return showNotification('error', "El número de WhatsApp no puede estar vacío.");
    }
    if (whatsappNumber.length !== 10) {
      return showNotification('error', "El número de WhatsApp debe tener exactamente 10 dígitos.");
    }

    setIsSavingWhatsapp(true);
    try {
      await saveSettingsToDB({ whatsapp_number: whatsappNumber });
    } finally {
      setIsSavingWhatsapp(false);
    }
  };

  const handleAddOrUpdate = async () => {
    if (!form.bank_name || !form.account_holder || !form.account_number || !form.clabe) {
      return showNotification('error', "Debes llenar todos los campos obligatorios (Banco, Titular, Cuenta y CLABE).");
    }
    
    if (form.account_number.length < 10 || form.account_number.length > 16) {
      return showNotification('error', "El número de cuenta o tarjeta debe tener entre 10 y 16 dígitos.");
    }

    if (form.clabe.length !== 18) {
      return showNotification('error', "La CLABE interbancaria debe tener exactamente 18 dígitos.");
    }

    setIsSavingAccount(true);
    let newAccounts;
    if (editingId) {
      newAccounts = accounts.map(acc => acc.id === editingId ? form : acc);
    } else {
      newAccounts = [...accounts, { ...form, id: Date.now().toString() }];
    }
    
    try {
      await saveSettingsToDB({ bank_accounts: newAccounts });
      setAccounts(newAccounts); 
      resetForm(); 
    } catch (err) {
    } finally {
      setIsSavingAccount(false);
    }
  };

  const editAccount = (acc) => { 
    setEditingId(acc.id); 
    setForm(acc); 
  };
  
  const resetForm = () => { 
    setEditingId(null); 
    setForm({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' }); 
  };
  
  const confirmDeleteAccount = (acc) => {
    setAccountToDelete(acc);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    const newAccounts = accounts.filter(a => a.id !== accountToDelete.id);
    try {
      await saveSettingsToDB({ bank_accounts: newAccounts });
      setAccounts(newAccounts); 
      setAccountToDelete(null); 
    } catch (err) {
    } finally {
      setIsDeleting(false); 
    }
  };

  const executeDownloadPDF = async () => {
    const cantidad = parseInt(printQuantity);
    if (isNaN(cantidad) || cantidad <= 0) return;
    
    setIsPrinting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const element = document.getElementById('pdf-accounts-container');
      
      const opt = {
        margin:       10,
        filename:     'Cuentas_Bancarias_Lya.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await html2pdf().set(opt).from(element).save();
      
      setShowPrintModal(false);
      showNotification('success', "PDF generado y descargado correctamente");
      
    } catch (error) {
      showNotification('error', "Ocurrió un error al generar el PDF");
    } finally {
      setIsPrinting(false);
    }
  };

  // 🚀 DESCARGA EXCLUSIVA DEL QR DE TRANSFERENCIAS
  const executeDownloadQR = async () => {
    setIsPrintingQR(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const element = document.getElementById('pdf-transfer-qr-container');
      const opt = {
        margin:       10,
        filename:     'QR_Transferencias_Lya.pdf',
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
      showNotification('success', 'QR descargado correctamente');
    } catch (error) {
      showNotification('error', 'Error al generar el QR');
    } finally {
      setIsPrintingQR(false);
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
          <Landmark size={40} className="text-emerald-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center">
          Cargando Cuentas
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 text-center">
          <Loader2 size={16} className="animate-spin text-emerald-500 lya:text-lya-primary" /> Obteniendo datos de transferencia...
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
      className={`transition-all duration-300 ${globalScroll ? 'w-full flex flex-col space-y-6' : 'h-full w-full flex-1 flex flex-col overflow-hidden'}`}
    >
      <div className={`shrink-0 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex flex-col sm:flex-row items-center sm:items-start gap-4 ${globalScroll ? '' : 'mb-6 z-10'}`}>
        <div className="bg-emerald-500 lya:bg-lya-primary p-4 rounded-[1.5rem] text-white shadow-lg shrink-0">
          <Landmark size={32} />
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Cuentas Bancarias</h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-2 text-justify sm:text-left">
            Gestión de cuentas y CLABEs para procesar pagos por transferencia en <strong>𝓛𝔂𝓪</strong>.
          </p>
        </div>
      </div>

      <div className={`flex-1 w-full relative ${globalScroll ? 'space-y-6' : 'overflow-y-auto custom-scrollbar pr-1 sm:pr-2 pb-4 space-y-6'}`}>
        
        {/* 🚀 NUEVA CONFIGURACIÓN: GRID PARA WHATSAPP Y QR DE TRANSFERENCIAS */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Tarjeta de WhatsApp */}
          <motion.div 
            whileHover={{ y: -2, scale: 1.01 }}
            className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col sm:flex-row items-center gap-6 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 lya:bg-lya-primary/10 flex items-center justify-center shrink-0">
                <MessageCircle size={32} className="text-emerald-500 lya:text-lya-primary" />
            </div>
            <div className="flex-1 w-full text-center sm:text-left">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">WhatsApp para Comprobantes</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-2 text-justify sm:text-left leading-relaxed">
                Este número se imprimirá en los tickets generados, permitiendo a los clientes enviar sus comprobantes.
              </p>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
              <input 
                type="text" 
                value={whatsappNumber} 
                onChange={handleWhatsappChange} 
                placeholder="Ej. 961 123 4567" 
                className="w-full sm:w-40 px-4 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text font-bold" 
              />
              <motion.button 
                whileTap={!isSavingWhatsapp ? { scale: 0.95 } : {}}
                onClick={handleSaveWhatsapp} 
                disabled={isSavingWhatsapp}
                className="h-[56px] px-5 min-w-[56px] bg-gray-900 md:hover:bg-black dark:bg-emerald-500 dark:md:hover:bg-emerald-600 lya:bg-lya-primary lya:md:hover:bg-lya-primary/90 text-white rounded-2xl font-bold transition-colors shadow-md flex items-center justify-center disabled:opacity-50 outline-none" 
                title="Guardar Número"
              >
                {isSavingWhatsapp ? <Loader2 className="animate-spin w-6 h-6"/> : <Save size={24}/>}
              </motion.button>
            </div>
          </motion.div>

          {/* 🚀 NUEVA TARJETA: QR DE TRANSFERENCIAS */}
          <motion.div 
            whileHover={{ y: -2, scale: 1.01 }}
            className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col sm:flex-row items-center gap-6 transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-orange-500/10 lya:bg-lya-secondary/10 flex items-center justify-center shrink-0">
                <QrCode size={32} className="text-orange-500 lya:text-lya-secondary" />
            </div>
            <div className="flex-1 w-full text-center sm:text-left">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Portal de Cuentas QR</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-2 text-justify sm:text-left leading-relaxed">
                QR Inteligente para que los clientes escaneen y copien directamente los números de cuenta en sus celulares.
              </p>
            </div>
            <div className="w-full sm:w-auto flex items-center gap-2">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setPreviewQR(true)}
                className="h-[56px] px-5 bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text rounded-2xl font-bold md:hover:bg-gray-200 dark:md:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 outline-none"
                title="Pantalla Completa"
              >
                <Maximize size={20} />
              </motion.button>
              <motion.button 
                whileTap={!isPrintingQR ? { scale: 0.95 } : {}}
                onClick={executeDownloadQR} 
                disabled={isPrintingQR}
                className="h-[56px] px-5 bg-orange-500 md:hover:bg-orange-600 lya:bg-lya-secondary lya:md:hover:bg-lya-secondary/90 text-white rounded-2xl font-bold transition-colors shadow-md shadow-orange-500/30 lya:shadow-lya-secondary/30 flex items-center justify-center gap-2 disabled:opacity-50 outline-none" 
                title="Descargar QR en PDF"
              >
                {isPrintingQR ? <Loader2 className="animate-spin w-6 h-6"/> : <Download size={20}/>}
              </motion.button>
            </div>
          </motion.div>

        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="space-y-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40">
              <div className="flex items-center gap-4 mb-8 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  {editingId ? <Edit2 size={24} /> : <Plus size={24} />}
                </div>
                <h2 className="font-bold text-xl text-gray-900 dark:text-white lya:text-lya-text">
                  {editingId ? 'Modificar Cuenta' : 'Registrar Nueva Cuenta'}
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[11px] font-black uppercase text-gray-400 mb-2 block ml-2">Banco / Institución</label>
                  <input type="text" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} placeholder="Ej. BBVA o Mercado Pago" 
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text" />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-gray-400 mb-2 block ml-2">Nombre del Titular</label>
                  <input type="text" value={form.account_holder} onChange={e => setForm({...form, account_holder: e.target.value})} placeholder="Como aparece en el estado de cuenta" 
                    className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-black uppercase text-gray-400 mb-2 block ml-2">Número de Cuenta</label>
                    <input 
                      type="text" 
                      value={form.account_number} 
                      onChange={e => setForm({...form, account_number: e.target.value.replace(/\D/g, '')})} 
                      maxLength={16}
                      placeholder="10 a 16 dígitos"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text font-mono" 
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-black uppercase text-gray-400 mb-2 block ml-2">CLABE (18 dígitos)</label>
                    <input 
                      type="text" 
                      value={form.clabe} 
                      onChange={e => setForm({...form, clabe: e.target.value.replace(/\D/g, '')})} 
                      maxLength={18}
                      placeholder="18 dígitos"
                      className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text font-mono" 
                    />
                  </div>
                </div>

                <motion.button 
                  whileTap={!isSavingAccount ? { scale: 0.95 } : {}}
                  onClick={handleAddOrUpdate} 
                  disabled={isSavingAccount} 
                  className="w-full py-4 bg-emerald-500 lya:bg-lya-primary text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20 md:hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:md:hover:scale-100 outline-none"
                >
                  {isSavingAccount ? (
                      <><Loader2 className="animate-spin" size={20}/> Procesando...</>
                  ) : editingId ? (
                      <><Check size={20}/> Guardar Cambios</>
                  ) : (
                      <><Plus size={20}/> Guardar Cuenta</>
                  )}
                </motion.button>
                
                {editingId && (
                  <motion.button 
                    whileTap={{ scale: 0.95 }}
                    onClick={resetForm} 
                    className="w-full text-sm text-gray-400 font-bold md:hover:text-red-500 transition-colors outline-none"
                  >
                    Cancelar edición
                  </motion.button>
                )}
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex-1 flex flex-col min-h-[350px]">
              <div className="flex items-center justify-between mb-6 shrink-0">
                  <h3 className="font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text uppercase text-xs tracking-widest">
                    Cuentas Registradas ({accounts.length})
                  </h3>
                  <Info size={18} className="text-gray-300 dark:text-gray-600 lya:text-lya-text/40" />
              </div>
              
              <div className={`space-y-4 pr-2 mb-6 custom-scrollbar ${globalScroll ? '' : 'flex-1 overflow-y-auto'}`}>
                <AnimatePresence mode="popLayout">
                  {accounts.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }} 
                      exit={{ opacity: 0 }}
                      className="h-full flex flex-col items-center justify-center text-gray-400 italic py-20"
                    >
                      <Sliders size={56} className="opacity-10 mb-4" />
                      <p className="text-sm font-medium text-center">Aún no has agregado cuentas bancarias.</p>
                    </motion.div>
                  ) : (
                    accounts.map((acc) => (
                      <motion.div 
                        key={acc.id} 
                        layout 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="group relative p-5 rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 bg-gray-50/50 dark:bg-gray-900/40 lya:bg-lya-bg/30 md:hover:shadow-md md:hover:border-gray-200 dark:md:hover:border-gray-600 lya:md:hover:border-lya-primary/30 transition-all flex justify-between items-start"
                      >
                        <div className="flex-1 pr-2 sm:pr-4 space-y-2 min-w-0">
                          <p className="text-sm font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight flex items-center gap-2">
                            <Landmark size={16} className="text-emerald-500 lya:text-lya-primary shrink-0" /> 
                            <span className="truncate">{acc.bank_name}</span>
                          </p>
                          
                          {acc.account_holder && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[10px] uppercase font-bold text-gray-400 w-12 sm:w-16 shrink-0">Titular</span>
                              <span className="text-gray-700 dark:text-gray-300 lya:text-lya-text/90 font-medium truncate">{acc.account_holder}</span>
                            </div>
                          )}
                          
                          {acc.account_number && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[10px] uppercase font-bold text-gray-400 w-12 sm:w-16 shrink-0">Cuenta</span>
                              <span className="font-mono font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text truncate">{acc.account_number}</span>
                            </div>
                          )}

                          {acc.clabe && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-[10px] uppercase font-bold text-gray-400 w-12 sm:w-16 shrink-0">CLABE</span>
                              <span className="font-mono font-bold text-gray-800 dark:text-gray-200 lya:text-lya-text truncate">{acc.clabe}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2 flex-col shrink-0 ml-2">
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => editAccount(acc)} 
                            className="p-2.5 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-xl shadow-sm text-blue-500 md:hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 outline-none"
                          >
                            <Edit2 size={18}/>
                          </motion.button>
                          <motion.button 
                            whileTap={{ scale: 0.9 }}
                            onClick={() => confirmDeleteAccount(acc)} 
                            className="p-2.5 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-xl shadow-sm text-red-500 md:hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 outline-none"
                          >
                            <Trash2 size={18}/>
                          </motion.button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              <div className="pt-6 border-t border-gray-100 dark:border-gray-700 lya:border-lya-border/20 shrink-0">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  onClick={() => accounts.length > 0 ? setShowPrintModal(true) : showNotification('error', "No hay cuentas para descargar")}
                  className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gray-50 dark:bg-gray-700 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-2xl text-sm font-bold shadow-sm md:hover:bg-gray-100 dark:md:hover:bg-gray-600 transition-colors outline-none"
                >
                  <Download size={20} /> Generar PDF de Tickets Físicos
                </motion.button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 🚀 CONTENEDOR OCULTO PARA EL PDF DEL TICKET FÍSICO */}
      <div style={{ height: 0, overflow: 'hidden' }}>
        <div id="pdf-accounts-container" style={{ width: '700px', backgroundColor: '#ffffff', padding: '30px', boxSizing: 'border-box', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '30px' }}>
            {Array.from({ length: printQuantity }).map((_, idx) => (
               <div key={idx} style={{ width: 'calc(50% - 15px)', border: '2px dashed #D4A373', padding: '20px', borderRadius: '15px', textAlign: 'center', backgroundColor: '#ffffff', boxSizing: 'border-box', pageBreakInside: 'avoid' }}>
                  <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#4A2B29', marginBottom: '5px', fontFamily: 'serif' }}> 𝓛𝔂𝓪 </div>
                  <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#888', letterSpacing: '1px', marginBottom: '15px' }}>Datos de Transferencia</div>
                  {accounts.map((acc, i) => (
                    <div key={acc.id} style={{ marginBottom: '15px' }}>
                      <div style={{ fontSize: '16px', fontWeight: '800', color: '#D4A373', margin: '10px 0' }}>{acc.bank_name}</div>
                      {acc.account_holder && <div style={{ marginBottom: '8px', textAlign: 'left', background: '#f9f9f9', padding: '8px', borderRadius: '8px' }}><span style={{ fontSize: '9px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', display: 'block' }}>Titular</span><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', wordBreak: 'break-all' }}>{acc.account_holder}</span></div>}
                      <div style={{ marginBottom: '8px', textAlign: 'left', background: '#f9f9f9', padding: '8px', borderRadius: '8px' }}><span style={{ fontSize: '9px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', display: 'block' }}>Cuenta</span><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', wordBreak: 'break-all' }}>{acc.account_number}</span></div>
                      {acc.clabe && <div style={{ marginBottom: '8px', textAlign: 'left', background: '#f9f9f9', padding: '8px', borderRadius: '8px' }}><span style={{ fontSize: '9px', fontWeight: 'bold', color: '#999', textTransform: 'uppercase', display: 'block' }}>CLABE</span><span style={{ fontSize: '13px', fontWeight: 'bold', color: '#333', wordBreak: 'break-all' }}>{acc.clabe}</span></div>}
                      {i !== accounts.length - 1 && <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '15px 0' }} />}
                    </div>
                  ))}
                  <div style={{ fontSize: '9px', marginTop: '15px', fontStyle: 'italic', color: '#666', lineHeight: 1.4, background: '#fff5eb', padding: '10px', borderRadius: '8px', border: '1px solid #ffe8cc', textAlign: 'center' }}>
                    <b>Importante:</b> En el concepto de tu transferencia escribe tu número de <b>Mesa</b> o tu identificador de <b>Llevar</b>.<br/>
                    {whatsappNumber ? (
                      <>Envía tu comprobante al WhatsApp <b>{whatsappNumber}</b> o muéstraselo a tu mesero. ¡Gracias!</>
                    ) : (
                      'Muestra tu comprobante al mesero. ¡Gracias!'
                    )}
                  </div>
               </div>
            ))}
          </div>
        </div>
      </div>

      {/* 🚀 CONTENEDOR OCULTO PARA EL PDF EXCLUSIVO DEL QR */}
      <div style={{ height: 0, overflow: 'hidden' }}>
        <div id="pdf-transfer-qr-container" style={{ width: '700px', backgroundColor: '#ffffff', boxSizing: 'border-box', margin: '0 auto', padding: '40px' }}>
          <div style={{ border: '2px dashed #D4A373', borderRadius: '20px', padding: '40px', backgroundColor: '#ffffff', textAlign: 'center' }}>
            <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#4A2B29', margin: '0 0 10px 0', fontFamily: 'serif' }}> 𝓛𝔂𝓪 </h2>
            <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#000', margin: '0 0 5px 0' }}>Datos de Transferencia</h3>
            <p style={{ fontSize: '16px', color: '#666', fontStyle: 'italic', margin: '0 0 30px 0' }}>"Escanea para copiar los números de cuenta"</p>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
               <QRCodeSVG value={`${baseUrl}/transferencias`} size={250} level="Q" bgColor="#ffffff" fgColor="#000000" />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', margin: 0 }}>{displayBaseUrl}/transferencias</p>
          </div>
        </div>
      </div>

      {/* 🚀 MODAL NEO-BENTO DE PANTALLA COMPLETA DEL QR */}
      {createPortal(
        <AnimatePresence>
          {previewQR && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setPreviewQR(false)}
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
                  onClick={() => setPreviewQR(false)} 
                  className="absolute top-6 right-6 text-gray-400 md:hover:text-gray-800 dark:md:hover:text-white bg-gray-100 dark:bg-gray-800 lya:text-lya-text/40 lya:hover:text-lya-text lya:bg-lya-bg p-3 rounded-full transition-all md:hover:scale-110 outline-none select-none"
                >
                  <X size={20} strokeWidth={2.5} className="pointer-events-none" />
                </motion.button>
                
                <div className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 lya:bg-lya-secondary/10 lya:text-lya-secondary px-5 py-2 rounded-full text-[10px] font-black tracking-widest uppercase mb-6 mt-4 border border-orange-200 dark:border-orange-800/50 lya:border-lya-secondary/30 text-center">
                  Escanear para copiar
                </div>
                
                <h2 className="text-4xl font-black text-gray-900 dark:text-white lya:text-lya-text mb-8 tracking-tighter text-center truncate w-full">
                  Cuentas 𝓛𝔂𝓪
                </h2>

                <div className="bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg p-8 rounded-[2.5rem] shadow-inner border-2 border-dashed border-gray-200 dark:border-gray-700 lya:border-lya-border/40 mb-8 flex items-center justify-center w-full relative overflow-hidden">
                  <QRCodeSVG 
                     value={`${baseUrl}/transferencias`} 
                     size={220} 
                     bgColor="transparent" 
                     fgColor={document.documentElement.classList.contains('dark') ? "#ffffff" : "#000000"} 
                     level="Q"
                  />
                </div>

                <div className="w-full bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg p-4 rounded-2xl flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 shadow-sm">
                  <LinkIcon className="w-5 h-5 text-gray-500 lya:text-lya-text/50 shrink-0" />
                  <span className="text-base text-gray-700 dark:text-gray-300 lya:text-lya-text/80 font-black tracking-widest text-center">
                    {displayBaseUrl}/transferencias
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* MODAL DE DESCARGA PDF DE TICKETS FÍSICOS (EL ORIGINAL) */}
      {createPortal(
        <AnimatePresence>
          {showPrintModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => { if (!isPrinting) setShowPrintModal(false) }} 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
              >
                <div className="mx-auto bg-emerald-500/10 lya:bg-lya-primary/10 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                  <Download size={40} className="text-emerald-500 lya:text-lya-primary" />
                </div>
                
                <h3 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-2">
                  Descargar PDF
                </h3>
                
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8 text-center leading-relaxed">
                  ¿Cuántos tickets de datos bancarios deseas generar en el documento?
                </p>
                
                <div className="flex items-center justify-center gap-6 mb-10">
                  <motion.button 
                    whileTap={!isPrinting ? { scale: 0.9 } : {}}
                    onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))} 
                    disabled={isPrinting}
                    className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-2xl font-bold dark:text-white lya:text-lya-text flex items-center justify-center md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors disabled:opacity-50 outline-none"
                  >
                    -
                  </motion.button>
                  <span className="text-4xl font-black dark:text-white lya:text-lya-text w-16 text-center">
                    {printQuantity}
                  </span>
                  <motion.button 
                    whileTap={!isPrinting ? { scale: 0.9 } : {}}
                    onClick={() => setPrintQuantity(printQuantity + 1)} 
                    disabled={isPrinting}
                    className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-2xl font-bold dark:text-white lya:text-lya-text flex items-center justify-center md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors disabled:opacity-50 outline-none"
                  >
                    +
                  </motion.button>
                </div>
                
                <div className="flex gap-4">
                  <motion.button 
                    whileTap={!isPrinting ? { scale: 0.95 } : {}}
                    onClick={() => setShowPrintModal(false)} 
                    disabled={isPrinting}
                    className="flex-1 py-4 font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors disabled:opacity-50 outline-none"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button 
                    whileTap={!isPrinting ? { scale: 0.95 } : {}}
                    onClick={executeDownloadPDF} 
                    disabled={isPrinting}
                    className="flex-1 py-4 font-bold text-white bg-gray-900 dark:bg-emerald-500 lya:bg-lya-primary rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 outline-none"
                  >
                    {isPrinting ? (
                      <><Loader2 className="animate-spin" size={18} /> Generando...</>
                    ) : (
                      "Descargar"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* MODAL ELIMINAR CUENTA */}
      {createPortal(
        <AnimatePresence>
          {accountToDelete && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={() => !isDeleting && setAccountToDelete(null)} 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }} 
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="relative bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center"
              >
                <div className="mx-auto bg-red-500/10 w-24 h-24 rounded-full flex items-center justify-center mb-6">
                  <Trash2 size={40} className="text-red-500" />
                </div>
                
                <h3 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-2">
                  ¿Eliminar Cuenta?
                </h3>
                
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8 text-justify leading-relaxed">
                  Estás a punto de eliminar la cuenta de <strong>{accountToDelete.bank_name}</strong>. Esta acción no se puede deshacer.
                </p>
                
                <div className="flex gap-4">
                  <motion.button 
                    whileTap={!isDeleting ? { scale: 0.95 } : {}}
                    onClick={() => setAccountToDelete(null)} 
                    disabled={isDeleting}
                    className="flex-1 py-4 font-bold text-gray-500 bg-gray-50 dark:bg-gray-800 lya:bg-lya-bg rounded-2xl md:hover:bg-gray-100 dark:md:hover:bg-gray-700 transition-colors disabled:opacity-50 outline-none"
                  >
                    Cancelar
                  </motion.button>
                  <motion.button 
                    whileTap={!isDeleting ? { scale: 0.95 } : {}}
                    onClick={handleDeleteConfirm} 
                    disabled={isDeleting}
                    className="flex-1 py-4 font-bold text-white bg-red-500 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 outline-none"
                  >
                    {isDeleting ? (
                      <><Loader2 className="animate-spin" size={20} /> Eliminando...</>
                    ) : (
                      "Eliminar"
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
};