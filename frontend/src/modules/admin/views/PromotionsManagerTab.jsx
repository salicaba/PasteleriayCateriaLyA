// frontend/src/modules/admin/views/PromotionsManagerTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Tag, Plus, Edit2, Trash2, Power, Loader2, AlertTriangle, 
  Globe, ShoppingBag, Printer, Sparkles, ShieldAlert, Layers, 
  Receipt, FileText, Columns, Palette, Check
} from 'lucide-react';
import api from '../../../api/client';
import PromotionManagerModal from './PromotionManagerModal';
import logoLyA from '../../../assets/logo.jpeg';

const DAY_LABELS_SHORT = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' };
const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0];

const PRINT_COLOR_PALETTE = [
  { name: 'Rosa', badgeBg: '#e11d48', badgeText: '#ffffff', cardBg: '#fff1f2', cardBorder: '#fecdd3', accentText: '#be123c' },
  { name: 'Azul', badgeBg: '#2563eb', badgeText: '#ffffff', cardBg: '#eff6ff', cardBorder: '#bfdbfe', accentText: '#1d4ed8' },
  { name: 'Violeta', badgeBg: '#7c3aed', badgeText: '#ffffff', cardBg: '#f5f3ff', cardBorder: '#ddd6fe', accentText: '#6d28d9' },
  { name: 'Ámbar', badgeBg: '#d97706', badgeText: '#ffffff', cardBg: '#fffbeb', cardBorder: '#fde68a', accentText: '#b45309' },
  { name: 'Cian', badgeBg: '#0891b2', badgeText: '#ffffff', cardBg: '#ecfeff', cardBorder: '#a5f3fc', accentText: '#0e7490' },
  { name: 'Fucsia', badgeBg: '#c026d3', badgeText: '#ffffff', cardBg: '#fdf4ff', cardBorder: '#f5d0fe', accentText: '#a21caf' }
];

const getPrintPromoColor = (promo) => {
  if (!promo) return PRINT_COLOR_PALETTE[0];
  if (promo.type === 'TICKET_DISCOUNT') {
    return {
      name: 'Esmeralda',
      badgeBg: '#059669',
      badgeText: '#ffffff',
      cardBg: '#ecfdf5',
      cardBorder: '#a7f3d0',
      accentText: '#047857'
    };
  }
  const strId = String(promo.id || '');
  let hash = 0;
  for (let i = 0; i < strId.length; i++) {
    hash = strId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRINT_COLOR_PALETTE[Math.abs(hash) % PRINT_COLOR_PALETTE.length];
};

const parseValidDays = (promo) => {
  const daysRaw = promo?.validDays ?? promo?.valid_days;
  if (Array.isArray(daysRaw)) return daysRaw.map(Number);
  if (typeof daysRaw === 'string') {
    try {
      return JSON.parse(daysRaw).map(Number);
    } catch (e) {
      return daysRaw.replace(/[\[\]]/g, '').split(',').filter(Boolean).map(n => Number(n.trim()));
    }
  }
  return [];
};

const formatValidDaysText = (promo) => {
  const days = parseValidDays(promo);
  if (!days || days.length === 0 || days.length === 7) return 'Todos los días';
  const sorted = ORDERED_DAYS.filter(d => days.includes(d));
  if (sorted.length === 5 && [1, 2, 3, 4, 5].every(d => sorted.includes(d))) return 'Lunes a Viernes';
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) return 'Sábado y Domingo';
  return sorted.map(d => DAY_LABELS_SHORT[d]).join(', ');
};

const getShortPromoLabel = (promo) => {
  if (!promo) return 'Promo';
  const type = promo.type;
  if (type === 'TICKET_DISCOUNT') {
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    const isPct = (promo.discountType || promo.discount_type) === 'PERCENTAGE';
    return isPct ? `-${disc}% en Ticket` : `-$${disc.toFixed(0)} en Ticket`;
  }
  if (type === 'NxM') return `${promo.buyQty || promo.buy_qty || 3}x${promo.payQty || promo.pay_qty || 2}`;
  if (type === 'FIXED') return `-$${Number(promo.discountValue || promo.discount_value || 0).toFixed(0)}`;
  if (type === 'NTH_FIXED') return `${promo.buyQty || promo.buy_qty || 2}ª con Desc.`;
  if (type === 'COMBO') return `Combo $${Number(promo.discountValue || promo.discount_value || 0).toFixed(0)}`;
  if (type === 'BOGO') return `Compra ${promo.buyQty || 1} y Llévate ${promo.payQty || 1}`;
  return promo.name || 'Promo';
};

