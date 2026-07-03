// src/modules/admin/views/settings-tabs/UsersTab.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Mail, Eye, EyeOff, Loader2, Save, Edit2, UserX, UserCheck, Info, List, ArchiveRestore, X } from 'lucide-react';
import client from '../../../../api/client';

const StatCard = ({ title, value, icon: Icon, borderClass, iconColors, onClick, isActive }) => (
  <div 
    onClick={onClick}
    className={`bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-2xl p-4 shadow-sm border-l-4 flex justify-between items-center transition-all ${onClick ? 'cursor-pointer active:scale-95 hover:shadow-md' : ''} ${borderClass} ${isActive ? 'ring-1 ring-gray-200 dark:ring-gray-700 lya:ring-lya-border/50 shadow-md opacity-100 scale-[1.02]' : 'opacity-90 hover:opacity-100'}`}
  >
    <div>
      <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 lya:text-lya-text/60 uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-xl font-black text-gray-900 dark:text-white lya:text-lya-text">{value}</h3>
    </div>
    <div className={`p-2.5 rounded-xl bg-opacity-10 dark:bg-opacity-20 lya:bg-opacity-20 ${iconColors.bg}`}>
      <Icon size={20} className={iconColors.text} />
    </div>
  </div>
);

export const UsersTab = ({ showNotification, globalScroll }) => {
  const [systemUsers, setSystemUsers] = useState([]);
  const [userForm, setUserForm] = useState({ id: '', fullName: '', username: '', email: '', password: '', role: 'Empleado', isActive: true });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const [mobileView, setMobileView] = useState('list');
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers(true);
  }, []);

  const fetchUsers = async (isInitialLoad = false) => {
    if (isInitialLoad) setFetching(true);
    try {
      const res = await client.get('/users');
      if (Array.isArray(res.data)) {
        setSystemUsers(res.data);
      }
    } catch (err) {
      showNotification('error', "Error de red al obtener los usuarios del sistema");
    } finally {
      if (isInitialLoad) setFetching(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'US';
    const cleanName = name.trim();
    const words = cleanName.split(/\s+/); 
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return cleanName.substring(0, 2).toUpperCase();
  };

  const handleUserSubmit = async () => {
    if (!userForm.fullName || !userForm.username) {
      return showNotification('error', "Nombre completo y nombre de usuario requeridos");
    }
    if (!editingUserId && !userForm.password) {
      return showNotification('error', "La contraseña es requerida para nuevos usuarios");
    }

    setLoading(true);
    
    try {
      if (editingUserId) {
        const response = await client.put(`/users/${editingUserId}`, userForm);
        if (response.data && response.data.changed === false) {
          showNotification('success', response.data.message);
        } else {
          showNotification('success', response.data.message || "Usuario actualizado exitosamente");
        }
      } else {
        await client.post('/users', userForm);
        showNotification('success', "¡Personal registrado y credenciales creadas!");
      }

      resetUserForm();
      await fetchUsers(false);
      setMobileView('list');
    } catch (e) {
      showNotification('error', e.response?.data?.message || "Error al procesar la transacción");
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    setActionLoadingId(id);
    try {
      const nextStatus = !currentStatus;
      await client.put(`/users/${id}`, { isActive: nextStatus });
      showNotification('success', nextStatus ? "Acceso al POS activado" : "Acceso revocado correctamente");
      setSystemUsers(systemUsers.map(u => u.id === id ? { ...u, isActive: nextStatus } : u));
    } catch (e) {
      showNotification('error', "No se pudo cambiar el estado de la credencial");
    } finally {
      setActionLoadingId(null);
    }
  };

  const editUser = (usr) => {
    setEditingUserId(usr.id);
    setUserForm({ 
      id: usr.id, 
      fullName: usr.fullName || '', 
      username: usr.username || '', 
      email: usr.email || '', 
      role: usr.role || 'Empleado', 
      isActive: usr.isActive, 
      password: '' 
    }); 
    setShowPassword(false);
    setMobileView('form');
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm({ id: '', fullName: '', username: '', email: '', password: '', role: 'Empleado', isActive: true });
    setShowPassword(false);
    setMobileView('list');
  };

  const activeUsers = systemUsers.filter(u => u.isActive);
  const inactiveUsers = systemUsers.filter(u => !u.isActive);

  if (fetching) {
    return (
      <div className="h-full w-full flex-1 flex flex-col items-center justify-center">
        <motion.div
          animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="w-24 h-24 bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl flex items-center justify-center mb-6 border border-gray-100 dark:border-gray-700 lya:border-lya-border/40"
        >
          <Users size={40} className="text-blue-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight text-center">
          Cargando Usuarios
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2 text-center">
          <Loader2 size={16} className="animate-spin text-blue-500 lya:text-lya-primary" /> Sincronizando credenciales y roles...
        </p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`flex flex-col w-full transition-all duration-300 ${globalScroll ? 'space-y-6' : 'h-full overflow-hidden'}`}
    >
      <div className={`shrink-0 bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 flex flex-col sm:flex-row items-center sm:items-start gap-4 ${globalScroll ? '' : 'mb-6 z-10'}`}>
        <div className="bg-blue-600 lya:bg-lya-primary p-4 rounded-[1.5rem] text-white shadow-lg shrink-0">
          <Users size={32} />
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">
            Control de Usuarios
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-2 text-justify sm:text-left">
            Administra los accesos al sistema, roles y credenciales para el personal de <strong>𝓛𝔂𝓪</strong>.
          </p>
        </div>
      </div>

      <div className="lg:hidden flex bg-gray-200/50 dark:bg-gray-800 lya:bg-lya-surface p-1 rounded-2xl shrink-0 mb-4 mx-1">
        <button 
          onClick={() => setMobileView('list')}
          className={`flex-1 py-3 text-sm font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all ${
            mobileView === 'list' 
              ? 'bg-white dark:bg-gray-700 lya:bg-lya-primary text-blue-600 dark:text-blue-400 lya:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <List size={16} /> Lista
        </button>
        <button 
          onClick={() => { resetUserForm(); setMobileView('form'); }}
          className={`flex-1 py-3 text-sm font-bold rounded-[14px] flex items-center justify-center gap-2 transition-all ${
            mobileView === 'form' 
              ? 'bg-white dark:bg-gray-700 lya:bg-lya-primary text-blue-600 dark:text-blue-400 lya:text-white shadow-sm' 
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
          }`}
        >
          <Shield size={16} /> Agregar
        </button>
      </div>

      <div className={`flex-1 w-full relative flex flex-col ${globalScroll ? 'space-y-6' : 'overflow-y-auto custom-scrollbar pr-1 sm:pr-2 pb-4 space-y-6'}`}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 items-start">
          
          <div className={`${mobileView === 'form' ? 'block' : 'hidden'} lg:block bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2.5rem] p-8 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 h-fit lg:sticky lg:top-0`}>
            <h3 className="font-bold text-gray-800 dark:text-white lya:text-lya-text mb-6 text-xl flex items-center gap-3 border-b border-gray-50 dark:border-gray-700 lya:border-lya-border/20 pb-4">
              <Shield size={24} className="text-blue-500 lya:text-lya-primary" />
              {editingUserId ? 'Editar Credenciales' : 'Registrar Empleado'}
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-1.5 flex items-center gap-1">
                  Nombre (Identificar) <Info size={12} title="Este nombre se imprime en el ticket" className="cursor-help" />
                </label>
                <input 
                  type="text" 
                  value={userForm.fullName} 
                  onChange={e => setUserForm({...userForm, fullName: e.target.value})} 
                  placeholder="Ej. Juan Pérez"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm" 
                />
                <p className="text-[10px] font-medium text-gray-400 ml-2 mt-1 italic">
                  * Este es el nombre que aparecerá en el ticket ("Atendido por").
                </p>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-1.5">
                  Nombre de Usuario (Login)
                </label>
                <input 
                  type="text" 
                  value={userForm.username} 
                  onChange={e => setUserForm({...userForm, username: e.target.value})} 
                  placeholder="Ej. Juanito"
                  className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm font-mono" 
                />
              </div>
              
              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-1.5">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400 lya:text-lya-text/40" />
                  </div>
                  <input 
                    type="email" 
                    value={userForm.email} 
                    onChange={e => setUserForm({...userForm, email: e.target.value})} 
                    placeholder="empleado@correo.com"
                    className="w-full pl-12 pr-5 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm" 
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-1.5">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={userForm.password} 
                    onChange={e => setUserForm({...userForm, password: e.target.value})} 
                    placeholder={editingUserId ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                    className="w-full pl-5 pr-12 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-primary outline-none transition-all dark:text-white lya:text-lya-text text-sm" 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 lya:hover:text-lya-primary transition-colors outline-none"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase text-gray-400 dark:text-gray-500 lya:text-lya-text/60 block ml-2 mb-1.5">
                  Rol Asignado
                </label>
                <div className="relative">
                  <select 
                    value={userForm.role} 
                    onChange={e => setUserForm({...userForm, role: e.target.value})}
                    className="w-full pl-5 pr-12 py-4 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 outline-none focus:ring-2 focus:ring-blue-500 lya:focus:ring-lya-primary dark:text-white lya:text-lya-text text-sm font-bold appearance-none cursor-pointer"
                  >
                    <option value="Empleado">Empleado</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={resetUserForm} 
                  className={`flex-1 py-4 bg-gray-100 dark:bg-gray-700 lya:bg-lya-bg text-gray-500 dark:text-gray-300 lya:text-lya-text font-bold rounded-2xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors active:scale-95 ${(!editingUserId && mobileView !== 'form') ? 'hidden lg:block' : ''}`}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUserSubmit} 
                  disabled={loading || !userForm.fullName || !userForm.username || (!editingUserId && !userForm.password)}
                  className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 lya:bg-lya-primary lya:hover:bg-lya-primary/90 text-white font-bold rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:hover:bg-blue-600"
                >
                  {loading ? <><Loader2 className="animate-spin" size={18} /> Procesando...</> : <><Save size={18} /> {editingUserId ? 'Guardar Cambios' : 'Crear Usuario'}</>}
                </button>
              </div>
            </div>
          </div>

          <div className={`${mobileView === 'list' ? 'block' : 'hidden'} lg:block lg:col-span-2 space-y-4`}>
            
            <div className="grid grid-cols-2 gap-4 mb-2">
               <StatCard 
                title="Usuarios Activos" 
                value={activeUsers.length} 
                icon={UserCheck} 
                borderClass="border-emerald-500 lya:border-emerald-400" 
                iconColors={{ bg: "bg-emerald-500 lya:bg-emerald-500", text: "text-emerald-500 lya:text-emerald-500" }} 
              />
              <StatCard 
                title="Suspendidos (Ocultos)" 
                value={inactiveUsers.length} 
                icon={UserX} 
                borderClass="border-red-500 lya:border-red-400" 
                iconColors={{ bg: "bg-red-500 lya:bg-red-500", text: "text-red-500 lya:text-red-500" }} 
                onClick={() => setIsTrashModalOpen(true)}
                isActive={isTrashModalOpen}
              />
            </div>

            <div className="flex items-center justify-between bg-white dark:bg-gray-800 lya:bg-lya-surface px-6 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/30 shadow-sm mt-4">
              <h4 className="text-xs font-black uppercase text-gray-700 dark:text-gray-300 lya:text-lya-text tracking-widest flex items-center gap-2">
                <Users size={16} className="text-blue-500 lya:text-lya-primary"/> Personal Activo
              </h4>
              <p className="text-[11px] text-gray-400 italic hidden sm:block">Solo usuarios con acceso</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {activeUsers.length === 0 ? (
                  <div className="col-span-1 sm:col-span-2 p-8 text-center bg-gray-50 dark:bg-gray-900/50 lya:bg-lya-bg/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 lya:border-lya-border/40">
                    <p className="text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-bold">No hay usuarios activos. Crea uno en el formulario.</p>
                  </div>
                ) : (
                  activeUsers.map((usr, index) => (
                    <motion.div 
                      key={usr.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="p-6 rounded-[2rem] border bg-white dark:bg-gray-800 lya:bg-lya-surface shadow-sm relative transition-all flex flex-col justify-between hover:shadow-md border-gray-100 dark:border-gray-700 lya:border-lya-border/40 hover:border-blue-200 lya:hover:border-lya-primary/30"
                    >
                      <div className="flex items-start justify-between mb-5">
                        
                        <div className="flex items-center gap-3.5 pr-2 flex-1 min-w-0">
                          <div className={`w-12 h-12 rounded-[1.2rem] flex items-center justify-center text-sm font-black text-white shadow-sm shrink-0 ${
                            usr.role === 'Administrador' 
                              ? 'bg-purple-600 dark:bg-purple-500'
                              : 'bg-blue-600 lya:bg-lya-primary'
                          }`}>
                            {getInitials(usr.fullName)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white lya:text-lya-text leading-tight truncate">
                              {usr.fullName}
                            </h4>
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 lya:text-lya-text/60 font-medium mt-0.5 truncate">
                              @{usr.username}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5 shrink-0 ml-2">
                          <button 
                            onClick={() => editUser(usr)} 
                            disabled={actionLoadingId === usr.id}
                            className="p-2.5 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600 lya:bg-lya-bg rounded-xl text-blue-500 lya:text-lya-primary transition-all active:scale-90 border border-gray-100 dark:border-gray-600 lya:border-lya-border/40 disabled:opacity-50" 
                            title="Editar usuario"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(usr.id, usr.isActive)} 
                            disabled={actionLoadingId === usr.id}
                            className="p-2.5 rounded-xl transition-all active:scale-90 border bg-gray-50 dark:bg-gray-700 lya:bg-lya-bg text-red-500 hover:bg-red-50 dark:hover:bg-gray-600 border-gray-100 dark:border-gray-600 lya:border-lya-border/40 disabled:opacity-50 flex items-center justify-center" 
                            title="Desactivar Acceso"
                          >
                            {actionLoadingId === usr.id ? <Loader2 size={16} className="animate-spin text-gray-500" /> : <UserX size={16} />}
                          </button>
                        </div>
                      </div>

                      {usr.email && (
                        <div className="mb-4 text-[11px] font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/70 flex items-center gap-2 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-700 lya:border-lya-border/20">
                          <Mail size={14} className="shrink-0" /> <span className="truncate">{usr.email}</span>
                        </div>
                      )}

                      <div className="pt-4 border-t border-gray-100 dark:border-gray-700/80 lya:border-lya-border/20 flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border ${
                          usr.role === 'Administrador' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50' 
                            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 lya:bg-lya-primary/10 lya:text-lya-primary lya:border-lya-primary/30'
                        }`}>
                          {usr.role}
                        </span>
                        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/20 lya:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/50 lya:border-emerald-500/20 px-3 py-1.5 rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-black tracking-wide text-emerald-600 dark:text-emerald-400">
                            ACTIVO
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {isTrashModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 lya:bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-gray-100 dark:border-gray-800 lya:border-lya-border/40"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg/50">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-500">
                    <UserX size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 dark:text-gray-100 lya:text-lya-text">Usuarios Suspendidos</h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5">Personal con acceso bloqueado al sistema</p>
                  </div>
                </div>
                <button onClick={() => setIsTrashModalOpen(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 lya:hover:bg-lya-border/30 text-gray-500 dark:text-gray-400 lya:text-lya-text/50 lya:hover:text-lya-text rounded-full transition-colors"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gray-50/30 dark:bg-gray-950/20 lya:bg-lya-bg/30">
                {inactiveUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-10 text-center">
                    <UserCheck size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-bold">No hay personal suspendido en este momento.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inactiveUsers.map((usr) => (
                      <div key={usr.id} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-2xl shadow-sm border border-red-100 dark:border-red-900/30 opacity-80 hover:opacity-100 transition-opacity">
                        
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                          <div className="h-12 w-12 flex-shrink-0 rounded-xl bg-gray-400 dark:bg-gray-700 flex items-center justify-center border border-gray-200 dark:border-gray-600 text-white font-black text-sm">
                            {getInitials(usr.fullName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{usr.fullName}</h4>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">@{usr.username} • {usr.role}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0 ml-2">
                           <button 
                            onClick={() => {
                              editUser(usr);
                              setIsTrashModalOpen(false);
                            }} 
                            disabled={actionLoadingId === usr.id}
                            className="p-2.5 bg-gray-50 hover:bg-blue-50 dark:bg-gray-800 dark:hover:bg-gray-700 lya:bg-lya-bg rounded-xl text-blue-500 transition-all active:scale-90 disabled:opacity-50" 
                            title="Editar usuario"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(usr.id, usr.isActive)}
                            disabled={actionLoadingId === usr.id}
                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 active:scale-95 disabled:opacity-50"
                          >
                            {actionLoadingId === usr.id ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                            <span className="hidden sm:inline">
                              {actionLoadingId === usr.id ? 'Restaurando...' : 'Restaurar'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};