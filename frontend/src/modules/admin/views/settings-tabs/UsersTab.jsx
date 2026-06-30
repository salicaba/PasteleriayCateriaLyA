// src/modules/admin/views/settings-tabs/UsersTab.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Mail, Eye, EyeOff, Loader2, Save, Edit2, UserX, UserCheck } from 'lucide-react';
import client from '../../../../api/client';

export const UsersTab = ({ showNotification }) => {
  const [systemUsers, setSystemUsers] = useState([]);
  const [userForm, setUserForm] = useState({ id: '', fullName: '', username: '', email: '', password: '', role: 'Empleado', isActive: true });
  const [editingUserId, setEditingUserId] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setFetching(true);
    try {
      const res = await client.get('/users');
      if (Array.isArray(res.data)) {
        setSystemUsers(res.data);
      }
    } catch (err) {
      showNotification('error', "Error de red al obtener los usuarios del sistema");
    } finally {
      setFetching(false);
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
    if (!userForm.fullName || !userForm.username) return showNotification('error', "Nombre completo y nombre de usuario requeridos");
    if (!editingUserId && !userForm.password) return showNotification('error', "La contraseña es requerida para nuevos usuarios");

    setLoading(true);
    
    try {
      if (editingUserId) {
        const response = await client.put(`/users/${editingUserId}`, userForm);
        
        if (response.data && response.data.changed === false) {
          showNotification('success', response.data.message);
        } else {
          showNotification('success', response.data.message || "Usuario actualizado en la base de datos");
        }
      } else {
        await client.post('/users', userForm);
        showNotification('success', "¡Personal registrado y credenciales enviadas!");
      }

      resetUserForm();
      await fetchUsers(); 
    } catch (e) {
      showNotification('error', e.response?.data?.message || "Error al procesar la transacción");
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (id, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      await client.put(`/users/${id}`, { isActive: nextStatus });
      showNotification('success', nextStatus ? "Acceso al POS activado" : "Acceso revocado correctamente");
      setSystemUsers(systemUsers.map(u => u.id === id ? { ...u, isActive: nextStatus } : u));
    } catch (e) {
      showNotification('error', "No se pudo cambiar el estado de la credencial");
    }
  };

  const editUser = (usr) => {
    setEditingUserId(usr.id);
    setUserForm({ id: usr.id, fullName: usr.fullName, username: usr.username, email: usr.email || '', role: usr.role, isActive: usr.isActive, password: '' }); 
    setShowPassword(false);
  };

  const resetUserForm = () => {
    setEditingUserId(null);
    setUserForm({ id: '', fullName: '', username: '', email: '', password: '', role: 'Empleado', isActive: true });
    setShowPassword(false);
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
          <Users size={40} className="text-blue-500 lya:text-lya-primary" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
          Cargando Usuarios
        </h2>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-500 lya:text-lya-primary" /> Sincronizando credenciales y roles...
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
        <div className="bg-blue-600 lya:bg-lya-primary p-3.5 rounded-2xl text-white shadow-lg shrink-0">
          <Users size={28} />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight leading-none">
            Control de Usuarios
          </h1>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-1">
            Administra accesos y envía credenciales por correo para 𝓛𝔂𝓪.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 lya:bg-lya-surface rounded-[2rem] p-6 shadow-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 h-fit sticky top-6">
          <h3 className="font-bold text-gray-800 dark:text-white mb-6 text-base flex items-center gap-2">
            <Shield size={18} className="text-blue-500 lya:text-lya-primary" />
            {editingUserId ? 'Editar Credenciales' : 'Registrar Nuevo Empleado'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Nombre (Identificar)</label>
              <input type="text" value={userForm.fullName} onChange={e => setUserForm({...userForm, fullName: e.target.value})} placeholder="Ej. Juan Pérez"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Nombre de Usuario (Login)</label>
              <input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} placeholder="Ej. Juanito"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm font-mono" />
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Correo Electrónico (Cualquier proveedor)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={16} className="text-gray-400" />
                </div>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="empleado@hotmail.com"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm" />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Contraseña de Acceso</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={userForm.password} 
                  onChange={e => setUserForm({...userForm, password: e.target.value})} 
                  placeholder={editingUserId ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white text-sm" 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase text-gray-400 block ml-1 mb-1">Rol Asignado</label>
              <div className="relative">
                <select 
                  value={userForm.role} 
                  onChange={e => setUserForm({...userForm, role: e.target.value})}
                  className="w-full pl-4 pr-12 py-3 bg-gray-50 dark:bg-gray-900 lya:bg-lya-bg rounded-xl border border-gray-100 dark:border-gray-700 lya:border-lya-border/40 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white text-sm font-bold appearance-none cursor-pointer"
                >
                  <option value="Empleado">Empleado</option>
                  <option value="Administrador">Administrador</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </div>
              </div>
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
                {loading ? (
                  <><Loader2 className="animate-spin" size={14} /> Espere...</>
                ) : (
                  <><Save size={14} /> {editingUserId ? 'Guardar Cambios' : 'Crear y Enviar'}</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-widest">Personal Registrado ({systemUsers.length})</h4>
            <p className="text-[11px] text-gray-400 italic">Administra los accesos al sistema</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {systemUsers.map((usr, index) => (
                <motion.div 
                  key={usr.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.03, type: "spring", stiffness: 200, damping: 20 }}
                  className={`p-5 rounded-2xl border bg-white dark:bg-gray-800 lya:bg-lya-surface shadow-sm relative transition-colors flex flex-col justify-between hover:shadow-md ${usr.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-red-200 dark:border-red-900/30 opacity-80'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm shrink-0 ${
                        !usr.isActive 
                          ? 'bg-gray-400 dark:bg-gray-600'
                          : usr.role === 'Administrador' 
                            ? 'bg-purple-600 dark:bg-purple-500'
                            : 'bg-blue-600 lya:bg-lya-primary'
                      }`}>
                        {getInitials(usr.fullName)}
                      </div>
                      <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight break-all">
                          {usr.fullName}
                        </h4>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                          {usr.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <button onClick={() => editUser(usr)} className="p-2 bg-gray-50 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-blue-500 transition-colors" title="Editar usuario">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => toggleUserStatus(usr.id, usr.isActive)} className={`p-2 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors ${usr.isActive ? 'text-red-500 hover:bg-red-50 dark:hover:bg-gray-600' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-gray-600'}`} title={usr.isActive ? "Desactivar Acceso" : "Activar Acceso"}>
                        {usr.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                      </button>
                    </div>
                  </div>

                  {usr.email && (
                    <div className="mb-3 text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 rounded-md px-2 py-1">
                      <Mail size={12} /> <span className="truncate">{usr.email}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700/80 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md ${usr.role === 'Administrador' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                      {usr.role}
                    </span>
                    <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-900 px-2.5 py-1 rounded-md">
                      <div className={`w-1.5 h-1.5 rounded-full ${usr.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                      <span className={`text-[10px] font-black tracking-wide ${usr.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {usr.isActive ? 'ACTIVO' : 'SUSPENDIDO'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
};