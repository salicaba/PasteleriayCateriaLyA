// src/modules/cafeteria/views/MesaCard.jsx
import React, { useMemo } from 'react';
import { UtensilsCrossed, ShoppingBag, ChefHat, Check } from 'lucide-react';

export const MesaCard = ({ mesa, onClick }) => {
  const isOcupada = mesa.estado === 'ocupada';
  const isLlevar = mesa.zona === 'llevar';

  // Lógica inteligente para saber cuántos productos faltan por preparar
  const { pendientes, totalItems } = useMemo(() => {
    if (!mesa.items || mesa.items.length === 0) return { pendientes: 0, totalItems: 0 };
    
    let pend = 0;
    mesa.items.forEach(item => {
      if (item.kitchenStatus === 'PENDING') pend++;
    });
    
    return { pendientes: pend, totalItems: mesa.items.length };
  }, [mesa.items]);

  // 🔥 CORRECCIÓN: Separamos el nombre y teléfono basado en la nueva estructura de `mesa.numero`
  const { idPrincipal, nombreCliente, telefonoCliente } = useMemo(() => {
    const rawNumero = String(mesa.numero || '');
    
    // Si no es un pedido para llevar, devolvemos el número tal cual
    if (!isLlevar) return { idPrincipal: rawNumero, nombreCliente: '', telefonoCliente: '' };

    // Estructura esperada de backend: "L-XX - Nombre - Teléfono"
    const partes = rawNumero.split(' - ');
    
    // El ID siempre es la primera parte. 
    // 🔥 CORRECCIÓN: Limpiamos la palabra "Llevar" y cualquier "#" extra que venga de la base de datos para que quede solo el número
    let id = partes[0] || 'Pedido';
    id = id.replace(/Llevar\s*#?/i, '').trim(); 
    
    // Si solo hay 1 o 2 partes, no hay teléfono
    if (partes.length < 3) {
       return { idPrincipal: id, nombreCliente: partes[1] || 'Mostrador', telefonoCliente: '' };
    }

    // Si tiene las 3 partes (ID, Nombre, Teléfono), extraemos el teléfono limpio
    // El teléfono siempre va a ser la última parte de la cadena, limpia de espacios y caracteres no numéricos
    const rawTel = partes[partes.length - 1];
    const telLimpio = rawTel.replace(/\D/g, ''); 
    
    // Si la última parte parece un teléfono válido (ej: al menos 10 dígitos)
    if (telLimpio.length >= 10) {
      // Todo lo que esté en medio es el nombre
      const nombre = partes.slice(1, -1).join(' - ');
      return { idPrincipal: id, nombreCliente: nombre, telefonoCliente: rawTel };
    }

    // Si la última parte no parece teléfono, asumimos que es parte del nombre
    return { idPrincipal: id, nombreCliente: partes.slice(1).join(' - '), telefonoCliente: '' };

  }, [mesa.numero, isLlevar]);


  return (
    <div 
      onClick={() => onClick(mesa)}
      className={`group relative rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[150px] overflow-hidden ${
        isOcupada 
          ? 'bg-white dark:bg-gray-800 border-y border-r border-gray-100 dark:border-gray-700 lya:bg-lya-surface lya:border-lya-border/30' 
          : 'bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 lya:bg-lya-bg lya:border-lya-border/50'
      }`}
    >
      {/* Barra de Acento Lateral */}
      <div className={`absolute left-0 top-0 bottom-0 w-2 transition-colors ${
        isOcupada 
          ? 'bg-blue-500 dark:bg-blue-400 lya:bg-lya-primary' 
          : 'bg-gray-300 dark:bg-gray-600 lya:bg-lya-border/60'
      }`} />

      <div className="p-4 pl-5 flex-grow flex flex-col justify-between h-full">
        
        {/* Parte Superior: Título e Ícono */}
        <div className="flex justify-between items-start">
          <div className="z-10">
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 block ${
              isOcupada ? 'text-blue-500 dark:text-blue-400 lya:text-lya-primary' : 'text-gray-400 lya:text-lya-text/50'
            }`}>
              {isLlevar ? 'Para Llevar' : (isOcupada ? 'Mesa Ocupada' : 'Mesa Libre')}
            </span>
            <h3 className={`text-lg font-black tracking-tight truncate max-w-[120px] ${
              isOcupada ? 'text-gray-800 dark:text-white lya:text-lya-text' : 'text-gray-400 dark:text-gray-500 lya:text-lya-text/60'
            }`}>
              #{idPrincipal}
            </h3>
          </div>
          
          <div className={`p-2 rounded-xl transition-colors ${
            isOcupada 
              ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400 lya:bg-lya-primary/10 lya:text-lya-primary' 
              : 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 lya:bg-lya-border/20 lya:text-lya-border'
          }`}>
            {isLlevar ? <ShoppingBag size={20} strokeWidth={2} /> : <UtensilsCrossed size={20} strokeWidth={2} />}
          </div>
        </div>

        {/* Centro: Total y Datos del Cliente estructurados verticalmente */}
        <div className="mt-2 mb-2 flex flex-col gap-1">
          {isOcupada ? (
            <>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 lya:text-lya-text">
                ${Number(mesa.total || 0).toFixed(2)}
              </span>
              
              {/* Renderizado dinámico de Nombre y Teléfono en tarjetas "Para Llevar" */}
              {isLlevar && nombreCliente && nombreCliente !== 'Mostrador' && (
                <div className="flex flex-col text-left mt-0.5 bg-gray-50/80 dark:bg-gray-900/40 lya:bg-lya-bg/30 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800/40 lya:border-lya-border/20">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text truncate flex items-center gap-1">
                    👤 {nombreCliente}
                  </span>
                  {telefonoCliente && (
                    <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 lya:text-lya-primary tracking-wide mt-0.5 whitespace-nowrap flex items-center gap-1">
                      📞 {telefonoCliente}
                    </span>
                  )}
                </div>
              )}
            </>
          ) : (
            <span className="text-sm font-medium text-gray-400 dark:text-gray-500 lya:text-lya-text/40">
              Sin orden activa
            </span>
          )}
        </div>

        {/* Parte Inferior: Cuentas y Estado de Cocina */}
        {isOcupada && (
          <div className="flex justify-between items-center mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50 lya:border-lya-border/20">
            {/* Cuentas activas */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/70">
              <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 lya:bg-lya-primary/20 lya:text-lya-primary">
                {mesa.cuentasActivas || 1}
              </span>
              <span className="font-medium">Cuentas</span>
            </div>

            {/* Cocina */}
            {totalItems > 0 && (
              <div className="text-[11px] font-bold">
                {pendientes > 0 ? (
                  <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 lya:text-[#9B1C1C] bg-orange-50 dark:bg-orange-500/10 lya:bg-[#FDE8E8] px-2 py-0.5 rounded-md">
                    <ChefHat size={13} className="animate-pulse" />
                    {pendientes} cocina
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 lya:text-[#03543F] bg-emerald-50 dark:bg-emerald-500/10 lya:bg-[#DEF7EC] px-2 py-0.5 rounded-md">
                    <Check size={13} strokeWidth={3} />
                    Listos
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};