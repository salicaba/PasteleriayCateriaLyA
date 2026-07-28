import React, { useState, useEffect } from 'react';
import { socket } from '../../../api/socket'; // Asegúrate de que la ruta a tu socket sea correcta
import { Coffee, ShieldAlert, Utensils, XCircle } from 'lucide-react';

export default function ClientServiceShield({ config, onUpdateConfig, children }) {
  const [serviceStatus, setServiceStatus] = useState(config || {
    isServiceActive: false,
    isTakeawayActive: false,
    tables: []
  });

  useEffect(() => {
    // Escuchar eventos en tiempo real desde el backend
    const handleConfigUpdate = (newConfig) => {
      setServiceStatus((prev) => ({
        ...prev,
        ...newConfig
      }));
    };

    const handleTableStatusUpdate = (updatedTable) => {
      setServiceStatus((prev) => ({
        ...prev,
        tables: prev.tables?.map(t => t.id === updatedTable.id ? updatedTable : t)
      }));
    };

    socket.on('business_config_updated', handleConfigUpdate);
    socket.on('table_status_updated', handleTableStatusUpdate);
    socket.on('service_status_changed', handleConfigUpdate);

    return () => {
      socket.off('business_config_updated', handleConfigUpdate);
      socket.off('table_status_updated', handleTableStatusUpdate);
      socket.off('service_status_changed', handleConfigUpdate);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-4 md:p-6 flex flex-col items-center">
      <div className="w-full max-w-md mx-auto space-y-6">
        
        {/* Encabezado */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido a Lya</h1>
          <p className="text-slate-400 text-sm">Selecciona cómo deseas ordenar</p>
        </div>

        {/* Banner de Servicio Digital Suspendido con el nuevo mensaje */}
        {!serviceStatus.isServiceActive && (
          <div className="bg-red-950/40 border border-red-900/50 rounded-2xl p-4 flex gap-3 items-start shadow-lg backdrop-blur-sm">
            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-red-400 font-semibold text-sm">Servicio Digital Suspendido</h2>
              <p className="text-red-300/80 text-xs leading-relaxed">
                El local está abierto, pero los pedidos desde la App están temporalmente pausados. ¿Estamos abiertos?, pase y consuma sin compromiso.
              </p>
            </div>
          </div>
        )}

        {/* Tarjeta Para Llevar (Con diseño corregido para evitar solapamiento de textos y badges) */}
        <div className={`relative overflow-hidden rounded-2xl p-4 border transition-all ${
          serviceStatus.isTakeawayActive 
            ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer' 
            : 'bg-slate-950/60 border-slate-900 opacity-80'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 shadow-inner">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-white">Para Llevar</h3>
                <p className="text-xs text-slate-400">Ordena y recoge encurtidos y postres</p>
              </div>
            </div>

            {!serviceStatus.isTakeawayActive && (
              <div className="flex items-center gap-1.5 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-medium shadow-md">
                <XCircle className="w-3.5 h-3.5" />
                <span>APAGADO</span>
              </div>
            )}
          </div>
        </div>

        {/* Sección Consumo en Local */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">Consumo en Local</h3>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Ejemplo de tarjeta de mesa sincronizada */}
            {serviceStatus.tables && serviceStatus.tables.length > 0 ? (
              serviceStatus.tables.map((table) => (
                <div key={table.id} className="relative bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center shadow-md">
                  <Utensils className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-sm text-slate-200">Mesa {table.number}</span>
                  {!table.isActive && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                      <div className="flex items-center gap-1 bg-red-600 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow">
                        <XCircle className="w-3 h-3" />
                        <span>APAGADO</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              // Tarjetas por defecto si no vienen cargadas de props
              [1, 2, 3, 4].map((num) => (
                <div key={num} className="relative bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-center shadow-md">
                  <Utensils className="w-5 h-5 text-slate-400" />
                  <span className="font-medium text-sm text-slate-200">Mesa {num}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}