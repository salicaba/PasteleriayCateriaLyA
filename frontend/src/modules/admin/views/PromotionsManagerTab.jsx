import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Tag, Plus, Edit2, Trash2, Power, Loader2, 
  AlertTriangle, Globe, ShoppingBag, Printer, Sparkles, 
  ShieldAlert, FileText, Columns, Palette 
} from 'lucide-react';
import api from '../../../api/client';
import PromotionManagerModal from './PromotionManagerModal';
import logoLyA from '../../../assets/logo.jpeg';

export const PromotionsManagerTab = ({ isOpen, onClose, products, showToast }) => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(null); 

  // 🖨️ Estados para el Modal de Impresión de Reglas y Guía
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState('full'); // 'full' (1 por hoja) | 'half' (2 por hoja para mesas)
  const [printTextMode, setPrintTextMode] = useState('adapted'); // 'adapted' (Mesero + QR) | 'original' (Tal cual la app)
  const [printColorMode, setPrintColorMode] = useState('color'); // 'color' | 'bw'

  const fetchPromotions = async (silentLoad = false) => {
    try {
      if (!silentLoad) setIsLoading(true);
      const res = await api.get('/promotions');
      setPromotions(res.data.data || res.data || []);
    } catch (error) {
      showToast("Error al cargar promociones", "error");
    } finally {
      if (!silentLoad) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchPromotions(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleToggleStatus = async (id) => {
    if (isToggling) return;

    const promoToToggle = promotions.find(p => p.id === id);
    const isTurningOn = !promoToToggle.isActive;

    // 🛡️ ESCUDO ANTI-COLISIONES PARA EL BOTÓN RÁPIDO DE LA LISTA
    if (isTurningOn) {
      const overlappingPromo = promotions.find(p => {
        if (p.id === id) return false; // No compararse consigo misma
        
        const rawActive = p.isActive ?? p.is_active ?? p.status;
        const isPActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
        if (!isPActive) return false; // Solo choca si la otra está encendida

        // Extraer días de la promo iterada
        const pDaysRaw = p.validDays || p.valid_days;
        let pDays = [];
        if (Array.isArray(pDaysRaw)) pDays = pDaysRaw.map(Number);
        else if (typeof pDaysRaw === 'string') {
          try { pDays = JSON.parse(pDaysRaw).map(Number); } 
          catch(e) { pDays = pDaysRaw.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); }
        }

        // Extraer días de la promo que queremos encender
        const toggleDaysRaw = promoToToggle.validDays || promoToToggle.valid_days;
        let toggleDays = [];
        if (Array.isArray(toggleDaysRaw)) toggleDays = toggleDaysRaw.map(Number);
        else if (typeof toggleDaysRaw === 'string') {
          try { toggleDays = JSON.parse(toggleDaysRaw).map(Number); } 
          catch(e) { toggleDays = toggleDaysRaw.replace(/[\[\]]/g, '').split(',').map(n => Number(n.trim())); }
        }
        
        // ¿Chocan en días?
        const hasDayOverlap = toggleDays.some(d => pDays.includes(d));
        if (!hasDayOverlap) return false;

        // Lógica de colisión por productos (IGNORANDO LOS PREMIOS)
        if (promoToToggle.type === 'TICKET_DISCOUNT' && p.type === 'TICKET_DISCOUNT') {
           return true; 
        } else if (promoToToggle.type !== 'TICKET_DISCOUNT' && p.type !== 'TICKET_DISCOUNT') {
           
           // SOLO Productos disparadores de la promo iterada
           let pProducts = [];
           if (Array.isArray(p.applyToProducts)) pProducts.push(...p.applyToProducts.map(String));
           if (p.productId || p.product_id) pProducts.push(String(p.productId || p.product_id));

           // SOLO Productos disparadores de la promo que se intenta encender
           let toggleProducts = [];
           if (Array.isArray(promoToToggle.applyToProducts)) toggleProducts.push(...promoToToggle.applyToProducts.map(String));
           if (promoToToggle.productId || promoToToggle.product_id) toggleProducts.push(String(promoToToggle.productId || promoToToggle.product_id));

           return toggleProducts.some(pid => pProducts.includes(pid));
        }
        return false;
      });

      if (overlappingPromo) {
        showToast(`Colisión: Esta promoción comparte productos con "${overlappingPromo.name}". Apágala primero.`, "error");
        return; // ⛔ BLOQUEA LA PETICIÓN AL SERVIDOR
      }
    }

    // Si pasó el escudo, hace la petición
    setIsToggling(id);
    try {
      await api.patch(`/promotions/${id}/toggle`);
      await fetchPromotions(true); 
    } catch (error) {
      if (error.response?.status === 409) {
        showToast(error.response.data.message, "warning");
      } else {
        showToast("Error al cambiar estado", "error");
      }
    } finally {
      setIsToggling(null);
    }
  };

  const requestDelete = (id) => setPromoToDelete(id);
  const cancelDelete = () => setPromoToDelete(null);

  const confirmDelete = async () => {
    if (!promoToDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.delete(`/promotions/${promoToDelete}`);
      showToast("Promoción eliminada", "success");
      await fetchPromotions(true); 
    } catch (error) {
      showToast("Error al eliminar", "error");
    } finally {
      setIsDeleting(false);
      setPromoToDelete(null);
    }
  };

  const getTypeName = (type) => {
    const types = {
      'NxM': 'Volumen (NxM)',
      'FIXED': 'Rebaja Directa',
      'NTH_FIXED': 'Unidad Adicional',
      'COMBO': 'Combo Armado',
      'TICKET_DISCOUNT': 'Monto de Ticket',
      'BOGO': 'Compra X, Llévate Y'
    };
    return types[type] || type;
  };

  // 📝 Contenido de las reglas según el modo elegido
  const getRulesContent = () => {
    const isAdapted = printTextMode === 'adapted';
    return {
      pillars: [
        {
          num: '1',
          color: '#f43f5e',
          bgLight: '#fff1f2',
          borderLight: '#fecdd3',
          title: isAdapted ? 'Productos Combinables (Mismo Grupo / Color)' : 'Mismo Color = Combinables',
          desc: isAdapted
            ? 'Si varios productos participan en una misma promoción (identificados con el <strong>mismo color de etiqueta</strong> en el menú digital o consultando a tu mesero), puedes <strong>mezclarlos entre sí</strong> aunque sean productos diferentes para completar la promoción.'
            : 'Si varios productos tienen una etiqueta del <strong>mismo color</strong> y la misma promo, puedes <strong>mezclarlos entre sí</strong> (incluso si son diferentes productos) para completar la promoción.'
        },
        {
          num: '2',
          color: '#3b82f6',
          bgLight: '#eff6ff',
          borderLight: '#bfdbfe',
          title: isAdapted ? 'Ordena con tu Mesero o desde el Menú QR' : 'Toca la Etiqueta para Filtrar',
          desc: isAdapted
            ? 'Si ordenas con un empleado sin usar tu celular, <strong>pregúntale qué productos aplican hoy</strong> al tomar tu orden. Si usas el menú digital QR, toca la <strong>insignia de color</strong> de cualquier producto para filtrar con cuáles se combina.'
            : 'Al tocar directamente la <strong>insignia de color</strong> arriba de cualquier producto en el menú, se filtrarán automáticamente todos los productos con los que puedes combinarlo.'
        },
        {
          num: '3',
          color: '#8b5cf6',
          bgLight: '#f5f3ff',
          borderLight: '#ddd6fe',
          title: 'Estrictamente por Cuenta y Ronda',
          desc: 'Las promos de productos (<strong>2x1, 3x2, Combos o Regalos</strong>) se calculan <strong>únicamente dentro de la misma cuenta</strong> y en el mismo pedido antes de enviarse a cocina. Productos pedidos en cuentas separadas no se suman entre sí.'
        },
        {
          num: '4',
          color: '#059669',
          bgLight: '#ecfdf5',
          borderLight: '#a7f3d0',
          title: 'Descuento por Ticket / Cuenta',
          desc: 'Cuando hay una promo por <strong>monto mínimo de ticket</strong>, suma cualquier producto del menú dentro de una misma cuenta y al llegar a la meta se descuenta automáticamente sobre el total.'
        }
      ],
      warnings: [
        {
          icon: '🚫',
          title: 'Unir cuentas NO desbloquea promos de productos',
          color: '#b45309',
          border: '#fde68a',
          bg: '#fffbeb',
          desc: 'Si dos cuentas separadas pidieron productos por su lado y después deciden <strong>unir sus cuentas</strong>, no se desbloquearán promos como 2x1, 3x2, Combos o Regalos. Además, si la cuenta que se va a unir <strong>ya tenía una promo aplicada, esta se romperá</strong> y sus productos pasarán a precio normal.'
        },
        {
          icon: '✅',
          title: 'Única excepción al unir: Descuento por Ticket',
          color: '#047857',
          border: '#a7f3d0',
          bg: '#ecfdf5',
          desc: 'La <strong>única promoción que sí se activa o actualiza al unir cuentas</strong> (o al pasar productos a una cuenta) es la de <strong>Descuento por Ticket</strong>, ya que evalúa el total acumulado en dinero de la cuenta final (si ambas ya tenían descuento por ticket, se unifican en uno solo).'
        },
        {
          icon: '🔄',
          title: 'Mover un producto individual a otra cuenta',
          color: '#e11d48',
          border: '#fecdd3',
          bg: '#fff1f2',
          desc: 'Si trasladas un producto con beneficio a otra cuenta, <strong>pierde la promo y se cobra a precio normal</strong>. Y si mueves el producto base que sostenía una promo, el regalo o descuento que se quedó en la cuenta original también perderá el beneficio.'
        },
        {
          icon: '🗑️',
          title: 'Quitar, cancelar o falta de stock',
          color: '#e11d48',
          border: '#fecdd3',
          bg: '#fff1f2',
          desc: 'Si restas o eliminas del pedido (o cancelas en cocina) uno de los artículos base que activaban una promoción, <strong>el descuento o regalo se anula automáticamente</strong>. Igual ocurre si un producto se queda sin stock antes de confirmar.'
        }
      ]
    };
  };

  // 🖨️ Función que genera el documento limpio y abre el diálogo de impresión
  const handleExecutePrint = () => {
    const content = getRulesContent();
    const isHalf = printLayout === 'half';
    const isBW = printColorMode === 'bw';

    const buildCardHTML = () => `
      <div class="guide-sheet">
        <div class="header">
          <div class="brand-row">
            <img src="${logoLyA}" alt="Logo LyA" class="logo" onerror="this.style.display='none'" />
            <div>
              <div class="brand-name">𝓛𝔂𝓪 Pastelería & Cafetería</div>
              <h1 class="main-title">¿Cómo funcionan las Promociones?</h1>
              <p class="subtitle">Guía de productos combinables, reglas por cuenta y cuándo se rompe una promoción</p>
            </div>
          </div>
          <div class="badge-tag">GUÍA PARA CLIENTES</div>
        </div>

        <div class="pillars-grid">
          ${content.pillars.map(p => `
            <div class="pillar-card" style="${isBW ? 'border: 1.5px solid #222; background: #fff;' : `border: 1.5px solid ${p.borderLight}; background: ${p.bgLight};`}">
              <div class="pillar-header">
                <span class="pillar-num" style="${isBW ? 'background: #111; color: #fff;' : `background: ${p.color}; color: #fff;`}">${p.num}</span>
                <span class="pillar-title">${p.title}</span>
              </div>
              <p class="pillar-desc">${p.desc}</p>
            </div>
          `).join('')}
        </div>

        <div class="important-box" style="${isBW ? 'border: 2px solid #111; background: #f9fafb;' : 'border: 2px solid #f59e0b; background: #fffbeb;'}">
          <div class="important-header" style="${isBW ? 'color: #111;' : 'color: #b45309;'}">
            <span>⚠️ Importante: Unión de Cuentas y ¿Cuándo se rompe una Promo?</span>
          </div>
          <div class="warnings-grid">
            ${content.warnings.map(w => `
              <div class="warning-card" style="${isBW ? 'border: 1px solid #444; background: #fff;' : `border: 1.5px solid ${w.border}; background: #ffffff;`}">
                <div class="warning-title" style="${isBW ? 'color: #000;' : `color: ${w.color};`}">
                  ${w.icon} ${w.title}
                </div>
                <p class="warning-desc">${w.desc}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="footer">
          <span>✨ <strong>¿Prefieres ordenar sin usar tu celular?</strong> Nuestro personal con gusto tomará tu orden en la mesa y te indicará las promociones del día.</span>
        </div>
      </div>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) {
      showToast("Por favor permite las ventanas emergentes para imprimir", "warning");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Guía de Promociones y Reglas - Pastelería y Cafetería LyA</title>
        <style>
          @page {
            size: letter portrait;
            margin: ${isHalf ? '7mm 10mm' : '12mm 14mm'};
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
          }
          .page-container {
            width: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .guide-sheet {
            border: 2px solid ${isBW ? '#111827' : '#fed7aa'};
            border-radius: ${isHalf ? '16px' : '22px'};
            padding: ${isHalf ? '12px 16px' : '22px 24px'};
            background: #ffffff;
            display: flex;
            flex-direction: column;
            gap: ${isHalf ? '8px' : '16px'};
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid ${isBW ? '#e5e7eb' : '#ffedd5'};
            padding-bottom: ${isHalf ? '8px' : '14px'};
            gap: 12px;
          }
          .brand-row {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo {
            width: ${isHalf ? '42px' : '58px'};
            height: ${isHalf ? '42px' : '58px'};
            border-radius: 50%;
            object-fit: cover;
            border: 2px solid ${isBW ? '#111' : '#f97316'};
          }
          .brand-name {
            font-size: ${isHalf ? '10px' : '12px'};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: ${isBW ? '#374151' : '#ea580c'};
            margin-bottom: 2px;
          }
          .main-title {
            font-size: ${isHalf ? '16px' : '22px'};
            font-weight: 900;
            color: #111827;
            line-height: 1.15;
          }
          .subtitle {
            font-size: ${isHalf ? '10px' : '12.5px'};
            font-weight: 600;
            color: #4b5563;
            margin-top: 2px;
          }
          .badge-tag {
            font-size: ${isHalf ? '9px' : '10px'};
            font-weight: 900;
            padding: 5px 10px;
            border-radius: 999px;
            background: ${isBW ? '#111827' : '#fff7ed'};
            color: ${isBW ? '#ffffff' : '#c2410c'};
            border: 1.5px solid ${isBW ? '#111827' : '#fdba74'};
            white-space: nowrap;
          }
          .pillars-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${isHalf ? '7px' : '12px'};
          }
          .pillar-card {
            border-radius: ${isHalf ? '10px' : '14px'};
            padding: ${isHalf ? '8px 10px' : '13px 15px'};
          }
          .pillar-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: ${isHalf ? '4px' : '6px'};
          }
          .pillar-num {
            width: ${isHalf ? '19px' : '24px'};
            height: ${isHalf ? '19px' : '24px'};
            border-radius: 6px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: ${isHalf ? '10px' : '12px'};
            font-weight: 900;
            flex-shrink: 0;
          }
          .pillar-title {
            font-size: ${isHalf ? '11px' : '13.5px'};
            font-weight: 900;
            color: #111827;
          }
          .pillar-desc {
            font-size: ${isHalf ? '9.6px' : '12px'};
            line-height: ${isHalf ? '1.32' : '1.45'};
            color: #374151;
            font-weight: 500;
            text-align: justify;
          }
          .important-box {
            border-radius: ${isHalf ? '12px' : '16px'};
            padding: ${isHalf ? '9px 11px' : '16px 18px'};
          }
          .important-header {
            font-size: ${isHalf ? '11px' : '14px'};
            font-weight: 900;
            margin-bottom: ${isHalf ? '6px' : '10px'};
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .warnings-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${isHalf ? '6px' : '10px'};
          }
          .warning-card {
            border-radius: ${isHalf ? '8px' : '12px'};
            padding: ${isHalf ? '7px 9px' : '11px 13px'};
          }
          .warning-title {
            font-size: ${isHalf ? '10px' : '12px'};
            font-weight: 900;
            margin-bottom: ${isHalf ? '2px' : '4px'};
          }
          .warning-desc {
            font-size: ${isHalf ? '9.2px' : '11.3px'};
            line-height: ${isHalf ? '1.28' : '1.42'};
            color: #374151;
            font-weight: 500;
            text-align: justify;
          }
          .footer {
            text-align: center;
            font-size: ${isHalf ? '9.5px' : '11.5px'};
            color: #374151;
            background: ${isBW ? '#f3f4f6' : '#fff7ed'};
            border: 1px dashed ${isBW ? '#9ca3af' : '#fdba74'};
            padding: ${isHalf ? '6px 10px' : '10px 14px'};
            border-radius: 10px;
          }
          .cut-line {
            margin: 10px 0;
            border-top: 1.5px dashed #9ca3af;
            text-align: center;
            position: relative;
            height: 12px;
          }
          .cut-line span {
            background: #fff;
            padding: 0 10px;
            font-size: 9px;
            font-weight: 800;
            color: #6b7280;
            position: relative;
            top: -8px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          ${buildCardHTML()}
          ${isHalf ? `
            <div class="cut-line"><span>✂️ Línea de recorte para acrílico o enmicado de mesa</span></div>
            ${buildCardHTML()}
          ` : ''}
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.focus();
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const previewContent = getRulesContent();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.4, ease: "easeOut" }} className="bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* HEADER RESPONSIVO NEO-BENTO */}
        <div className="p-5 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-6 bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0 z-10 relative">
          
          {/* Lado Izquierdo: Títulos */}
          <div className="flex items-center gap-3 sm:gap-4 pr-10 sm:pr-0">
            <div className="bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-orange-200/50 dark:border-orange-800/30 lya:border-lya-primary/30 shrink-0">
              <Tag size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight truncate">Motor de Promociones</h2>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 truncate">Combos, descuentos por volumen y rebajas directas.</p>
            </div>
          </div>
          
          {/* Lado Derecho: Botones */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 w-full sm:w-auto justify-end">
            {/* 🖨️ BOTÓN PARA IMPRIMIR GUÍA Y REGLAS PARA MESAS / MOSTRADOR */}
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPrintModalOpen(true)} 
              className="flex-1 sm:flex-initial bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/30 lya:md:hover:bg-lya-border/50 text-gray-700 dark:text-gray-200 lya:text-lya-text px-4 py-3.5 sm:py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all border border-gray-200/80 dark:border-gray-700 lya:border-lya-border/40 outline-none text-xs sm:text-sm"
              title="Imprimir reglamento de promociones para mesas o mostrador"
            >
              <Printer size={18} className="text-orange-500 lya:text-lya-primary shrink-0" />
              <span>Imprimir Reglas</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditingPromo(null); setIsWizardOpen(true); }} 
              className="flex-1 sm:flex-initial bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 dark:md:hover:bg-orange-500 lya:bg-lya-primary lya:md:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-5 py-3.5 sm:py-3 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 outline-none text-xs sm:text-sm"
            >
              <Plus size={20} /> <span>Nueva Promoción</span>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.95 }} 
              onClick={onClose} 
              className="absolute top-5 right-5 sm:relative sm:top-auto sm:right-auto p-2 sm:p-3 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/30 lya:md:hover:bg-lya-border/50 text-gray-600 dark:text-gray-400 lya:text-lya-text/60 rounded-xl transition-colors outline-none"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </motion.button>
          </div>
          
        </div>

        {/* LISTA DE PROMOCIONES */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-orange-500 lya:text-lya-primary" size={40} /></div>
          ) : promotions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Tag size={64} className="text-gray-300 dark:text-gray-700 lya:text-lya-text/20 mb-4" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 lya:text-lya-text">Sin Promociones</h3>
              <p className="text-gray-500 dark:text-gray-500 lya:text-lya-text/60 mt-2 max-w-sm">Crea tu primer combo o descuento para incentivar tus ventas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {promotions.map(promo => {
                const productCount = promo.applyToProducts?.length || 0;
                const isGlobal = promo.type === 'TICKET_DISCOUNT' || productCount === 0;

                return (
                  <div key={promo.id} className={`bg-white dark:bg-gray-900 lya:bg-lya-surface rounded-[1.5rem] p-5 border shadow-sm flex flex-col transition-all duration-300 ${
                    promo.isActive 
                      ? 'border-orange-200 dark:border-orange-900/50 lya:border-lya-primary/40 shadow-orange-500/10 lya:shadow-lya-primary/10' 
                      : 'border-gray-200 dark:border-gray-800 lya:border-lya-border/30 opacity-60 grayscale-[50%]'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 pr-2">
                        <span className={`inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md mb-2 ${
                          promo.isActive
                            ? 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20 lya:text-lya-primary lya:bg-lya-primary/10'
                            : 'text-gray-500 bg-gray-100 dark:text-gray-400 dark:bg-gray-800 lya:text-lya-text/50 lya:bg-lya-border/20'
                        }`}>
                          {getTypeName(promo.type)}
                        </span>
                        <h4 className={`text-lg font-black line-clamp-2 w-full leading-tight ${
                          promo.isActive
                            ? 'text-gray-800 dark:text-gray-100 lya:text-lya-text'
                            : 'text-gray-500 dark:text-gray-500 lya:text-lya-text/60'
                        }`}>
                          {promo.name || 'Promoción sin título'}
                        </h4>
                      </div>
                      <motion.button 
                        whileTap={!isToggling ? { scale: 0.9 } : {}}
                        onClick={() => handleToggleStatus(promo.id)} 
                        disabled={isToggling === promo.id}
                        className={`p-2.5 rounded-xl transition-all outline-none shrink-0 ${
                          isToggling === promo.id
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 opacity-50 cursor-wait'
                            : promo.isActive 
                              ? 'bg-emerald-50 text-emerald-600 md:hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 lya:bg-emerald-500/10 lya:text-emerald-500 lya:md:hover:bg-emerald-500/20 shadow-sm border border-emerald-200 dark:border-emerald-800/30' 
                              : 'bg-gray-100 text-gray-400 md:hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:text-lya-text/40 lya:md:hover:bg-lya-border/40 border border-transparent'
                        }`} 
                        title={promo.isActive ? 'Apagar' : 'Encender'}
                      >
                        {isToggling === promo.id ? <Loader2 size={20} className="animate-spin" /> : <Power size={20} strokeWidth={promo.isActive ? 2.5 : 2} />}
                      </motion.button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center mb-4">
                      <p className={`text-sm font-medium text-justify leading-relaxed ${
                        promo.isActive 
                          ? 'text-gray-600 dark:text-gray-400 lya:text-lya-text/80' 
                          : 'text-gray-400 dark:text-gray-500 lya:text-lya-text/50'
                      }`}>
                        {promo.type === 'NxM' && `Lleva ${promo.buyQty} y paga ${promo.payQty}.`}
                        {promo.type === 'FIXED' && `Precio rebajado a $${Number(promo.discountValue).toFixed(2)}.`}
                        {promo.type === 'NTH_FIXED' && `Lleva ${promo.buyQty} y el último a $${Number(promo.discountValue).toFixed(2)}.`}
                        {promo.type === 'COMBO' && `Combo a $${Number(promo.discountValue).toFixed(2)}.`}
                        {promo.type === 'TICKET_DISCOUNT' && `Recompensa por tickets arriba de $${Number(promo.minTicketAmount).toFixed(2)}.`}
                        {promo.type === 'BOGO' && `Compra ${promo.buyQty} y llévate ${promo.payQty} a $${Number(promo.discountValue).toFixed(2)}.`}
                      </p>
                      
                      <div className={`mt-3 flex items-center gap-1.5 text-xs font-bold ${promo.isActive ? 'text-gray-500 dark:text-gray-400 lya:text-lya-text/60' : 'text-gray-400/70 dark:text-gray-500/70 lya:text-lya-text/40'}`}>
                        {isGlobal ? (
                          <><Globe size={14} /> Todo el ticket</>
                        ) : (
                          <><ShoppingBag size={14} /> Aplica a {productCount} producto{productCount !== 1 ? 's' : ''}</>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30">
                      <div className="flex gap-1">
                        {['D','L','M','X','J','V','S'].map((day, i) => {
                          const isActiveDay = promo.validDays.includes(i);
                          return (
                            <span key={i} className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold ${
                              isActiveDay 
                                ? promo.isActive
                                  ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 lya:bg-lya-text lya:text-lya-bg' 
                                  : 'bg-gray-400 text-white dark:bg-gray-600 dark:text-gray-300 lya:bg-lya-text/50 lya:text-lya-surface'
                                : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 lya:bg-lya-border/20 lya:text-lya-text/30'
                            }`}>
                              {day}
                            </span>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <motion.button 
                          whileTap={{ scale: 0.9 }} 
                          onClick={() => { setEditingPromo(promo); setIsWizardOpen(true); }} 
                          className={`p-2 rounded-xl outline-none transition-colors ${
                            promo.isActive
                              ? 'text-blue-600 bg-blue-50 md:hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 lya:bg-lya-secondary/10 lya:text-lya-secondary lya:md:hover:bg-lya-secondary/20'
                              : 'text-gray-400 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 lya:bg-lya-border/20 lya:text-lya-text/40'
                          }`}
                        >
                          <Edit2 size={16} />
                        </motion.button>
                        <motion.button 
                          whileTap={{ scale: 0.9 }} 
                          onClick={() => requestDelete(promo.id)} 
                          className={`p-2 rounded-xl outline-none transition-colors ${
                            promo.isActive
                              ? 'text-red-600 bg-red-50 md:hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 lya:bg-red-500/10 lya:text-red-500 lya:md:hover:bg-red-500/20'
                              : 'text-gray-400 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 lya:bg-lya-border/20 lya:text-lya-text/40'
                          }`}
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* 🖨️ MODAL DE VISTA PREVIA E IMPRESIÓN DE GUÍA DE PROMOCIONES Y REGLAS */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col overflow-hidden"
            >
              {/* Encabezado del Modal de Impresión */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/15 text-orange-500 lya:text-lya-primary flex items-center justify-center shrink-0">
                    <Printer size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight">
                      Imprimir Guía y Reglas de Promociones
                    </h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60">
                      Formato permanente para colocar en mesas, mostrador o pared (no requiere reimprimir a diario)
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors outline-none"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Barra de Opciones de Formato */}
              <div className="px-5 sm:px-6 py-3.5 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
                {/* 1. Tamaño */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1 mb-1.5">
                    <Columns size={12} /> Tamaño de Impresión
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-200/70 dark:bg-gray-900 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPrintLayout('full')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printLayout === 'full'
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      1 por Hoja (Póster)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintLayout('half')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printLayout === 'half'
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      2 por Hoja (Mesas)
                    </button>
                  </div>
                </div>

                {/* 2. Redacción */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1 mb-1.5">
                    <FileText size={12} /> Enfoque del Texto
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-200/70 dark:bg-gray-900 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPrintTextMode('adapted')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printTextMode === 'adapted'
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Mesero + QR
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintTextMode('original')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printTextMode === 'original'
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Original App
                    </button>
                  </div>
                </div>

                {/* 3. Color */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1 mb-1.5">
                    <Palette size={12} /> Modo de Tinta
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-200/70 dark:bg-gray-900 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setPrintColorMode('color')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printColorMode === 'color'
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      A Color
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintColorMode('bw')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printColorMode === 'bw'
                          ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Blanco y Negro
                    </button>
                  </div>
                </div>
              </div>

              {/* Cuerpo: Vista Previa en Vivo */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 custom-scrollbar space-y-4">
                <div className="p-5 rounded-3xl border-2 border-orange-200 dark:border-gray-700 bg-white dark:bg-gray-950 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-orange-100 dark:border-gray-800 pb-3">
                    <div className="flex items-center gap-3">
                      <img src={logoLyA} alt="Logo" className="w-11 h-11 rounded-full object-cover border-2 border-orange-500" />
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 block">
                          𝓛𝔂𝓪 Pastelería & Cafetería
                        </span>
                        <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                          ¿Cómo funcionan las Promociones?
                        </h4>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50">
                      {printLayout === 'half' ? 'Se imprimirán 2 por hoja' : '1 Hoja Carta Completa'}
                    </span>
                  </div>

                  {/* 4 Pilares */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {previewContent.pillars.map(p => (
                      <div key={p.num} className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800">
                        <div className="flex items-center gap-2 font-black text-xs text-gray-900 dark:text-white mb-1.5">
                          <span
                            className="w-6 h-6 rounded-lg text-white flex items-center justify-center text-[11px] shrink-0"
                            style={{ backgroundColor: printColorMode === 'bw' ? '#111827' : p.color }}
                          >
                            {p.num}
                          </span>
                          <span>{p.title}</span>
                        </div>
                        <p
                          className="text-[11px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: p.desc }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Bloque Importante */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-800/50 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-black text-xs sm:text-sm">
                      <ShieldAlert size={18} strokeWidth={2.5} className="shrink-0" />
                      <span>Importante: Unión de Cuentas y ¿Cuándo se rompe una Promo?</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {previewContent.warnings.map((w, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white dark:bg-gray-900 border border-amber-200/70 dark:border-gray-800">
                          <p className="font-black text-[11px] text-gray-900 dark:text-white mb-1">
                            {w.icon} {w.title}
                          </p>
                          <p
                            className="text-[11px] font-medium text-gray-600 dark:text-gray-300 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: w.desc }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pie del Modal con Botón de Impresión */}
              <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30 bg-white dark:bg-gray-900 lya:bg-lya-surface flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 text-center sm:text-left">
                  💡 Tip: Si eliges <strong>"2 por Hoja (Mesas)"</strong>, saldrán dos reglamentos en una misma hoja Carta listos para recortar.
                </p>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="flex-1 sm:flex-initial px-5 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-black text-xs sm:text-sm outline-none"
                  >
                    Cerrar
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleExecutePrint}
                    className="flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl bg-orange-500 md:hover:bg-orange-600 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 outline-none"
                  >
                    <Printer size={18} />
                    <span>Imprimir Ahora</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN NEO-BENTO */}
      <AnimatePresence>
        {promoToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} onClick={cancelDelete} className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 lya:bg-lya-dark/50 backdrop-blur-sm" />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.9, opacity: 0, y: 20 }} 
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-sm rounded-[2.5rem] shadow-2xl p-8 border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col items-center text-center relative z-10"
            >
              <div className="bg-red-100 dark:bg-red-500/20 p-4 rounded-full mb-4 text-red-500">
                <AlertTriangle size={36} strokeWidth={2.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text mb-2 text-center">¿Eliminar Promoción?</h3>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8 px-2 text-center leading-relaxed">
                Esta acción no se puede deshacer. La promoción dejará de aplicarse inmediatamente en todos los puntos de venta.
              </p>
              
              <div className="flex w-full gap-3">
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  disabled={isDeleting}
                  onClick={cancelDelete} 
                  className="flex-1 py-3.5 text-gray-600 dark:text-gray-300 lya:text-lya-text/80 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/20 lya:md:hover:bg-lya-border/40 rounded-2xl font-black transition-colors outline-none disabled:opacity-50"
                >
                  Cancelar
                </motion.button>
                <motion.button 
                  whileTap={{ scale: 0.95 }}
                  disabled={isDeleting}
                  onClick={confirmDelete} 
                  className={`flex-1 py-3.5 bg-red-500 text-white rounded-2xl font-black transition-all flex items-center justify-center outline-none ${
                    isDeleting ? 'opacity-70 cursor-wait shadow-none' : 'md:hover:bg-red-600 shadow-lg shadow-red-500/30'
                  }`}
                >
                  {isDeleting ? <Loader2 size={20} className="animate-spin" /> : 'Eliminar'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <PromotionManagerModal 
        isOpen={isWizardOpen} 
        onClose={() => setIsWizardOpen(false)} 
        editData={editingPromo} 
        products={products}
        allPromotions={promotions} // <--- Este es el prop vital para que el escudo funcione
        onPromotionSaved={() => {
          setIsWizardOpen(false);
          fetchPromotions(true);
          showToast("Promoción guardada exitosamente", "success");
        }}
      />
    </motion.div>
  );
};