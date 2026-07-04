import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Coffee, Utensils, ChevronRight } from 'lucide-react';
import logoLyA from '../../../assets/logo.jpeg'; 

export default function ClientLogin({ onLogin, type, tableId }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onLogin({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col items-center justify-center p-6 relative w-full"
    >
      <div className="w-full max-w-sm space-y-8">
        
        {/* Header Identidad */}
        <div className="flex flex-col items-center text-center space-y-4">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 rounded-[2rem] overflow-hidden border-4 border-white/80 dark:border-gray-800 lya:border-lya-surface shadow-xl"
          >
            <img src={logoLyA} alt="Logo 𝓛𝔂𝓪" className="w-full h-full object-cover" />
          </motion.div>
          
          <div>
            <h1 className="text-5xl font-bold tracking-tight mb-3" style={{ letterSpacing: '-0.08em' }}>
              𝓛𝔂𝓪
            </h1>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 dark:bg-white/10 lya:bg-lya-surface/80 backdrop-blur-md border border-gray-200 dark:border-gray-700 lya:border-lya-border/30 text-sm font-bold text-gray-700 dark:text-gray-200 lya:text-lya-text">
              {type === 'mesa' ? (
                <><Utensils size={16} /> Mesa {tableId}</>
              ) : (
                <><Coffee size={16} /> Pedido para Llevar</>
              )}
            </div>
          </div>
        </div>

        {/* Formulario Neo-Bento */}
        <motion.form 
          onSubmit={handleSubmit}
          className="backdrop-blur-2xl border p-6 rounded-[2rem] shadow-2xl space-y-5 bg-white/40 dark:bg-black/40 lya:bg-lya-surface/60 border-white/50 dark:border-white/10 lya:border-lya-border/40 transition-colors"
        >
          <div className="space-y-2">
            <label className="text-sm font-bold opacity-80 px-1 text-gray-800 dark:text-gray-200 lya:text-lya-text">¿Cómo te llamas?</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Juan López"
              className="w-full px-4 py-3.5 rounded-2xl bg-white/60 dark:bg-black/50 lya:bg-white/80 border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:focus:ring-orange-400/50 lya:focus:ring-lya-primary/50 backdrop-blur-sm transition-all text-base placeholder:text-gray-400 dark:placeholder:text-gray-600 lya:placeholder:text-lya-text/40 text-gray-900 dark:text-white lya:text-lya-text"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold opacity-80 px-1 text-gray-800 dark:text-gray-200 lya:text-lya-text">Celular <span className="opacity-50 font-normal">(Opcional para el ticket)</span></label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Para avisarte de tu pedido"
              className="w-full px-4 py-3.5 rounded-2xl bg-white/60 dark:bg-black/50 lya:bg-white/80 border border-gray-200 dark:border-gray-700 lya:border-lya-border/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50 dark:focus:ring-orange-400/50 lya:focus:ring-lya-primary/50 backdrop-blur-sm transition-all text-base placeholder:text-gray-400 dark:placeholder:text-gray-600 lya:placeholder:text-lya-text/40 text-gray-900 dark:text-white lya:text-lya-text"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all active:scale-[0.98] ${
              !name.trim() 
                ? 'bg-gray-300 dark:bg-gray-800 lya:bg-lya-border/50 text-gray-500 dark:text-gray-500 lya:text-lya-text/40 cursor-not-allowed' 
                : 'bg-orange-500 dark:bg-orange-600 lya:bg-lya-primary text-white shadow-lg shadow-orange-500/20 dark:shadow-orange-900/20 lya:shadow-lya-primary/20 hover:brightness-110'
            }`}
          >
            Ver Menú Digital
            <ChevronRight size={20} strokeWidth={3} />
          </button>
        </motion.form>
      </div>
    </motion.div>
  );
}