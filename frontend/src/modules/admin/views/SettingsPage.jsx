// src/modules/admin/views/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Save, Landmark, Plus, Trash2, Edit2, Check, Printer, 
  Settings, Sliders, Info, Palette, Monitor, 
  Maximize, Minimize, Layout, Wifi, Usb, 
  RefreshCw, AlertCircle, Barcode, Keyboard, Users, Shield, UserX, UserCheck
} from 'lucide-react';
import client from '../../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { ThemeSelector } from '../../../components/ThemeSelector';

export const SettingsPage = ({ uiSize, setUiSize, activeTab }) => {
  const [accounts, setAccounts] = useState([]);
  
  // Estados de Configuración de Hardware
  const [printerConfig, setPrinterConfig] = useState({ type: 'usb', interface: '' });
  const [barcodeConfig, setBarcodeConfig] = useState({ autoAdd: true }); 
  const [lastScanned, setLastScanned] = useState(''); 

  // --- CONTROL DE USUARIOS REALES (CONECTADO A BD) ---
  const [systemUsers, setSystemUsers] = useState([]);
  const [userForm, setUserForm] = useState({ id: '', name: '', username: '', password: '', role: 'Empleado', is_active: true });
  const [editingUserId, setEditingUserId] = useState(null);

  const [isScanning, setIsScanning] = useState(false);
  const [detectedPorts, setDetectedPorts] = useState([]);
  const [printerStatus, setPrinterStatus] = useState('unknown'); 

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' });

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printQuantity, setPrintQuantity] = useState(2);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Carga asíncrona real desde la API de base de datos
  const loadInitialData = async () => {
    setFetching(true);
    try {
      const [resSettings, resUsers] = await Promise.all([
        client.get('/settings'),
        client.get('/users') // Petición real al backend
      ]);

      if (resSettings.data) {
        if (Array.isArray(resSettings.data.bank_accounts)) setAccounts(resSettings.data.bank_accounts);
        if (resSettings.data.printer_config) setPrinterConfig(resSettings.data.printer_config);
        if (resSettings.data.barcode_config) setBarcodeConfig(resSettings.data.barcode_config);
      }

      if (Array.isArray(resUsers.data)) {
        setSystemUsers(resUsers.data);
      }
    } catch (err) {
      console.error("Error sincronizando con la API del POS:", err);
      toast.error("Error de red al obtener los datos del sistema");
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error al entrar en pantalla completa: ${err.message}`);
        toast.error("El navegador bloqueó la pantalla completa automática.");
      });
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  const handleSaveToServer = async () => {
    setLoading(true);
    try {
      await client.put('/settings', { 
        bank_accounts: accounts,
        printer_config: printerConfig,
        barcode_config: barcodeConfig
      });
      toast.success("¡Configuración de hardware y cuentas guardada!");
    } catch (e) {
      toast.error("Error de base de datos al guardar ajustes");
    } finally { setLoading(false); }
  };

  // --- MÉTODOS DE BASE DE DATOS: CUENTAS BANCARIAS ---
  const handleAddOrUpdate = () => {
    if (!form.bank_name || !form.account_number) return toast.error("Completa los campos obligatorios");
    if (editingId) {
      setAccounts(accounts.map(acc => acc.id === editingId ? form : acc));
      toast.success("Cuenta modificada en lista temporal");
    } else {
      setAccounts([...accounts, { ...form, id: Date.now().toString() }]);
      toast.success("Cuenta agregada a lista temporal");
    }
    resetForm();
  };

  const editAccount = (acc) => { setEditingId(acc.id); setForm(acc); };
  const resetForm = () => { setEditingId(null); setForm({ id: '', bank_name: '', account_number: '', account_holder: '', clabe: '' }); };
  const deleteAccount = (id) => { setAccounts(accounts.filter(a => a.id !== id)); toast.success("Cuenta removida"); };

  // --- CRUD REAL CON BASE DE DATOS: CONTROL DE USUARIOS ---
  const handleUserSubmit = async () => {
    if (!userForm.name || !userForm.username) return toast.error("Nombre y nick de usuario requeridos");
    if (!editingUserId && !userForm.password) return toast.error("La contraseña es requerida para nuevos usuarios");

    setLoading(true);
    try {
      if (editingUserId) {
        // LLAMADA PUT REAL AL BACKEND: Actualización en MySQL
        await client.put(`/users/${editingUserId}`, userForm);
        toast.success("Usuario actualizado en la base de datos");
      } else {
        // LLAMADA POST REAL AL BACKEND: Creación en MySQL
        await client.post('/users', userForm);
        toast.success("¡Nuevo personal registrado en base de datos!");
      }
      resetUserForm();
      // Recarga limpia desde la base de datos para asegurar consistencia
      const resUsers = await client.get('/users');
      if (Array.isArray(resUsers.data)) setSystemUsers(resUsers.data);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.message || "Error al procesar la transacción de usuario");
    } finally {
      setLoading(false);
    }
  };

  // Soft Delete Dinámico: Cambia el booleano `is_active` de Sequelize
  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      await client.put(`/users/${id}`, { is_active: nextStatus });
      toast.success(nextStatus ? "Acceso al POS activado" : "Acceso revocado correctamente");
      
      setSystemUsers(systemUsers.map(u => u.id === id ? { ...u, is_active: nextStatus } : u));
    } catch (e) {
      toast.error("No se pudo cambiar el estado de la credencial");
    }
  };

  const editUser = (usr) => {
    setEditingUserId(usr.id);
    setUserForm({ ...usr, password: '' }); 
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm({ id: '', name: '', username: '', password: '', role: 'Empleado', is_active: true });
  };

  // --- MANIPULACIÓN DEL HARDWARE ---
  const scanPrinters = async () => {
    setIsScanning(true);
    setPrinterStatus('unknown');
    try {
      const response = await client.get('/hardware/scan-printers');
      if (response.data && response.data.ports) {
        setDetectedPorts(response.data.ports);
        toast.success("Puertos de hardware analizados");
      } else {
        setDetectedPorts(['USB001', 'COM3', '/dev/usb/lp0']);
      }
    } catch (e) {
      setDetectedPorts(['USB001', 'COM3']);
    } finally {
      setIsScanning(false);
    }
  };

  const handleTestPrint = async () => {
    if (!printerConfig.interface) return toast.error("Falta especificar la interfaz.");
    setPrinterStatus('unknown');
    toast.loading("Enviando ráfaga a la miniprinter...", { id: 'print_test' });
    try {
      await client.post('/hardware/print-test', printerConfig);
      toast.success("Ticket de prueba impreso", { id: 'print_test' });
      setPrinterStatus('online'); 
    } catch (e) {
      toast.error("La impresora no respondió", { id: 'print_test' });
      setPrinterStatus('offline');
    }
  };

  const executePrint = () => {
    const cantidad = parseInt(printQuantity);
    if (isNaN(cantidad) || cantidad <= 0) return;
    setShowPrintModal(false);
    
    const tarjetasArray = Array.from({ length: cantidad });
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute'; iframe.style.width = '0px'; iframe.style.height = '0px'; iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const htmlContent = `
      <html>
        <head>
          <title>Tarjetas de Pago - LyA</title>
          <style>
            body { font-family: sans-serif; padding: 20px; background: white; }
            .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
            .card { border: 2px dashed #D4A373; padding: 20px; border-radius: 15px; text-align: center; page-break-inside: avoid; }
            .logo { font-size: 24px; font-weight: bold; color: #4A2B29; margin-bottom: 5px; letter-spacing: -0.11em; transform: scaleX(0.95); display: inline-block; }
            .subtitle { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 15px; }
            .bank { font-size: 16px; font-weight: 800; color: #D4A373; margin: 10px 0; }
            .info-group { margin-bottom: 8px; text-align: left; background: #f9f9f9; padding: 8px; border-radius: 8px; }
            .label { font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; display: block; }
            .val { font-size: 13px; font-weight: bold; color: #333; word-break: break-all; }
            .footer { font-size: 9px; margin-top: 15px; font-style: italic; color: #666; line-height: 1.2; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="grid">
            ${tarjetasArray.map(() => `
              <div class="card">
                <div class="logo"> 𝓛𝔂𝓐 </div>
                <div class="subtitle">Datos de Transferencia</div>
                ${accounts.map(acc => `
                  <div class="bank">${acc.bank_name}</div>
                  <div class="info-group"><span class="label">Titular</span><span class="val">${acc.account_holder}</span></div>
                  <div class="info-group"><span class="label">Cuenta/Tarjeta</span><span class="val">${acc.account_number}</span></div>
                  ${acc.clabe ? `<div class="info-group"><span class="label">CLABE</span><span class="val">${acc.clabe}</span></div>` : ''}
                `).join('<hr style="border: 0; border-top: 1px solid #eee; margin: 15px 0;">')}
                <div class="footer"><b>Importante:</b> Escribe tu número de mesa o folio en el concepto.<br>Envía tu comprobante por WhatsApp. ¡Gracias!</div>
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }}
      className="h-full w-full bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg transition-colors duration-300 overflow-y-auto custom-scrollbar p-4 md:p-6"
    >
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-20">
        
        {/* ==========================================================
            VISTA INDEPENDIENTE: CONTROL DE USUARIOS
        ========================================================== */}
        {activeTab === 'usuarios' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex items-center gap-4">
              <div className="bg-blue-600 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0">
                <Users size={28} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">
                  Control de Usuarios
                </h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">
                  Administra accesos, contraseñas y roles del personal de 𝓛𝔂𝓐
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 h-fit">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6 text-base flex items-center gap-2">
                  <Shield size={18} className="text-blue-500" />
                  {editingUserId ? 'Editar Credenciales' : 'Registrar Nuevo Empleado'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Nombre Completo</label>
                    <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Ej. Juan Pérez Maza"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Nombre de Usuario (Login)</label>
                    <input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} placeholder="Ej. juan_pos"
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Contraseña de Acceso</label>
                    <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} 
                      placeholder={editingUserId ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Rol Asignado</label>
                    <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm font-bold"
                    >
                      <option value="Empleado">Empleado (Solo Ventas y Agenda)</option>
                      <option value="Administrador">Administrador (Acceso Total)</option>
                    </select>
                  </div>
                  <div className="pt-2 flex gap-2">
                    {editingUserId && (
                      <button onClick={resetUserForm} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors">
                        Cancelar
                      </button>
                    )}
                    <button onClick={handleUserSubmit} disabled={loading}
                      className="flex-[2] py-3 bg-blue-600 lya:bg-lya-primary text-white font-bold rounded-xl text-xs shadow-md hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Save size={14} /> {editingUserId ? 'Actualizar Cambios' : 'Registrar Empleado'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Personal Registrado ({systemUsers.length})</h4>
                  <p className="text-[11px] text-gray-400 italic">Los empleados inactivos pierden acceso</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {systemUsers.map(usr => (
                    <div key={usr.id} className={`p-5 rounded-3xl border bg-white dark:bg-gray-800 lya:bg-lya-surface shadow-sm relative overflow-hidden transition-all flex flex-col justify-between ${usr.is_active ? 'border-gray-100 dark:border-gray-700' : 'border-red-200/50 dark:border-red-900/30 opacity-75'}`}>
                      <div>
                        <div className="flex justify-between items-start">
                          <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full ${usr.role === 'Administrador' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                            {usr.role}
                          </span>
                          <div className="flex gap-1.5">
                            <button onClick={() => editUser(usr)} className="p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg text-blue-500 hover:scale-105 transition-transform"><Edit2 size={14} /></button>
                            <button onClick={() => toggleUserStatus(usr.id, usr.is_active)} className={`p-1.5 bg-gray-50 dark:bg-gray-700 rounded-lg transition-transform hover:scale-105 ${usr.is_active ? 'text-red-500' : 'text-emerald-500'}`}>{usr.is_active ? <UserX size={14} /> : <UserCheck size={14} />}</button>
                          </div>
                        </div>
                        <div className="mt-3">
                          <p className="text-sm font-black text-gray-800 dark:text-white leading-tight">{usr.name}</p>
                          <p className="text-xs text-gray-400 font-mono mt-0.5">@{usr.username}</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-medium">Estado de cuenta:</span>
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${usr.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
                          <span className={`text-[10px] font-black ${usr.is_active ? 'text-emerald-600' : 'text-red-500'}`}>{usr.is_active ? 'ACTIVO' : 'SUSPENDIDO'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==========================================================
            VISTA INDEPENDIENTE: CUENTAS BANCARIAS
        ========================================================== */}
        {activeTab === 'cuentas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex items-center gap-4">
              <div className="bg-emerald-500 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0"><Landmark size={28} /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Cuentas Bancarias</h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Gestión de cuentas, CLABEs y tarjetas de pago</p>
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
                        <input type="text" value={form.account_number} onChange={e => setForm({...form, account_number: e.target.value})} 
                          className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase text-gray-400 mb-2 block ml-1">CLABE (18 dígitos)</label>
                        <input type="text" value={form.clabe} onChange={e => setForm({...form, clabe: e.target.value})} 
                          className="w-full px-5 py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-emerald-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text" />
                      </div>
                    </div>

                    <button onClick={handleAddOrUpdate} className="w-full py-4 bg-emerald-500/10 lya:bg-lya-primary/10 text-emerald-600 dark:text-emerald-400 lya:text-lya-primary font-bold rounded-2xl hover:bg-emerald-500 hover:text-white lya:hover:bg-lya-primary transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                      {editingId ? <><Check size={20}/> Actualizar Cuenta</> : <><Plus size={20}/> Añadir a la Lista</>}
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
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 italic py-20">
                          <Sliders size={48} className="opacity-10 mb-4" />
                          <p className="text-sm">Aún no has agregado cuentas bancarias.</p>
                        </div>
                      ) : (
                        accounts.map(acc => (
                          <motion.div key={acc.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                            className="group relative p-5 rounded-3xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 bg-gray-50/50 dark:bg-gray-900/40 lya:bg-lya-bg/30 hover:border-emerald-500/30 lya:hover:border-lya-primary/30 transition-all">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-sm font-black text-gray-800 dark:text-white lya:text-lya-text uppercase tracking-tight">{acc.bank_name}</p>
                                <p className="text-xs text-gray-400 font-mono mt-1">{acc.account_number}</p>
                                <p className="text-[10px] text-gray-400 mt-2 italic">Titular: {acc.account_holder}</p>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => editAccount(acc)} className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-xl shadow-sm text-blue-500 hover:scale-110 transition-transform"><Edit2 size={16}/></button>
                                <button onClick={() => deleteAccount(acc.id)} className="p-2 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-xl shadow-sm text-red-500 hover:scale-110 transition-transform"><Trash2 size={16}/></button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="pt-6 border-t border-gray-100 dark:border-gray-700 lya:border-lya-border/20 flex flex-col sm:flex-row gap-3">
                    <button onClick={() => accounts.length > 0 ? setShowPrintModal(true) : toast.error("No hay cuentas para imprimir")}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text border border-gray-200 dark:border-gray-600 lya:border-lya-border/40 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-all active:scale-95"
                    >
                      <Printer size={18} /> Imprimir Tarjetas
                    </button>
                    <button onClick={handleSaveToServer} disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-black dark:bg-emerald-500 dark:hover:bg-emerald-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50"
                    >
                      <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Cuentas'}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </motion.div>
        )}

        {/* ==========================================================
            VISTA INDEPENDIENTE: INTERFAZ Y PANTALLA
        ========================================================== */}
        {activeTab === 'interfaz' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex items-center gap-4">
              <div className="bg-purple-500 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0"><Palette size={28} /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Interfaz y Pantalla</h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Personaliza el aspecto, colores y tamaño visual de 𝓛𝔂𝓐</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0"><Palette size={20} /></div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Apariencia</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1">Personaliza los colores del sistema POS.</p>
                <div className="w-full h-[56px]"><ThemeSelector /></div>
              </section>

              <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 shrink-0"><Layout size={20} /></div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Tamaño de Interfaz</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1">Ajusta la escala visual para pantallas táctiles.</p>
                <div className="flex bg-gray-100 dark:bg-gray-900 lya:bg-lya-bg rounded-xl p-1.5 border border-gray-100 dark:border-gray-700/50 lya:border-lya-border/30 h-[56px] w-full">
                  {['small', 'medium', 'large'].map((size) => (
                    <button key={size} onClick={() => setUiSize(size)}
                      className={`flex-1 flex items-center justify-center text-sm font-bold rounded-lg transition-all ${
                        uiSize === size ? 'bg-white dark:bg-gray-700 lya:bg-lya-surface text-gray-900 dark:text-white lya:text-lya-primary shadow-sm lya:border lya:border-lya-border/30' : 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60 hover:text-gray-700 dark:hover:text-gray-200 lya:hover:text-lya-text'
                      }`}
                    >
                      {size === 'small' ? 'Chica' : size === 'medium' ? 'Media' : 'Grande'}
                    </button>
                  ))}
                </div>
              </section>

              <section className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 flex flex-col">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0"><Monitor size={20} /></div>
                  <h2 className="font-bold text-lg text-gray-900 dark:text-white lya:text-lya-text">Pantalla</h2>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-5 flex-1">Expande el sistema para una experiencia inmersiva libre de distracciones.</p>
                <button onClick={toggleFullscreen} className="w-full h-[56px] bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98] border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 text-sm">
                  {isFullscreen ? <Minimize size={18}/> : <Maximize size={18}/>} {isFullscreen ? 'Contraer' : 'Expandir'}
                </button>
              </section>
            </div>
            
            <div className="flex justify-end mt-4">
              <button onClick={handleSaveToServer} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black dark:bg-purple-500 dark:hover:bg-purple-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50">
                <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Interfaz'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ==========================================================
            VISTA INDEPENDIENTE: HARDWARE Y EQUIPOS
        ========================================================== */}
        {activeTab === 'hardware' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex items-center gap-4">
              <div className="bg-gray-900 dark:bg-gray-700 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0"><Printer size={28} /></div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">Administración de dispositivos físicos</h1>
                <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">Configuración de impresoras térmicas, lectores y periféricos locales de 𝓛𝔂𝓐</p>
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
                      {printerConfig.type === 'usb' && <button onClick={scanPrinters} disabled={isScanning} className="px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 lya:bg-lya-primary/10 lya:hover:bg-lya-primary/20 lya:text-lya-primary rounded-2xl font-bold flex items-center justify-center transition-colors disabled:opacity-50"><RefreshCw size={20} className={isScanning ? 'animate-spin' : ''} /></button>}
                    </div>
                  </div>

                  <div className="pt-2">
                    <button onClick={handleTestPrint} className="w-full py-3.5 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg text-gray-600 dark:text-gray-300 lya:text-lya-text font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 text-sm border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 active:scale-[0.98]"><Printer size={16}/> Realizar Prueba de Conexión</button>
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
              <button onClick={handleSaveToServer} disabled={loading} className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black dark:bg-orange-500 dark:hover:bg-orange-600 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white rounded-xl text-sm font-black shadow-lg transition-all active:scale-95 disabled:opacity-50">
                <Save size={18} /> {loading ? 'Guardando...' : 'Guardar Hardware'}
              </button>
            </div>
          </motion.div>
        )}

      </div>

      {/* --- MODAL DE IMPRESIÓN DE TARJETAS --- */}
      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPrintModal(false)} className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[2.5rem] shadow-2xl p-10 w-full max-w-sm border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 text-center">
              <div className="mx-auto bg-emerald-500/10 lya:bg-lya-primary/10 w-20 h-20 rounded-full flex items-center justify-center mb-6"><Printer size={36} className="text-emerald-500 lya:text-lya-primary" /></div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-2">Imprimir Tarjetas</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8">¿Cuántas tarjetas de datos bancarios deseas imprimir para tus mesas?</p>
              
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