// src/modules/client/views/TransferenciasView.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, Copy, Check, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';
import client from '../../../api/client'; // Ajusta esta ruta según tu estructura

export const TransferenciasView = () => {
  const [accounts, setAccounts] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Estado para animar el botón de copiado
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await client.get('/settings');
        if (res.data) {
          if (Array.isArray(res.data.bank_accounts)) setAccounts(res.data.bank_accounts);
          if (res.data.whatsapp_number) setWhatsappNumber(res.data.whatsapp_number);
        }
      } catch (err) {
        console.error("Error cargando cuentas:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6">
        <motion.div animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          <Landmark size={48} className="text-emerald-500 mb-4" />
        </motion.div>
        <p className="font-bold text-gray-500 dark:text-gray-400 animate-pulse">Obteniendo cuentas...</p>
      </div>
    );
  }

  if (error || accounts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-gray-300 dark:text-gray-700 mb-4" />
        <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">No hay cuentas disponibles</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">En este momento no hay información de transferencias registrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 flex flex-col items-center">
      
      {/* HEADER LOGO */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center mb-10 w-full max-w-md">
        <div className="mx-auto w-16 h-16 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-[1.5rem] flex items-center justify-center mb-4 text-emerald-500 shadow-inner">
          <Landmark size={32} />
        </div>
        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter" style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}>
          𝓛𝔂𝓪
        </h1>
        <p className="text-xs font-black uppercase tracking-widest text-gray-400 mt-2">Datos para Transferencia</p>
      </motion.div>

      {/* LISTA DE CUENTAS */}
      <div className="w-full max-w-md space-y-6">
        <AnimatePresence>
          {accounts.map((acc, index) => (
            <motion.div 
              key={acc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] p-6 shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100%] pointer-events-none" />
              
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <div className="w-2 h-6 bg-emerald-500 rounded-full" /> {acc.bank_name}
              </h3>
              
              <div className="space-y-4 relative z-10">
                {acc.account_holder && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <span className="block text-[10px] font-black uppercase text-gray-400 mb-1">Titular de la cuenta</span>
                    <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{acc.account_holder}</span>
                  </div>
                )}

                {acc.account_number && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-black uppercase text-gray-400 mb-1">Número de Cuenta / Tarjeta</span>
                      <span className="font-mono font-black text-gray-900 dark:text-white tracking-widest truncate block">{acc.account_number}</span>
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleCopy(acc.account_number, `acc-${acc.id}`)}
                      className={`shrink-0 p-3 rounded-xl transition-colors ${copiedId === `acc-${acc.id}` ? 'bg-emerald-500 text-white shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm'}`}
                    >
                      {copiedId === `acc-${acc.id}` ? <Check size={18} /> : <Copy size={18} />}
                    </motion.button>
                  </div>
                )}

                {acc.clabe && (
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-black uppercase text-gray-400 mb-1">CLABE Interbancaria</span>
                      <span className="font-mono font-black text-gray-900 dark:text-white tracking-widest truncate block">{acc.clabe}</span>
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleCopy(acc.clabe, `clabe-${acc.id}`)}
                      className={`shrink-0 p-3 rounded-xl transition-colors ${copiedId === `clabe-${acc.id}` ? 'bg-emerald-500 text-white shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-sm'}`}
                    >
                      {copiedId === `clabe-${acc.id}` ? <Check size={18} /> : <Copy size={18} />}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* WHATSAPP FOOTER */}
      {whatsappNumber && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.4 }}
          className="mt-8 w-full max-w-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-[2rem] p-6 text-center shadow-sm"
        >
          <div className="mx-auto w-12 h-12 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center mb-3 text-emerald-600 dark:text-emerald-400">
            <MessageCircle size={24} />
          </div>
          <h4 className="font-black text-emerald-800 dark:text-emerald-300 text-sm uppercase tracking-wider mb-2">Envía tu comprobante</h4>
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400/80 mb-4 leading-relaxed">
            Por favor, no olvides escribir tu número de <b>Mesa</b> o nombre de <b>Llevar</b> en el concepto de tu transferencia y enviarnos el comprobante.
          </p>
          <a 
            href={`https://wa.me/52${whatsappNumber}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
          >
            Abrir WhatsApp
          </a>
        </motion.div>
      )}

      <div className="mt-10 mb-6 opacity-30 pointer-events-none">
         <h1 className="text-xl font-black text-gray-900 dark:text-white" style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}>𝓛𝔂𝓪</h1>
      </div>
    </div>
  );
};