const getPromoRuleDescription = (promo) => {
  if (!promo) return '';
  const type = promo.type;
  if (type === 'TICKET_DISCOUNT') {
    const minAmount = Number(promo.minTicketAmount || promo.min_ticket_amount || 0);
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    const isPct = (promo.discountType || promo.discount_type) === 'PERCENTAGE';
    const benefit = isPct ? `un ${disc}% de descuento` : `$${disc.toFixed(2)} de descuento`;
    return minAmount > 0
      ? `Al acumular $${minAmount.toFixed(2)} o más de cualquier producto del menú dentro de una misma cuenta, se aplica automáticamente ${benefit} sobre el total.`
      : `Se aplica automáticamente ${benefit} sobre el total de la cuenta.`;
  }
  if (type === 'NxM') {
    const buy = promo.buyQty || promo.buy_qty || 3;
    const pay = promo.payQty || promo.pay_qty || 2;
    return `Lleva ${buy} productos participantes con el mismo color de etiqueta en tu misma cuenta y paga únicamente ${pay}.`;
  }
  if (type === 'FIXED') {
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    return `Precio especial o descuento directo de $${disc.toFixed(2)} en cada unidad participante.`;
  }
  if (type === 'NTH_FIXED') {
    const nth = promo.buyQty || promo.buy_qty || 2;
    const disc = Number(promo.discountValue || promo.discount_value || 0);
    return `Al pedir ${nth} productos participantes en la misma cuenta, la ${nth}ª unidad queda en $${disc.toFixed(2)}.`;
  }
  if (type === 'COMBO') {
    const price = Number(promo.discountValue || promo.discount_value || 0);
    return `Pide todos los productos del paquete dentro de la misma cuenta por un precio especial de $${price.toFixed(2)}.`;
  }
  if (type === 'BOGO') {
    const buy = promo.buyQty || promo.buy_qty || 1;
    const pay = promo.payQty || promo.pay_qty || 1;
    const discVal = promo.discountValue ?? promo.discount_value;
    const rewardText = (discVal === 0 || discVal === undefined || discVal === null)
      ? 'totalmente GRATIS'
      : `por solo $${Number(discVal).toFixed(2)}`;
    return `En la compra de ${buy} producto(s) participante(s) en la misma cuenta, llévate ${pay} producto(s) de recompensa ${rewardText}.`;
  }
  return 'Promoción especial sujeta a disponibilidad.';
};

