import React, { useMemo } from 'react';

export const MesaCard = ({ mesa, onClick }) => {
  const isOcupada = mesa.estado === 'ocupada';
  const isLlevar = mesa.zona === 'llevar'; // Identificamos si es un pedido para llevar

  // Lógica inteligente para saber cuántos productos faltan por preparar
  const { pendientes, totalItems } = useMemo(() => {
    if (!mesa.items || mesa.items.length === 0) return { pendientes: 0, totalItems: 0 };
    
    let pend = 0;
    mesa.items.forEach(item => {
      // Contamos como pendientes los que están en PENDING
      if (item.kitchenStatus === 'PENDING') pend++;
    });
    
    return { pendientes: pend, totalItems: mesa.items.length };
  }, [mesa.items]);

  return (
    <div 
      onClick={() => onClick(mesa)}
      className={`relative rounded-xl p-3 shadow-sm border cursor-pointer transition-all duration-200 hover:shadow-md flex flex-col justify-between min-h-[110px] ${
        isOcupada 
          // Tema Claro | Tema Oscuro | Tema LyA (Ocupada)
          ? 'bg-white border-blue-300 dark:bg-gray-800 dark:border-blue-500 lya:bg-lya-surface lya:border-lya-primary' 
          // Tema Claro | Tema Oscuro | Tema LyA (Libre)
          : 'bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-700 lya:bg-lya-surface/80 lya:border-lya-border'
      }`}
    >
      {/* Parte Superior: Cabecera dinámica (Mesa o Llevar) y badge de estado */}
      <div className="flex justify-between items-center mb-1">
        <h3 className={`text-lg font-bold tracking-tight ${
          isOcupada 
            ? 'text-gray-900 dark:text-white lya:text-lya-text' 
            : 'text-gray-400 dark:text-gray-500 lya:text-lya-text/70'
        }`}>
          {isLlevar ? `LLEVAR ${mesa.identificadorLlevar || ''}` : `MESA ${mesa.numero}`}
        </h3>
        
        {/* Solo mostramos el badge de Ocupada/Libre si NO es para llevar */}
        {!isLlevar && (
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
            isOcupada 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 lya:bg-lya-primary/20 lya:text-lya-primary' 
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 lya:bg-lya-bg lya:text-lya-border'
          }`}>
            {isOcupada ? 'Ocupada' : 'Libre'}
          </span>
        )}
      </div>

      {/* Centro: Precio Total bien centrado y Nombre del Cliente (si es llevar) */}
      <div className="flex-grow flex flex-col items-center justify-center my-1">
        {isOcupada ? (
          <>
            <span className="text-2xl font-bold text-gray-900 dark:text-white lya:text-lya-text">
              ${Number(mesa.total || 0).toFixed(2)}
            </span>
            {/* Nombre del cliente si es pedido para llevar */}
            {isLlevar && mesa.cliente && (
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400 lya:text-lya-primary mt-0.5 truncate w-full text-center italic">
                {mesa.cliente}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm font-medium text-gray-400 dark:text-gray-600 lya:text-lya-border">
            Disponible
          </span>
        )}
      </div>

      {/* Parte Inferior: Cuentas y Estado de Cocina */}
      {isOcupada && (
        <div className="flex justify-between items-end text-xs mt-1">
          {/* Cuentas activas */}
          <div className="text-gray-500 dark:text-gray-400 lya:text-lya-text/80 font-medium">
            Cuentas: <span className="font-bold text-gray-900 dark:text-white lya:text-lya-primary">{mesa.cuentasActivas || 1}</span>
          </div>
          
          {/* Lógica de pendientes vs Preparados */}
          {totalItems > 0 && (
            <div className="font-semibold tracking-tight">
              {pendientes > 0 ? (
                <span className="text-orange-600 bg-orange-50 border border-orange-100 dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-800/50 lya:bg-[#FDE8E8] lya:text-[#9B1C1C] lya:border-transparent px-1.5 py-0.5 rounded">
                  {pendientes} pend.
                </span>
              ) : (
                <span className="text-green-600 bg-green-50 border border-green-100 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800/50 lya:bg-[#DEF7EC] lya:text-[#03543F] lya:border-transparent px-1.5 py-0.5 rounded">
                  ¡Preparados!
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};