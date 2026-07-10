// frontend/src/modules/cafeteria/views/MesaCard.jsx
import React, { useMemo } from 'react';
import { UtensilsCrossed, ShoppingBag, ChefHat, Check, Trash2, BellRing } from 'lucide-react';

export const MesaCard = ({ mesa, onClick, onCancel }) => {
  const isOcupada = mesa.estado === 'ocupada';
  
  // 🔥 ESCUDO NEO-BENTO: Validación estricta anti-contaminación de zonas.
  // Si el identificador de la mesa es puramente numérico (ej. "1", "12") o corto (ej. "T1"), 
  // ES MESA FÍSICA y bloqueamos visualmente la etiqueta de "Para Llevar".
  const rawNumero = String(mesa.numero || '').trim();
  const esMesaFisica = /^(M|T)?-?\d+$/i.test(rawNumero);
  
  const isLlevar = (mesa.zona === 'llevar' || mesa.orderType === 'LLEVAR') && !esMesaFisica;

  // Se actualizó para detectar también los "listos" (READY)
  const { pendientes, listos, totalItems } = useMemo(() => {
    if (!mesa.items || mesa.items.length === 0) return { pendientes: 0, listos: 0, totalItems: 0 };
    
    let pend = 0;
    let ready = 0;
    mesa.items.forEach(item => {
      if (item.kitchenStatus === 'PENDING' || item.kitchenStatus === 'PREPARING') pend++;
      if (item.kitchenStatus === 'READY') ready++;
    });
    
    return { pendientes: pend, listos: ready, totalItems: mesa.items.length };
  }, [mesa.items]);

  const hasReadyItems = listos > 0;

  const { idPrincipal, nombreCliente, telefonoCliente } = useMemo(() => {
    if (!isLlevar) {
       // 🔥 MEJORA UX: Rescatamos el nombre del cliente de la orden QR (ticketId) para que aparezca en el Salón
       let nombreQR = '';
       if (mesa.ticketId && mesa.ticketId !== rawNumero && !String(mesa.ticketId).includes('MOSTRADOR')) {
           nombreQR = mesa.ticketId;
       } else if (mesa.nombreCliente) {
           nombreQR = mesa.nombreCliente;
       }
       return { idPrincipal: rawNumero, nombreCliente: nombreQR, telefonoCliente: '' };
    }

    const partes = rawNumero.split(' - ');
    
    let id = partes[0] || 'Pedido';
    id = id.replace(/Llevar/gi, '').replace(/L-/gi, '').replace(/#/g, '').trim(); 
    
    if (partes.length < 3) {
       return { idPrincipal: id, nombreCliente: partes[1] || 'Mostrador', telefonoCliente: '' };
    }

    const rawTel = partes[partes.length - 1];
    const telLimpio = rawTel.replace(/\D/g, ''); 
    
    if (telLimpio.length >= 10) {
      const nombre = partes.slice(1, -1).join(' - ');
      return { idPrincipal: id, nombreCliente: nombre, telefonoCliente: rawTel };
    }

    return { idPrincipal: id, nombreCliente: partes.slice(1).join(' - '), telefonoCliente: '' };
  }, [mesa.numero, mesa.ticketId, mesa.nombreCliente, isLlevar, rawNumero]);

  return (
    <div 
      onClick={() => onClick(mesa)}
      className={`group relative rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col justify-between min-h-[150px] overflow-visible ${
        hasReadyItems 
          ? 'bg-blue-50 border-2 border-blue-500 shadow-blue-500/20 dark:bg-blue-900/20 dark:border-blue-400 dark:shadow-blue-400/10 lya:bg-blue-50/80 lya:border-blue-500 lya:shadow-blue-500/20'
          : isOcupada 
            ? 'bg-white dark:bg-gray-800 border-y border-r border-gray-100 dark:border-gray-700 lya:bg-lya-surface lya:border-lya-border/30' 
            : 'bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50 lya:bg-lya-bg lya:border-lya-border/50'
      }`}
    >
      {/* ETIQUETA FLOTANTE DE NOTIFICACIÓN MULTI-TEMA */}
      {hasReadyItems && (
        <div className="absolute -top-3 -right-2 bg-blue-600 dark:bg-blue-500 lya:bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-blue-500/40 dark:shadow-blue-900/60 lya:shadow-blue-600/30 animate-bounce z-50">
          <BellRing size={12} className="animate-pulse" />
          ¡LISTO PARA ENTREGAR!
        </div>
      )}

      {/* BARRA LATERAL IZQUIERDA MULTI-TEMA */}
      <div className={`absolute left-0 top-0 bottom-0 w-2 transition-colors rounded-l-xl ${
        hasReadyItems 
          ? 'bg-blue-500 dark:bg-blue-400 lya:bg-blue-500' 
          : isOcupada 
            ? 'bg-blue-500 dark:bg-blue-400 lya:bg-lya-primary' 
            : 'bg-gray-300 dark:bg-gray-600 lya:bg-lya-border/60'
      }`} />

      <div className="p-4 pl-5 flex-grow flex flex-col justify-between h-full relative z-10">
        <div className="flex justify-between items-start">
          <div className="z-10">
            {/* TEXTO DE CABECERA MULTI-TEMA */}
            <span className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 block ${
              hasReadyItems 
                ? 'text-blue-600 dark:text-blue-400 lya:text-blue-600' 
                : isOcupada 
                  ? 'text-blue-500 dark:text-blue-400 lya:text-lya-primary' 
                  : 'text-gray-400 lya:text-lya-text/50'
            }`}>
              {isLlevar ? 'Para Llevar' : (isOcupada ? 'Mesa Ocupada' : 'Mesa Libre')}
            </span>
            <h3 className={`text-lg font-black tracking-tight truncate max-w-[120px] ${
              isOcupada ? 'text-gray-800 dark:text-white lya:text-lya-text' : 'text-gray-400 dark:text-gray-500 lya:text-lya-text/60'
            }`}>
              #{idPrincipal}
            </h3>
          </div>
          
          <div className="flex items-center gap-1.5 z-20">
            {isLlevar && onCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation(); 
                  onCancel();
                }}
                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20 lya:hover:bg-red-900/20 transition-colors"
                title="Eliminar pedido"
              >
                <Trash2 size={18} strokeWidth={2} />
              </button>
            )}

            {/* ÍCONO MULTI-TEMA */}
            <div className={`p-2 rounded-xl transition-colors ${
              hasReadyItems
                ? 'bg-blue-500 dark:bg-blue-500 lya:bg-blue-500 text-white shadow-md shadow-blue-500/30 dark:shadow-blue-900/40 lya:shadow-blue-500/30'
                : isOcupada 
                  ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400 lya:bg-lya-primary/10 lya:text-lya-primary' 
                  : 'bg-gray-100 text-gray-300 dark:bg-gray-800 dark:text-gray-600 lya:bg-lya-border/20 lya:text-lya-border'
            }`}>
              {isLlevar ? <ShoppingBag size={20} strokeWidth={2} /> : <UtensilsCrossed size={20} strokeWidth={2} />}
            </div>
          </div>
        </div>

        <div className="mt-2 mb-2 flex flex-col gap-1">
          {isOcupada ? (
            <>
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 lya:text-lya-text">
                ${Number(mesa.total || 0).toFixed(2)}
              </span>
              
              {nombreCliente && nombreCliente !== 'Mostrador' && (
                <div className="flex flex-col text-left mt-0.5 bg-gray-50/80 dark:bg-gray-900/40 lya:bg-lya-bg/30 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800/40 lya:border-lya-border/20">
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text truncate flex items-center gap-1.5">
                    👤 {nombreCliente}
                  </span>
                  {telefonoCliente && (
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 lya:text-lya-primary tracking-wide mt-0.5 whitespace-nowrap flex items-center gap-1.5">
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

        {isOcupada && (
          <div className="flex flex-wrap justify-between items-center gap-x-2 gap-y-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50 lya:border-lya-border/20">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 lya:text-lya-text/70 shrink-0">
              <span className="w-5 h-5 rounded flex items-center justify-center font-bold text-gray-700 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 lya:bg-lya-primary/20 lya:text-lya-primary">
                {mesa.cuentasActivas || 1}
              </span>
              <span className="font-medium">Cuentas</span>
            </div>

            {totalItems > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                {pendientes > 0 && (
                  <span className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 lya:text-[#9B1C1C] bg-orange-50 dark:bg-orange-500/10 lya:bg-[#FDE8E8] px-2 py-0.5 rounded-md shrink-0">
                    <ChefHat size={13} className="animate-pulse" />
                    {pendientes} cocina
                  </span>
                )}
                {listos > 0 && (
                  <span className="flex items-center gap-1.5 text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/40 lya:text-blue-700 lya:bg-blue-100 px-2 py-0.5 rounded-md shadow-sm shrink-0">
                    <BellRing size={13} className="animate-pulse" />
                    {listos} listos
                  </span>
                )}
                {pendientes === 0 && listos === 0 && (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 lya:text-[#03543F] bg-emerald-50 dark:bg-emerald-500/10 lya:bg-[#DEF7EC] px-2 py-0.5 rounded-md shrink-0">
                    <Check size={13} strokeWidth={3} />
                    Entregados
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