export const PromotionsManagerTab = ({ isOpen, onClose, products, showToast }) => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(null);

  // ✨ Estados para el Modal de Impresión de Guía y Promociones
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState('poster'); // 'poster' (1x hoja) | 'tent' (2x hoja mesas)
  const [printScope, setPrintScope] = useState('all_active'); // 'all_active' | 'today_only' | 'rules_only'
  const [printTheme, setPrintTheme] = useState('lya'); // 'lya' (Color Crema/Café) | 'ink_saver' (Fondo Blanco)
  const [includeRulesBlock, setIncludeRulesBlock] = useState(true);

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
        if (p.id === id) return false;
        
        const rawActive = p.isActive ?? p.is_active ?? p.status;
        const isPActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
        if (!isPActive) return false;

        const pDays = parseValidDays(p);
        const toggleDays = parseValidDays(promoToToggle);
        
        const hasDayOverlap = toggleDays.some(d => pDays.includes(d));
        if (!hasDayOverlap) return false;

        if (promoToToggle.type === 'TICKET_DISCOUNT' && p.type === 'TICKET_DISCOUNT') {
           return true; 
        } else if (promoToToggle.type !== 'TICKET_DISCOUNT' && p.type !== 'TICKET_DISCOUNT') {
           let pProducts = [];
           if (Array.isArray(p.applyToProducts)) pProducts.push(...p.applyToProducts.map(String));
           if (p.productId || p.product_id) pProducts.push(String(p.productId || p.product_id));

           let toggleProducts = [];
           if (Array.isArray(promoToToggle.applyToProducts)) toggleProducts.push(...promoToToggle.applyToProducts.map(String));
           if (promoToToggle.productId || promoToToggle.product_id) toggleProducts.push(String(promoToToggle.productId || promoToToggle.product_id));

           return toggleProducts.some(pid => pProducts.includes(pid));
        }
        return false;
      });

      if (overlappingPromo) {
        showToast(`Colisión: Esta promoción comparte productos con "${overlappingPromo.name}". Apágala primero.`, "error");
        return;
      }
    }

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

  // ✨ Preparar promociones enriquecidas para la vista de impresión
  const printablePromotions = useMemo(() => {
    if (printScope === 'rules_only') return [];

    const nowInChiapasStr = new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' });
    const today = new Date(nowInChiapasStr).getDay();
    const safeProducts = Array.isArray(products) ? products : [];

    return promotions
      .filter(p => {
        const rawActive = p.isActive ?? p.is_active ?? p.status;
        const isActive = rawActive === true || rawActive === 1 || rawActive === 'true' || rawActive === '1';
        if (!isActive) return false;

        if (printScope === 'today_only') {
          const vDays = parseValidDays(p);
          if (vDays.length > 0 && !vDays.includes(today)) return false;
        }
        return true;
      })
      .map(p => {
        const isTicketDiscount = p.type === 'TICKET_DISCOUNT';
        const triggerIds = (Array.isArray(p.applyToProducts) && p.applyToProducts.length > 0)
          ? p.applyToProducts.map(id => String(id).toLowerCase())
          : (p.productId || p.product_id) ? [String(p.productId || p.product_id).toLowerCase()] : [];

        const matchingProducts = isTicketDiscount
          ? []
          : safeProducts.filter(prod => triggerIds.includes(String(prod.id).toLowerCase()));

        return {
          promo: p,
          color: getPrintPromoColor(p),
          products: matchingProducts,
          isCombinable: isTicketDiscount || matchingProducts.length > 1,
          isTicketDiscount,
          daysLabel: formatValidDaysText(p)
        };
      });
  }, [promotions, products, printScope]);

  // ✨ Función para generar e imprimir el documento limpio en tamaño Carta
  const handleExecutePrint = () => {
    const isTent = printLayout === 'tent';
    const isLyaTheme = printTheme === 'lya';

    const bgSheet = isLyaTheme ? '#FAF6F0' : '#FFFFFF';
    const bgCard = isLyaTheme ? '#F3EBE0' : '#F9FAFB';
    const borderCard = isLyaTheme ? '#E5D5C0' : '#E5E7EB';
    const textMain = isLyaTheme ? '#3E2723' : '#111827';
    const textSub = isLyaTheme ? '#6D5444' : '#4B5563';
    const accentPrimary = isLyaTheme ? '#78350F' : '#EA580C';
    const warnBg = isLyaTheme ? '#FDF8EE' : '#FFFBEB';
    const warnBorder = isLyaTheme ? '#DEC6A7' : '#FDE68A';

    const buildSingleGuideHTML = () => {
      const rulesHTML = includeRulesBlock ? `
        <div class="section-block">
          <div class="section-title">¿Cómo funcionan nuestras Promociones?</div>
          <div class="pillars-grid">
            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-num" style="background:#e11d48;">1</span>
                <span class="pillar-title">Mismo Color = Combinables</span>
              </div>
              <p class="justified-text">
                Si varios productos comparten una promoción con el <strong>mismo color de etiqueta</strong>, puedes <strong>combinarlos entre sí</strong> aunque sean productos distintos.
              </p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-num" style="background:#2563eb;">2</span>
                <span class="pillar-title">Pide con tu Mesero o por QR</span>
              </div>
              <p class="justified-text">
                Puedes ordenar directamente con nuestro personal o escaneando el código QR de tu mesa; el sistema aplicará tus promociones de forma automática.
              </p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-num" style="background:#7c3aed;">3</span>
                <span class="pillar-title">Por Cuenta y Mismo Pedido</span>
              </div>
              <p class="justified-text">
                Las promociones de productos (2x1, 3x2, Combos o Regalos) se calculan <strong>únicamente dentro de una misma cuenta y ronda</strong>. Cuentas separadas no se suman entre sí.
              </p>
            </div>

            <div class="pillar-card">
              <div class="pillar-header">
                <span class="pillar-num" style="background:#059669;">4</span>
                <span class="pillar-title">Descuento por Ticket / Cuenta</span>
              </div>
              <p class="justified-text">
                Cuando hay promoción por <strong>monto mínimo de ticket</strong>, suma cualquier producto del menú en tu misma cuenta y al llegar a la meta se descuenta en automático.
              </p>
            </div>
          </div>
        </div>

        <div class="warning-box">
          <div class="warning-title">⚠️ Importante: Unión de Cuentas y ¿Cuándo se rompe una Promoción?</div>
          <div class="warning-grid">
            <div class="warning-item">
              <div class="warning-item-title" style="color:${accentPrimary};">🚫 Unir cuentas NO activa promos</div>
              <p class="justified-text">
                Si dos cuentas separadas pidieron por su lado y al final solicitan <strong>unir sus cuentas</strong>, no se activarán 2x1, 3x2, Combos ni Regalos. Si la cuenta que se une ya tenía una promo aplicada, <strong>esta se romperá</strong> y pasará a precio normal.
              </p>
            </div>
            <div class="warning-item">
              <div class="warning-item-title" style="color:#047857;">✅ Excepción: Descuento por Ticket</div>
              <p class="justified-text">
                La <strong>única promoción que sí se activa o actualiza al unir cuentas</strong> (o al trasladar productos a una misma cuenta) es el <strong>Descuento por Ticket</strong>, ya que evalúa el monto acumulado en la cuenta final.
              </p>
            </div>
            <div class="warning-item">
              <div class="warning-item-title" style="color:#be123c;">🔄 Mover productos de cuenta</div>
              <p class="justified-text">
                Si pides trasladar un producto con promoción (o el producto base que la activó) a otra cuenta distinta, <strong>se pierde el beneficio</strong> y se cobra a su precio normal de lista.
              </p>
            </div>
            <div class="warning-item">
              <div class="warning-item-title" style="color:#be123c;">🗑️ Cancelaciones o stock agotado</div>
              <p class="justified-text">
                Si se cancela o retira de la cuenta alguno de los artículos base que sostenían una promoción, <strong>el regalo o descuento se anula automáticamente</strong>. Sujeto a disponibilidad en inventario.
              </p>
            </div>
          </div>
        </div>
      ` : '';

      const promosHTML = printScope !== 'rules_only' ? `
        <div class="section-block" style="margin-top:${includeRulesBlock ? '8px' : '0'};">
          <div class="section-title">
            🏷️ ${printScope === 'today_only' ? 'Promociones Vigentes Hoy' : 'Catálogo de Promociones Vigentes'} (${printablePromotions.length})
          </div>
          ${printablePromotions.length === 0 ? `
            <div class="empty-box">No hay promociones activas seleccionadas para mostrar en este formato.</div>
          ` : `
            <div class="promos-list">
              ${printablePromotions.map(({ promo, color, products: matchingProds, isCombinable, isTicketDiscount, daysLabel }) => {
                const minAmount = Number(promo.minTicketAmount || promo.min_ticket_amount || 0);
                const cardBackground = isLyaTheme ? color.cardBg : '#FFFFFF';
                const cardBorderColor = color.cardBorder;

                return `
                  <div class="promo-card" style="background:${cardBackground}; border-color:${cardBorderColor};">
                    <div class="promo-top">
                      <div class="promo-badges">
                        <span class="promo-badge" style="background:${color.badgeBg}; color:${color.badgeText};">
                          ${getShortPromoLabel(promo)}
                        </span>
                        <span class="promo-name">${promo.name || 'Promoción'}</span>
                      </div>
                      <div class="promo-meta">
                        <span class="meta-tag">📅 ${daysLabel}</span>
                        <span class="meta-tag">
                          ${isTicketDiscount
                            ? `🧾 Mín. $${minAmount.toFixed(2)}`
                            : isCombinable
                              ? `🔗 Combinable (${matchingProds.length})`
                              : '🎯 Individual'}
                        </span>
                      </div>
                    </div>
                    <p class="promo-desc justified-text">${getPromoRuleDescription(promo)}</p>
                    <div class="promo-products">
                      ${isTicketDiscount
                        ? `<span class="prod-chip" style="color:#047857; border-color:#a7f3d0;">✨ Participan todos los productos del menú dentro de la misma cuenta</span>`
                        : matchingProds.map(pr => `<span class="prod-chip">${pr.nombre || pr.name}</span>`).join('')
                      }
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      ` : '';

      return `
        <div class="guide-sheet">
          <div class="header-bar">
            <div class="brand-box">
              <img src="${logoLyA}" alt="Logo LyA" class="brand-logo" />
              <div>
                <div class="brand-name">𝓛𝔂𝓪 Pastelería & Cafetería</div>
                <div class="brand-sub">Guía de Promociones y Reglas por Cuenta</div>
              </div>
            </div>
            <div class="header-badge">
              ${printScope === 'today_only' ? 'Promos de Hoy' : printScope === 'rules_only' ? 'Reglas en Mesa' : 'Guía Oficial'}
            </div>
          </div>
          ${rulesHTML}
          ${promosHTML}
          <div class="footer-note">
            ¿Prefieres ordenar sin usar el celular? Solicita tu pedido a nuestro personal indicando tus productos y en qué cuenta van. ¡Gracias por tu visita! ✨
          </div>
        </div>
      `;
    };

    const htmlDocument = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Guía de Promociones - Pastelería y Cafetería LyA</title>
        <style>
          @page {
            size: letter ${isTent ? 'landscape' : 'portrait'};
            margin: ${isTent ? '6mm' : '8mm'};
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
            background: #ffffff;
            color: ${textMain};
          }
          .page-wrapper {
            width: 100%;
            display: ${isTent ? 'grid' : 'block'};
            ${isTent ? 'grid-template-columns: 1fr 1fr; gap: 8mm; position: relative;' : ''}
          }
          ${isTent ? `
          .page-wrapper::after {
            content: '✂️';
            position: absolute;
            top: 0;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            border-left: 1.5px dashed #9ca3af;
            font-size: 11px;
            color: #6b7280;
            padding-top: 2mm;
          }
          ` : ''}
          .guide-sheet {
            background: ${bgSheet};
            border: 1.5px solid ${borderCard};
            border-radius: 18px;
            padding: ${isTent ? '10px 12px' : '16px 20px'};
            display: flex;
            flex-direction: column;
            gap: ${isTent ? '7px' : '10px'};
          }
          .header-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: ${isTent ? '6px' : '10px'};
            border-bottom: 1.5px solid ${borderCard};
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .brand-logo {
            width: ${isTent ? '34px' : '44px'};
            height: ${isTent ? '34px' : '44px'};
            border-radius: 50%;
            object-fit: cover;
            border: 1.5px solid ${accentPrimary};
          }
          .brand-name {
            font-size: ${isTent ? '14px' : '18px'};
            font-weight: 900;
            color: ${textMain};
            line-height: 1.15;
          }
          .brand-sub {
            font-size: ${isTent ? '9.5px' : '11.5px'};
            font-weight: 700;
            color: ${textSub};
          }
          .header-badge {
            background: ${accentPrimary};
            color: #ffffff;
            font-size: ${isTent ? '8.5px' : '10px'};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 4px 10px;
            border-radius: 999px;
          }
          .section-title {
            font-size: ${isTent ? '10px' : '12px'};
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: ${accentPrimary};
            margin-bottom: ${isTent ? '5px' : '7px'};
          }
          .pillars-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${isTent ? '5px' : '8px'};
          }
          .pillar-card {
            background: ${bgCard};
            border: 1px solid ${borderCard};
            border-radius: 11px;
            padding: ${isTent ? '6px 8px' : '9px 11px'};
          }
          .pillar-header {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 3px;
          }
          .pillar-num {
            width: ${isTent ? '15px' : '18px'};
            height: ${isTent ? '15px' : '18px'};
            border-radius: 5px;
            color: #ffffff;
            font-size: ${isTent ? '8.5px' : '10px'};
            font-weight: 900;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .pillar-title {
            font-size: ${isTent ? '9.5px' : '11px'};
            font-weight: 900;
            color: ${textMain};
          }
          .justified-text {
            text-align: justify;
            line-height: 1.38;
            font-size: ${isTent ? '8.3px' : '10px'};
            font-weight: 600;
            color: ${textSub};
          }
          .justified-text strong {
            color: ${textMain};
            font-weight: 800;
          }
          .warning-box {
            background: ${warnBg};
            border: 1.5px solid ${warnBorder};
            border-radius: 12px;
            padding: ${isTent ? '7px 9px' : '10px 12px'};
          }
          .warning-title {
            font-size: ${isTent ? '9.5px' : '11.5px'};
            font-weight: 900;
            color: ${accentPrimary};
            margin-bottom: ${isTent ? '5px' : '7px'};
          }
          .warning-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: ${isTent ? '5px' : '7px'};
          }
          .warning-item {
            background: #ffffff;
            border: 1px solid ${warnBorder};
            border-radius: 9px;
            padding: ${isTent ? '5px 7px' : '7px 9px'};
          }
          .warning-item-title {
            font-size: ${isTent ? '8.5px' : '10px'};
            font-weight: 900;
            margin-bottom: 2px;
          }
          .promos-list {
            display: grid;
            grid-template-columns: ${printablePromotions.length > 2 ? '1fr 1fr' : '1fr'};
            gap: ${isTent ? '5px' : '7px'};
          }
          .promo-card {
            border: 1.5px solid ${borderCard};
            border-radius: 11px;
            padding: ${isTent ? '6px 8px' : '9px 11px'};
            break-inside: avoid;
          }
          .promo-top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 4px;
          }
          .promo-badges {
            display: flex;
            align-items: center;
            gap: 5px;
            flex-wrap: wrap;
          }
          .promo-badge {
            font-size: ${isTent ? '8px' : '9.5px'};
            font-weight: 900;
            text-transform: uppercase;
            padding: 2px 7px;
            border-radius: 999px;
          }
          .promo-name {
            font-size: ${isTent ? '9.5px' : '11.5px'};
            font-weight: 900;
            color: ${textMain};
          }
          .promo-meta {
            display: flex;
            align-items: center;
            gap: 4px;
            flex-wrap: wrap;
          }
          .meta-tag {
            background: rgba(255,255,255,0.92);
            border: 1px solid rgba(0,0,0,0.08);
            border-radius: 5px;
            padding: 1.5px 5px;
            font-size: ${isTent ? '7.5px' : '8.5px'};
            font-weight: 800;
            color: ${textMain};
          }
          .promo-desc {
            margin-bottom: 5px;
          }
          .promo-products {
            display: flex;
            flex-wrap: wrap;
            gap: 3.5px;
          }
          .prod-chip {
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.1);
            border-radius: 5px;
            padding: 1.5px 6px;
            font-size: ${isTent ? '7.5px' : '8.8px'};
            font-weight: 800;
            color: ${textMain};
          }
          .empty-box {
            padding: 12px;
            text-align: center;
            font-size: 11px;
            font-weight: 700;
            color: ${textSub};
            border: 1px dashed ${borderCard};
            border-radius: 10px;
          }
          .footer-note {
            margin-top: auto;
            padding-top: 6px;
            border-top: 1px dashed ${borderCard};
            text-align: center;
            font-size: ${isTent ? '8px' : '9.5px'};
            font-weight: 800;
            color: ${accentPrimary};
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          ${buildSingleGuideHTML()}
          ${isTent ? buildSingleGuideHTML() : ''}
        </div>
      </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(htmlDocument);
    doc.close();

    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 250);
    };
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.4, ease: "easeOut" }} className="bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* HEADER RESPONSIVO NEO-BENTO */}
        <div className="p-5 sm:p-6 md:p-8 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 flex flex-col lg:flex-row justify-between lg:items-center gap-4 sm:gap-5 bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0 z-10 relative">
          
          {/* Lado Izquierdo: Títulos */}
          <div className="flex items-center gap-3 sm:gap-4 pr-10 lg:pr-0">
            <div className="bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-orange-200/50 dark:border-orange-800/30 lya:border-lya-primary/30 shrink-0">
              <Tag size={24} className="sm:w-7 sm:h-7" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight truncate">Motor de Promociones</h2>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 truncate">Combos, descuentos por volumen y rebajas directas.</p>
            </div>
          </div>
          
          {/* Lado Derecho: Botones (Imprimir Guía + Nueva Promoción + Cerrar) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 shrink-0 w-full lg:w-auto justify-end">
            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPrintModalOpen(true)} 
              className="w-full sm:w-auto bg-orange-50 md:hover:bg-orange-100 dark:bg-orange-950/30 dark:md:hover:bg-orange-900/40 lya:bg-lya-primary/10 lya:md:hover:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary border border-orange-200/80 dark:border-orange-800/40 lya:border-lya-primary/30 px-4 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-sm outline-none"
              title="Imprimir guía de promociones y reglas para mesas o mostrador"
            >
              <Printer size={18} strokeWidth={2.5} />
              <span>Imprimir para Mesas / Cartel</span>
            </motion.button>

            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditingPromo(null); setIsWizardOpen(true); }} 
              className="w-full sm:w-auto bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 dark:md:hover:bg-orange-500 lya:bg-lya-primary lya:md:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-5 py-3.5 sm:py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 outline-none"
            >
              <Plus size={20} /> <span>Nueva Promoción</span>
            </motion.button>

            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }} 
              onClick={onClose} 
              className="absolute top-5 right-5 lg:relative lg:top-auto lg:right-auto p-2 sm:p-3 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/30 lya:md:hover:bg-lya-border/50 text-gray-600 dark:text-gray-400 lya:text-lya-text/60 rounded-xl transition-colors outline-none"
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
                const vDays = parseValidDays(promo);

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
                          const isActiveDay = vDays.includes(i);
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

      {/* ✨ MODAL DE VISTA PREVIA E IMPRESIÓN PARA MESAS / MOSTRADOR */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-4xl max-h-[92dvh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col overflow-hidden"
            >
              {/* Encabezado del Modal de Impresión */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/15 text-orange-600 dark:text-orange-400 lya:text-lya-primary flex items-center justify-center shrink-0">
                    <Printer size={24} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight truncate">
                      Imprimir Guía de Promociones y Reglas
                    </h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 truncate">
                      Ideal para colocar en mesas, vitrina o junto a caja para clientes que ordenan con mesero
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="p-2.5 rounded-2xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-500 dark:text-gray-400 lya:text-lya-text/70 md:hover:bg-gray-200 dark:md:hover:bg-gray-700 transition-colors outline-none shrink-0"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Barra de Configuración de Impresión */}
              <div className="p-4 sm:px-6 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
                {/* 1. Tamaño / Formato */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1">
                    <Columns size={12} /> Formato de Hoja Carta
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-gray-900 lya:bg-lya-surface p-1 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40">
                    <button
                      type="button"
                      onClick={() => setPrintLayout('poster')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printLayout === 'poster'
                          ? 'bg-orange-500 lya:bg-lya-primary text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 lya:text-lya-text/70'
                      }`}
                    >
                      1x Hoja (Cartel)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintLayout('tent')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printLayout === 'tent'
                          ? 'bg-orange-500 lya:bg-lya-primary text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 lya:text-lya-text/70'
                      }`}
                    >
                      2x Hoja (Mesas)
                    </button>
                  </div>
                </div>

                {/* 2. Contenido de Promos */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1">
                    <Tag size={12} /> Promociones a Incluir
                  </span>
                  <select
                    value={printScope}
                    onChange={(e) => setPrintScope(e.target.value)}
                    className="h-[34px] px-3 rounded-xl bg-white dark:bg-gray-900 lya:bg-lya-surface border border-gray-200 dark:border-gray-700 lya:border-lya-border/40 text-xs font-black text-gray-800 dark:text-white lya:text-lya-text outline-none"
                  >
                    <option value="all_active">Todas las Activas (Semanal)</option>
                    <option value="today_only">Solo Promociones de Hoy</option>
                    <option value="rules_only">Solo Reglas (Sin lista)</option>
                  </select>
                </div>

                {/* 3. Estilo de Tinta */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1">
                    <Palette size={12} /> Modo de Tinta
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-gray-900 lya:bg-lya-surface p-1 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40">
                    <button
                      type="button"
                      onClick={() => setPrintTheme('lya')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printTheme === 'lya'
                          ? 'bg-[#78350F] text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 lya:text-lya-text/70'
                      }`}
                    >
                      Color 𝓛𝔂𝓪
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintTheme('ink_saver')}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-black transition-all ${
                        printTheme === 'ink_saver'
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 lya:text-lya-text/70'
                      }`}
                    >
                      Ahorro Tinta
                    </button>
                  </div>
                </div>

                {/* 4. Incluir Reglas */}
                <div className="flex flex-col gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (printScope === 'rules_only') return;
                      setIncludeRulesBlock(prev => !prev);
                    }}
                    className={`h-[34px] px-3 rounded-xl border text-xs font-black flex items-center justify-center gap-2 transition-all ${
                      includeRulesBlock || printScope === 'rules_only'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/50 text-emerald-700 dark:text-emerald-300'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500'
                    }`}
                  >
                    <Check size={14} strokeWidth={3} />
                    <span>Incluir Reglas de Cuenta</span>
                  </button>
                </div>
              </div>

              {/* Vista Previa en Vivo (Con textos justificados) */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-gray-200/70 dark:bg-gray-950">
                <div
                  className={`mx-auto max-w-2xl rounded-[1.75rem] p-5 sm:p-7 shadow-xl border-2 transition-colors ${
                    printTheme === 'lya'
                      ? 'bg-[#FAF6F0] text-[#3E2723] border-[#E5D5C0]'
                      : 'bg-white text-gray-900 border-gray-200'
                  }`}
                >
                  {/* Encabezado de la Hoja */}
                  <div className={`flex items-center justify-between gap-3 pb-4 mb-4 border-b-2 ${
                    printTheme === 'lya' ? 'border-[#E5D5C0]' : 'border-gray-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <img
                        src={logoLyA}
                        alt="Logo LyA"
                        className="w-12 h-12 rounded-full object-cover border-2 border-[#78350F]"
                      />
                      <div>
                        <h4 className="text-base sm:text-lg font-black leading-tight">
                          𝓛𝔂𝓪 Pastelería & Cafetería
                        </h4>
                        <p className={`text-xs font-bold ${printTheme === 'lya' ? 'text-[#6D5444]' : 'text-gray-500'}`}>
                          Guía de Promociones y Reglas por Cuenta
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white ${
                      printTheme === 'lya' ? 'bg-[#78350F]' : 'bg-orange-600'
                    }`}>
                      {printLayout === 'tent' ? 'Vista 2 por Hoja (Mesas)' : 'Vista Cartel 1 por Hoja'}
                    </span>
                  </div>

                  {/* Bloque de Reglas y Unión de Cuentas */}
                  {(includeRulesBlock || printScope === 'rules_only') && (
                    <div className="space-y-4 mb-5">
                      <div>
                        <h5 className={`text-xs font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
                          printTheme === 'lya' ? 'text-[#78350F]' : 'text-orange-600'
                        }`}>
                          <Sparkles size={14} /> ¿Cómo funcionan nuestras Promociones?
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <div className={`p-3.5 rounded-2xl border ${
                            printTheme === 'lya' ? 'bg-[#F3EBE0] border-[#E5D5C0]' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center gap-2 font-black text-xs mb-1">
                              <span className="w-5 h-5 rounded-md bg-rose-600 text-white flex items-center justify-center text-[10px] shrink-0">1</span>
                              <span>Mismo Color = Combinables</span>
                            </div>
                            <p className={`text-[11px] font-semibold leading-relaxed text-justify ${
                              printTheme === 'lya' ? 'text-[#5D4037]' : 'text-gray-600'
                            }`}>
                              Si varios productos comparten una promoción con el <strong>mismo color de etiqueta</strong>, puedes <strong>combinarlos entre sí</strong> aunque sean productos distintos.
                            </p>
                          </div>

                          <div className={`p-3.5 rounded-2xl border ${
                            printTheme === 'lya' ? 'bg-[#F3EBE0] border-[#E5D5C0]' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center gap-2 font-black text-xs mb-1">
                              <span className="w-5 h-5 rounded-md bg-blue-600 text-white flex items-center justify-center text-[10px] shrink-0">2</span>
                              <span>Pide con tu Mesero o por QR</span>
                            </div>
                            <p className={`text-[11px] font-semibold leading-relaxed text-justify ${
                              printTheme === 'lya' ? 'text-[#5D4037]' : 'text-gray-600'
                            }`}>
                              Puedes ordenar directamente con nuestro personal o escaneando el código QR de tu mesa; el sistema aplicará tus promociones de forma automática.
                            </p>
                          </div>

                          <div className={`p-3.5 rounded-2xl border ${
                            printTheme === 'lya' ? 'bg-[#F3EBE0] border-[#E5D5C0]' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center gap-2 font-black text-xs mb-1">
                              <span className="w-5 h-5 rounded-md bg-violet-600 text-white flex items-center justify-center text-[10px] shrink-0">3</span>
                              <span>Por Cuenta y Mismo Pedido</span>
                            </div>
                            <p className={`text-[11px] font-semibold leading-relaxed text-justify ${
                              printTheme === 'lya' ? 'text-[#5D4037]' : 'text-gray-600'
                            }`}>
                              Las promociones de productos (2x1, 3x2, Combos o Regalos) se calculan <strong>únicamente dentro de una misma cuenta y ronda</strong>. Cuentas separadas no se suman entre sí.
                            </p>
                          </div>

                          <div className={`p-3.5 rounded-2xl border ${
                            printTheme === 'lya' ? 'bg-[#F3EBE0] border-[#E5D5C0]' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center gap-2 font-black text-xs mb-1">
                              <span className="w-5 h-5 rounded-md bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0">4</span>
                              <span>Descuento por Ticket / Cuenta</span>
                            </div>
                            <p className={`text-[11px] font-semibold leading-relaxed text-justify ${
                              printTheme === 'lya' ? 'text-[#5D4037]' : 'text-gray-600'
                            }`}>
                              Cuando hay promoción por <strong>monto mínimo de ticket</strong>, suma cualquier producto del menú en tu misma cuenta y al llegar a la meta se descuenta en automático.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className={`p-4 rounded-2xl border-2 space-y-2.5 ${
                        printTheme === 'lya' ? 'bg-[#FDF8EE] border-[#DEC6A7]' : 'bg-amber-50/70 border-amber-200'
                      }`}>
                        <div className={`flex items-center gap-2 font-black text-xs ${
                          printTheme === 'lya' ? 'text-[#78350F]' : 'text-amber-800'
                        }`}>
                          <ShieldAlert size={16} strokeWidth={2.5} className="shrink-0" />
                          <span>Importante: Unión de Cuentas y ¿Cuándo se rompe una Promoción?</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
                          <div className="p-3 rounded-xl bg-white border border-amber-200/70">
                            <p className="font-black text-amber-800 mb-1">🚫 Unir cuentas NO activa promos</p>
                            <p className="font-semibold text-gray-700 leading-relaxed text-justify">
                              Si dos cuentas separadas pidieron por su lado y al final solicitan <strong>unir sus cuentas</strong>, no se activarán 2x1, 3x2, Combos ni Regalos. Si la cuenta que se une ya tenía una promo aplicada, <strong>esta se romperá</strong> y pasará a precio normal.
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-white border border-emerald-200/80">
                            <p className="font-black text-emerald-700 mb-1">✅ Excepción: Descuento por Ticket</p>
                            <p className="font-semibold text-gray-700 leading-relaxed text-justify">
                              La <strong>única promoción que sí se activa o actualiza al unir cuentas</strong> (o al trasladar productos a una misma cuenta) es el <strong>Descuento por Ticket</strong>, ya que evalúa el monto acumulado en la cuenta final.
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-white border border-amber-200/70">
                            <p className="font-black text-rose-700 mb-1">🔄 Mover productos de cuenta</p>
                            <p className="font-semibold text-gray-700 leading-relaxed text-justify">
                              Si pides trasladar un producto con promoción (o el producto base que la activó) a otra cuenta distinta, <strong>se pierde el beneficio</strong> y se cobra a su precio normal de lista.
                            </p>
                          </div>
                          <div className="p-3 rounded-xl bg-white border border-amber-200/70">
                            <p className="font-black text-rose-700 mb-1">🗑️ Cancelaciones o stock agotado</p>
                            <p className="font-semibold text-gray-700 leading-relaxed text-justify">
                              Si se cancela o retira de la cuenta alguno de los artículos base que sostenían una promoción, <strong>el regalo o descuento se anula automáticamente</strong>. Sujeto a disponibilidad en inventario.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de Promociones en la Vista Previa */}
                  {printScope !== 'rules_only' && (
                    <div>
                      <h5 className={`text-xs font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
                        printTheme === 'lya' ? 'text-[#78350F]' : 'text-orange-600'
                      }`}>
                        <Tag size={14} /> {printScope === 'today_only' ? 'Promociones Vigentes Hoy' : 'Catálogo de Promociones Vigentes'} ({printablePromotions.length})
                      </h5>

                      {printablePromotions.length === 0 ? (
                        <div className="p-5 rounded-2xl border border-dashed border-gray-300 text-center text-xs font-bold text-gray-500">
                          No hay promociones activas que coincidan con este filtro.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {printablePromotions.map(({ promo, color, products: matchingProds, isCombinable, isTicketDiscount, daysLabel }) => {
                            const minAmount = Number(promo.minTicketAmount || promo.min_ticket_amount || 0);
                            return (
                              <div
                                key={promo.id}
                                style={{
                                  backgroundColor: printTheme === 'lya' ? color.cardBg : '#ffffff',
                                  borderColor: color.cardBorder
                                }}
                                className="p-3.5 rounded-2xl border-2 flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span
                                        style={{ backgroundColor: color.badgeBg, color: color.badgeText }}
                                        className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                                      >
                                        {getShortPromoLabel(promo)}
                                      </span>
                                      <span className="font-black text-xs text-gray-900">
                                        {promo.name}
                                      </span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-white/90 border border-black/10 text-[9.5px] font-black text-gray-800">
                                      📅 {daysLabel}
                                    </span>
                                  </div>

                                  <p className="text-[11px] font-semibold text-gray-700 leading-relaxed text-justify mb-2.5">
                                    {getPromoRuleDescription(promo)}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-1 pt-1 border-t border-black/5">
                                  {isTicketDiscount ? (
                                    <span className="px-2 py-0.5 rounded-md bg-white text-emerald-700 text-[10px] font-black border border-emerald-200">
                                      ✨ Participan todos los productos del menú (Mín. ${minAmount.toFixed(2)})
                                    </span>
                                  ) : (
                                    matchingProds.map(pr => (
                                      <span
                                        key={pr.id}
                                        className="px-2 py-0.5 rounded-md bg-white text-gray-800 text-[10px] font-bold border border-black/10"
                                      >
                                        {pr.nombre || pr.name}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Pie del Modal con Botón de Impresión */}
              <div className="p-4 sm:p-5 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-center sm:text-left">
                  {printLayout === 'tent'
                    ? '✂️ Se imprimirán 2 guías idénticas en 1 hoja Carta Horizontal con línea de corte.'
                    : '📄 Se imprimirá 1 cartel completo en 1 hoja Carta Vertical.'}
                </p>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="flex-1 sm:flex-initial px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 lya:bg-lya-bg text-gray-700 dark:text-gray-300 lya:text-lya-text font-black text-xs sm:text-sm outline-none"
                  >
                    Cerrar
                  </button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={handleExecutePrint}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 lya:bg-lya-primary text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 outline-none"
                  >
                    <Printer size={18} strokeWidth={2.5} />
                    <span>Mandar a Imprimir / Guardar PDF</span>
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
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mb-8 px-2 text-justify leading-relaxed">
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
        allPromotions={promotions}
        onPromotionSaved={() => {
          setIsWizardOpen(false);
          fetchPromotions(true);
          showToast("Promoción guardada exitosamente", "success");
        }}
      />
    </motion.div>
  );
};