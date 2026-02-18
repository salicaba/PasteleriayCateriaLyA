import React, { useState } from 'react';
import { PosModal } from './modules/cafeteria/views/PosModal';
import { MesasPage } from './modules/cafeteria/views/MesasPage';

function App() {
  // Estado para saber qué mesa abrimos (null = ninguna)
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);

  return (
    <div className="h-screen flex flex-col bg-gray-100 text-gray-800 font-sans overflow-hidden">
      
      {/* 1. Barra Superior (Navbar) */}
      <header className="h-16 bg-white shadow-sm flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-2">
           {/* Logo Cuadrado */}
           <div className="w-9 h-9 bg-gradient-to-tr from-brand-primary to-brand-secondary rounded-xl flex items-center justify-center text-white font-lya font-bold text-xl shadow-lg shadow-brand-primary/30">
             L
           </div>
           <span className="font-bold text-xl tracking-tight text-brand-dark">LyA <span className="text-gray-300 font-normal text-base">POS</span></span>
        </div>
        
        {/* Usuario */}
        <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
           <div className="w-6 h-6 bg-brand-dark rounded-full overflow-hidden">
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
           </div>
           <span className="text-xs font-bold text-gray-600">Cajero Principal</span>
        </div>
      </header>

      {/* 2. Área Principal: Mapa de Mesas */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <MesasPage onSelectMesa={setMesaSeleccionada} />
      </main>

      {/* 3. El Modal de Venta (POS) */}
      {/* Siempre está renderizado, pero oculto hasta que 'isOpen' sea true */}
      <PosModal 
        isOpen={!!mesaSeleccionada} 
        onClose={() => setMesaSeleccionada(null)} 
        mesa={mesaSeleccionada}
      />

    </div>
  );
}

export default App;