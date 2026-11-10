// frontend/src/modules/admin/views/PromotionsManagerTab.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Tag, Plus, Edit2, Trash2, Power, Loader2, AlertTriangle, 
  Globe, ShoppingBag, Sparkles, ShieldAlert, 
  Columns, Palette, FileDown
} from 'lucide-react';
import api from '../../../api/client';
import PromotionManagerModal from './PromotionManagerModal';
import logoLyA from '../../../assets/logo.jpeg';

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

// Datos fijos de la guía (siempre visibles y justificados)
const PILLARS_DATA = [
  {
    num: '1',
    color: '#e11d48',
    title: 'Mismo Color = Combinables',
    text: 'Si varios productos tienen una etiqueta del <strong>mismo color</strong> y la misma promoción, puedes <strong>combinarlos entre sí</strong> (incluso si son productos distintos) para completar la promoción.'
  },
  {
    num: '2',
    color: '#2563eb',
    title: 'Pide con Mesero o por QR',
    text: 'Puedes ordenar directamente con nuestro personal o desde el menú digital de tu mesa; en ambos casos el sistema aplicará tus promociones de forma automática.'
  },
  {
    num: '3',
    color: '#7c3aed',
    title: 'Estrictamente por Cuenta y Ronda',
    text: 'Las promociones de productos (2x1, 3x2, Combos o Regalos) se calculan <strong>únicamente dentro de la misma cuenta y pedido</strong>. Cuentas separadas no se suman entre sí.'
  },
  {
    num: '4',
    color: '#059669',
    title: 'Descuento por Ticket / Cuenta',
    text: 'Cuando hay una promoción por <strong>monto mínimo de ticket</strong>, suma cualquier producto del menú dentro de tu misma cuenta y al llegar a la meta se descuenta automáticamente.'
  }
];

const WARNING_RULES_DATA = [
  {
    title: '🚫 Unir cuentas NO desbloquea promos de productos',
    titleColorLya: '#78350F',
    titleColorInk: '#b45309',
    borderColor: '#fde68a',
    text: 'Si dos cuentas separadas pidieron productos por su lado y al final deciden <strong>unir sus cuentas</strong>, no se activarán promos como 2x1, 3x2, Combos o Regalos. Además, si una cuenta que se va a unir <strong>ya tenía una promo aplicada, esta se romperá</strong> y pasará a precio normal.'
  },
  {
    title: '✅ Única excepción al unir: Descuento por Ticket',
    titleColorLya: '#047857',
    titleColorInk: '#047857',
    borderColor: '#a7f3d0',
    text: 'La <strong>única promoción que sí se activa o actualiza al unir cuentas</strong> (o al pasar productos a una misma cuenta) es la de <strong>Descuento por Ticket</strong>, ya que evalúa el total acumulado en dinero de la cuenta final.'
  },
  {
    title: '🔄 Mover un producto individual a otra cuenta',
    titleColorLya: '#be123c',
    titleColorInk: '#be123c',
    borderColor: '#fde68a',
    text: 'Si solicitas trasladar un producto con beneficio a otra cuenta distinta, <strong>pierde la promoción y se cobra a precio normal</strong>. Si se mueve el producto base que sostenía una promo, el regalo o descuento en la cuenta original también se anulará.'
  },
  {
    title: '🗑️ Quitar, cancelar o falta de stock',
    titleColorLya: '#be123c',
    titleColorInk: '#be123c',
    borderColor: '#fde68a',
    text: 'Si se resta, elimina o cancela alguno de los artículos base que activaban una promoción, <strong>el descuento o regalo se anula automáticamente</strong>. Todas las promociones están sujetas a disponibilidad de inventario.'
  }
];

// Helpers de dibujo en Canvas
const drawRoundedRect = (ctx, x, y, width, height, radius, fillColor, strokeColor, strokeWidth = 1) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor && strokeWidth > 0) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
  }
};

const parseRichTokens = (htmlStr) => {
  const parts = String(htmlStr).split(/(<strong>.*?<\/strong>)/g);
  const tokens = [];
  parts.forEach(part => {
    if (!part) return;
    const isBold = part.startsWith('<strong>') && part.endsWith('</strong>');
    const cleanText = isBold ? part.replace(/<\/?strong>/g, '') : part;
    const words = cleanText.trim().split(/\s+/).filter(Boolean);
    words.forEach(w => tokens.push({ word: w, bold: isBold }));
  });
  return tokens;
};

const drawJustifiedRichParagraph = (ctx, htmlText, x, y, maxWidth, lineHeight, fontSize, fontFamily, normalColor, boldColor) => {
  const tokens = parseRichTokens(htmlText);
  const normalFont = `600 ${fontSize}px ${fontFamily}`;
  const boldFont = `800 ${fontSize}px ${fontFamily}`;
  const minSpace = fontSize * 0.28;

  const measuredTokens = tokens.map(t => {
    ctx.font = t.bold ? boldFont : normalFont;
    return { ...t, width: ctx.measureText(t.word).width };
  });

  const lines = [];
  let currentLine = [];
  let currentWidth = 0;

  measuredTokens.forEach(token => {
    const spaceNeeded = currentLine.length > 0 ? minSpace : 0;
    if (currentWidth + spaceNeeded + token.width <= maxWidth || currentLine.length === 0) {
      currentLine.push(token);
      currentWidth += spaceNeeded + token.width;
    } else {
      lines.push(currentLine);
      currentLine = [token];
      currentWidth = token.width;
    }
  });
  if (currentLine.length > 0) lines.push(currentLine);

  let cursorY = y;
  lines.forEach((line, lineIdx) => {
    const isLastLine = lineIdx === lines.length - 1;
    const totalWordsWidth = line.reduce((acc, t) => acc + t.width, 0);
    const gap = (!isLastLine && line.length > 1)
      ? (maxWidth - totalWordsWidth) / (line.length - 1)
      : minSpace;

    let cursorX = x;
    line.forEach(t => {
      ctx.font = t.bold ? boldFont : normalFont;
      ctx.fillStyle = t.bold ? boldColor : normalColor;
      ctx.textBaseline = 'top';
      ctx.fillText(t.word, cursorX, cursorY);
      cursorX += t.width + gap;
    });
    cursorY += lineHeight;
  });

  return cursorY;
};

// ✨ Empaquetador nativo de Canvas a archivo binario PDF 1.4 (Tamaño Carta exacto)
const buildPdfBlobFromCanvas = (canvas, isLandscape = false) => {
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.98);
  const base64Data = jpegDataUrl.split(',')[1];
  const binaryStr = atob(base64Data);
  const jpegBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    jpegBytes[i] = binaryStr.charCodeAt(i);
  }

  const pageWidthPt = isLandscape ? 792 : 612;
  const pageHeightPt = isLandscape ? 612 : 792;
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  const encoder = new TextEncoder();
  const chunks = [];
  const offsets = [0];
  let currentOffset = 0;

  const pushStr = (str) => {
    const bytes = encoder.encode(str);
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  const pushBytes = (bytes) => {
    chunks.push(bytes);
    currentOffset += bytes.length;
  };

  pushStr('%PDF-1.4\n');

  offsets[1] = currentOffset;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = currentOffset;
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  offsets[3] = currentOffset;
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt} ${pageHeightPt}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  offsets[4] = currentOffset;
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  );
  pushBytes(jpegBytes);
  pushStr('\nendstream\nendobj\n');

  const contentStream = `q ${pageWidthPt} 0 0 ${pageHeightPt} 0 0 cm /Im0 Do Q\n`;
  offsets[5] = currentOffset;
  pushStr(`5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}endstream\nendobj\n`);

  const xrefOffset = currentOffset;
  pushStr('xref\n0 6\n0000000000 65535 f \n');
  for (let i = 1; i <= 5; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  pushStr(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: 'application/pdf' });
};

export const PromotionsManagerTab = ({ isOpen, onClose, products, showToast }) => {
  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);

  const [promoToDelete, setPromoToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(null);

  // ✨ Estados para el Modal de Descarga de PDF
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState('tent'); // 'poster' (1x Hoja) | 'tent' (2x Hoja Mesas)
  const [printTheme, setPrintTheme] = useState('lya'); // 'lya' (Color LyA) | 'ink_saver' (Ahorro Tinta)
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

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

  // ✨ Renderizado de la hoja en Canvas de Alta Resolución (Sin líneas punteadas abajo y sin traslapes)
  const generateGuideCanvas = async () => {
    const isTent = printLayout === 'tent';
    const isLya = printTheme === 'lya';

    const loadLogo = () => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = logoLyA;
    });

    const logoImg = await loadLogo();
    const canvas = document.createElement('canvas');

    // Proporción exacta US Letter (11:8.5 y 8.5:11)
    if (isTent) {
      canvas.width = 2640;
      canvas.height = 2040;
    } else {
      canvas.width = 2040;
      canvas.height = 2640;
    }

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const fontStack = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    const drawSingleGuideOnCanvas = (originX, originY, boxW, boxH) => {
      const s = boxW / 1000;
      const isTallCard = (boxH / boxW) > 1.4; // True en modo 2x Hoja (Mesas)

      const bgSheet = isLya ? '#FAF6F0' : '#FFFFFF';
      const bgCard = isLya ? '#F3EBE0' : '#F9FAFB';
      const borderCard = isLya ? '#E5D5C0' : '#E5E7EB';
      const textMain = isLya ? '#3E2723' : '#111827';
      const textSub = isLya ? '#5D4037' : '#4B5563';
      const accentPrimary = isLya ? '#78350F' : '#EA580C';
      const warnBg = isLya ? '#FDF8EE' : '#FFFBEB';
      const warnBorder = isLya ? '#DEC6A7' : '#FDE68A';

      // Contenedor exterior de la guía
      drawRoundedRect(ctx, originX, originY, boxW, boxH, 28 * s, bgSheet, borderCard, 2.5 * s);

      const pad = 38 * s;
      const innerX = originX + pad;
      const innerW = boxW - pad * 2;
      let curY = originY + (isTallCard ? 46 * s : 36 * s);

      // 1. HEADER
      const logoSize = 74 * s;
      if (logoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(innerX + logoSize / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(logoImg, innerX, curY, logoSize, logoSize);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(innerX + logoSize / 2, curY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
        ctx.lineWidth = 2.5 * s;
        ctx.strokeStyle = accentPrimary;
        ctx.stroke();
      }

      const titleX = innerX + logoSize + 18 * s;
      ctx.font = `900 ${28 * s}px ${fontStack}`;
      ctx.fillStyle = textMain;
      ctx.textBaseline = 'top';
      ctx.fillText('𝓛𝔂𝓪 Pastelería & Cafetería', titleX, curY + 10 * s);

      ctx.font = `700 ${16 * s}px ${fontStack}`;
      ctx.fillStyle = textSub;
      ctx.fillText('Funciones de Promociones y Reglas por Cuenta', titleX, curY + 45 * s);

      const badgeText = 'GUÍA EN MESA';
      ctx.font = `900 ${13 * s}px ${fontStack}`;
      const badgeW = ctx.measureText(badgeText).width + 28 * s;
      const badgeH = 32 * s;
      const badgeX = innerX + innerW - badgeW;
      const badgeY = curY + 20 * s;
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 16 * s, accentPrimary, null, 0);
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, badgeX + 14 * s, badgeY + badgeH / 2);

      curY += logoSize + (isTallCard ? 28 * s : 20 * s);

      // Línea divisoria sólida bajo el encabezado
      ctx.beginPath();
      ctx.moveTo(innerX, curY);
      ctx.lineTo(innerX + innerW, curY);
      ctx.lineWidth = 2 * s;
      ctx.strokeStyle = borderCard;
      ctx.stroke();

      curY += (isTallCard ? 32 * s : 22 * s);

      // 2. TÍTULO SECCIÓN 1
      ctx.font = `900 ${18 * s}px ${fontStack}`;
      ctx.fillStyle = accentPrimary;
      ctx.textBaseline = 'top';
      ctx.fillText('✨ ¿CÓMO FUNCIONAN NUESTRAS PROMOCIONES?', innerX, curY);
      curY += (isTallCard ? 36 * s : 30 * s);

      // 3. GRID 2x2 DE LOS 4 PILARES
      const colGap = 18 * s;
      const rowGap = (isTallCard ? 22 : 16) * s;
      const colW = (innerW - colGap) / 2;
      const pillarCardH = (isTallCard ? 215 : 185) * s;

      for (let i = 0; i < PILLARS_DATA.length; i++) {
        const item = PILLARS_DATA[i];
        const colIdx = i % 2;
        const rowIdx = Math.floor(i / 2);
        const cardX = innerX + colIdx * (colW + colGap);
        const cardY = curY + rowIdx * (pillarCardH + rowGap);

        drawRoundedRect(ctx, cardX, cardY, colW, pillarCardH, 18 * s, bgCard, borderCard, 1.5 * s);

        const cPad = 20 * s;
        const numSize = 28 * s;
        drawRoundedRect(ctx, cardX + cPad, cardY + cPad, numSize, numSize, 8 * s, item.color, null, 0);

        ctx.font = `900 ${15 * s}px ${fontStack}`;
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.num, cardX + cPad + numSize / 2, cardY + cPad + numSize / 2);
        ctx.textAlign = 'left';

        ctx.font = `900 ${16.5 * s}px ${fontStack}`;
        ctx.fillStyle = textMain;
        ctx.textBaseline = 'middle';
        ctx.fillText(item.title, cardX + cPad + numSize + 10 * s, cardY + cPad + numSize / 2);

        drawJustifiedRichParagraph(
          ctx,
          item.text,
          cardX + cPad,
          cardY + cPad + numSize + (isTallCard ? 16 : 12) * s,
          colW - cPad * 2,
          (isTallCard ? 23.5 : 21.5) * s,
          15 * s,
          fontStack,
          textSub,
          textMain
        );
      }

      curY += pillarCardH * 2 + rowGap + (isTallCard ? 36 : 24) * s;

      // 4. BLOQUE IMPORTANTE: UNIÓN DE CUENTAS Y RUPTURA DE PROMOS
      const warnBoxPad = 22 * s;
      const warnInnerW = innerW - warnBoxPad * 2;
      const warnColW = (warnInnerW - colGap) / 2;
      const warnCardH = (isTallCard ? 250 : 222) * s;
      const warnHeaderH = (isTallCard ? 42 : 36) * s;
      const warnBoxH = warnBoxPad * 2 + warnHeaderH + warnCardH * 2 + rowGap;

      drawRoundedRect(ctx, innerX, curY, innerW, warnBoxH, 22 * s, warnBg, warnBorder, 2.5 * s);

      let warnY = curY + warnBoxPad;
      ctx.font = `900 ${18 * s}px ${fontStack}`;
      ctx.fillStyle = accentPrimary;
      ctx.textBaseline = 'top';
      ctx.fillText('⚠️ Importante: Unión de Cuentas y ¿Cuándo se rompe una Promoción?', innerX + warnBoxPad, warnY);

      warnY += warnHeaderH;

      for (let i = 0; i < WARNING_RULES_DATA.length; i++) {
        const rule = WARNING_RULES_DATA[i];
        const colIdx = i % 2;
        const rowIdx = Math.floor(i / 2);
        const wCardX = innerX + warnBoxPad + colIdx * (warnColW + colGap);
        const wCardY = warnY + rowIdx * (warnCardH + rowGap);

        drawRoundedRect(ctx, wCardX, wCardY, warnColW, warnCardH, 15 * s, '#FFFFFF', rule.borderColor, 1.5 * s);

        const wPad = 18 * s;
        ctx.font = `900 ${15 * s}px ${fontStack}`;
        ctx.fillStyle = isLya ? rule.titleColorLya : rule.titleColorInk;
        ctx.textBaseline = 'top';
        ctx.fillText(rule.title, wCardX + wPad, wCardY + wPad);

        drawJustifiedRichParagraph(
          ctx,
          rule.text,
          wCardX + wPad,
          wCardY + wPad + (isTallCard ? 30 : 26) * s,
          warnColW - wPad * 2,
          (isTallCard ? 22.5 : 20.5) * s,
          14.3 * s,
          fontStack,
          '#374151',
          '#111827'
        );
      }

      curY += warnBoxH + (isTallCard ? 28 : 18) * s;

      // 5. PIE DE PÁGINA EN PÍLDORA SUAVE (SIN LÍNEA PUNTEADA DE CORTE)
      const footerBoxH = (isTallCard ? 48 : 42) * s;
      drawRoundedRect(ctx, innerX, curY, innerW, footerBoxH, 14 * s, bgCard, borderCard, 1.2 * s);

      ctx.font = `800 ${13.2 * s}px ${fontStack}`;
      ctx.fillStyle = accentPrimary;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        '¿Prefieres ordenar sin usar el celular? Solicita tu pedido a nuestro personal indicando tus productos y en qué cuenta van. ✨',
        originX + boxW / 2,
        curY + footerBoxH / 2
      );
      ctx.textAlign = 'left';
    };

    if (isTent) {
      const margin = 50;
      const halfW = 1230;
      const cardH = canvas.height - margin * 2;

      drawSingleGuideOnCanvas(margin, margin, halfW, cardH);
      drawSingleGuideOnCanvas(canvas.width - margin - halfW, margin, halfW, cardH);

      // Única línea de recorte vertical en medio de las 2 guías (modo 2x Hoja)
      ctx.save();
      ctx.setLineDash([14, 12]);
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, 24);
      ctx.lineTo(canvas.width / 2, canvas.height - 24);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#9CA3AF';
      ctx.stroke();
      ctx.restore();

      ctx.font = `900 26px ${fontStack}`;
      ctx.fillStyle = '#6B7280';
      ctx.textAlign = 'center';
      ctx.fillText('✂️', canvas.width / 2, 34);
      ctx.fillText('✂️', canvas.width / 2, canvas.height - 54);
      ctx.textAlign = 'left';
    } else {
      const margin = 64;
      drawSingleGuideOnCanvas(margin, margin, canvas.width - margin * 2, canvas.height - margin * 2);
    }

    return canvas;
  };

  // ✨ Descarga directa del archivo en formato .PDF
  const handleDownloadGuidePdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    try {
      const isTent = printLayout === 'tent';
      const canvas = await generateGuideCanvas();
      const pdfBlob = buildPdfBlobFromCanvas(canvas, isTent);

      const blobUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      const layoutSlug = isTent ? 'Mesas-2xHoja' : 'Cartel-1xHoja';
      const themeSlug = printTheme === 'lya' ? 'ColorLyA' : 'AhorroTinta';
      link.download = `Funciones-Promociones-y-Reglas-${layoutSlug}-${themeSlug}.pdf`;
      link.href = blobUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

      if (showToast) showToast('PDF de funciones y reglas descargado exitosamente', 'success');
    } catch (err) {
      console.error('Error generando PDF de guía:', err);
      if (showToast) showToast('Error al generar el PDF', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Componente interno para renderizar la tarjeta de guía en la vista previa (sin línea punteada abajo)
  const GuidePreviewCard = ({ compact = false }) => (
    <div
      className={`rounded-[1.75rem] ${compact ? 'p-4' : 'p-5 sm:p-7'} shadow-xl border-2 transition-colors flex flex-col justify-between ${
        printTheme === 'lya'
          ? 'bg-[#FAF6F0] text-[#3E2723] border-[#E5D5C0]'
          : 'bg-white text-gray-900 border-gray-200'
      }`}
    >
      <div>
        {/* Encabezado de la Hoja */}
        <div className={`flex items-center justify-between gap-3 pb-3.5 mb-4 border-b-2 ${
          printTheme === 'lya' ? 'border-[#E5D5C0]' : 'border-gray-200'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={logoLyA}
              alt="Logo LyA"
              className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-full object-cover border-2 border-[#78350F] shrink-0`}
            />
            <div className="min-w-0">
              <h4 className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} font-black leading-tight truncate`}>
                𝓛𝔂𝓪 Pastelería & Cafetería
              </h4>
              <p className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold truncate ${printTheme === 'lya' ? 'text-[#6D5444]' : 'text-gray-500'}`}>
                Funciones de Promociones y Reglas por Cuenta
              </p>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shrink-0 ${
            printTheme === 'lya' ? 'bg-[#78350F]' : 'bg-orange-600'
          }`}>
            Guía en Mesa
          </span>
        </div>

        {/* 1. Los 4 Pilares de Cómo Funcionan */}
        <div className="mb-4">
          <h5 className={`${compact ? 'text-[10px]' : 'text-xs'} font-black uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${
            printTheme === 'lya' ? 'text-[#78350F]' : 'text-orange-600'
          }`}>
            <Sparkles size={14} className="shrink-0" /> ¿Cómo funcionan nuestras Promociones?
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {PILLARS_DATA.map((item) => (
              <div
                key={item.num}
                className={`p-3 sm:p-3.5 rounded-2xl border ${
                  printTheme === 'lya' ? 'bg-[#F3EBE0] border-[#E5D5C0]' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 font-black text-xs mb-1">
                  <span
                    style={{ backgroundColor: item.color }}
                    className="w-5 h-5 rounded-md text-white flex items-center justify-center text-[10px] shrink-0"
                  >
                    {item.num}
                  </span>
                  <span>{item.title}</span>
                </div>
                <p
                  className={`text-[11px] font-semibold leading-relaxed text-justify ${
                    printTheme === 'lya' ? 'text-[#5D4037]' : 'text-gray-600'
                  }`}
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 2. Reglas de Unión de Cuentas y Ruptura de Promociones */}
        <div className={`p-3.5 sm:p-4 rounded-2xl border-2 space-y-2.5 ${
          printTheme === 'lya' ? 'bg-[#FDF8EE] border-[#DEC6A7]' : 'bg-amber-50/70 border-amber-200'
        }`}>
          <div className={`flex items-center gap-2 font-black text-xs ${
            printTheme === 'lya' ? 'text-[#78350F]' : 'text-amber-800'
          }`}>
            <ShieldAlert size={16} strokeWidth={2.5} className="shrink-0" />
            <span>Importante: Unión de Cuentas y ¿Cuándo se rompe una Promoción?</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            {WARNING_RULES_DATA.map((rule, idx) => (
              <div
                key={idx}
                style={{ borderColor: rule.borderColor }}
                className="p-3 rounded-xl bg-white border"
              >
                <p
                  style={{ color: printTheme === 'lya' ? rule.titleColorLya : rule.titleColorInk }}
                  className="font-black mb-1"
                >
                  {rule.title}
                </p>
                <p
                  className="font-semibold text-gray-700 leading-relaxed text-justify"
                  dangerouslySetInnerHTML={{ __html: rule.text }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pie de la Hoja en caja suave (sin línea punteada que parezca recorte) */}
      <div className={`mt-4 py-2.5 px-3.5 rounded-xl border text-center text-[10px] sm:text-[11px] font-black ${
        printTheme === 'lya'
          ? 'bg-[#F3EBE0] border-[#E5D5C0] text-[#78350F]'
          : 'bg-gray-50 border-gray-200 text-orange-600'
      }`}>
        ¿Prefieres ordenar sin usar el celular? Solicita tu pedido a nuestro personal indicando tus productos y en qué cuenta van. ✨
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} transition={{ duration: 0.4, ease: "easeOut" }} className="bg-gray-50 dark:bg-gray-950 lya:bg-lya-bg w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        
        {/* HEADER RESPONSIVO NEO-BENTO CORREGIDO */}
        <div className="p-5 sm:p-6 md:px-8 md:py-6 border-b border-gray-200 dark:border-gray-800 lya:border-lya-border/40 flex flex-col lg:flex-row justify-between lg:items-center gap-4 bg-white dark:bg-gray-900 lya:bg-lya-surface shrink-0 z-10 relative">
          
          {/* Lado Izquierdo: Títulos con min-w-0 y flex-1 para no empujar los botones fuera del modal */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 pr-12 lg:pr-2">
            <div className="bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-orange-200/50 dark:border-orange-800/30 lya:border-lya-primary/30 shrink-0">
              <Tag size={24} className="sm:w-6 sm:h-6" strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl md:text-2xl font-black text-gray-800 dark:text-white lya:text-lya-text tracking-tight truncate">
                Motor de Promociones
              </h2>
              <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 lya:text-lya-text/60 mt-0.5 truncate">
                Combos, descuentos por volumen y rebajas directas.
              </p>
            </div>
          </div>
          
          {/* Lado Derecho: Botones bien contenidos dentro del margen */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full lg:w-auto justify-end">
            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsPrintModalOpen(true)} 
              className="w-full sm:w-auto bg-orange-50 md:hover:bg-orange-100 dark:bg-orange-950/30 dark:md:hover:bg-orange-900/40 lya:bg-lya-primary/10 lya:md:hover:bg-lya-primary/20 text-orange-600 dark:text-orange-400 lya:text-lya-primary border border-orange-200/80 dark:border-orange-800/40 lya:border-lya-primary/30 px-4 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm outline-none whitespace-nowrap"
              title="Descargar PDF de cómo funcionan las promociones y reglas de cuentas"
            >
              <FileDown size={17} strokeWidth={2.5} className="shrink-0" />
              <span>Funciones y Reglas (PDF)</span>
            </motion.button>

            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={() => { setEditingPromo(null); setIsWizardOpen(true); }} 
              className="w-full sm:w-auto bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 dark:md:hover:bg-orange-500 lya:bg-lya-primary lya:md:hover:bg-lya-primary/90 text-white lya:text-lya-surface px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/30 dark:shadow-orange-900/40 lya:shadow-lya-primary/30 outline-none whitespace-nowrap"
            >
              <Plus size={18} strokeWidth={2.5} className="shrink-0" />
              <span>Nueva Promoción</span>
            </motion.button>

            <motion.button 
              type="button"
              whileTap={{ scale: 0.95 }} 
              onClick={onClose} 
              className="absolute top-5 right-5 lg:relative lg:top-auto lg:right-auto p-2.5 sm:p-3 bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-border/30 lya:md:hover:bg-lya-border/50 text-gray-600 dark:text-gray-400 lya:text-lya-text/60 rounded-xl transition-colors outline-none shrink-0"
            >
              <X size={20} />
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

      {/* ✨ MODAL LIMPIO DE DESCARGA DIRECTA EN PDF */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 lya:bg-lya-surface w-full max-w-4xl max-h-[92dvh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-800 lya:border-lya-border/40 flex flex-col overflow-hidden"
            >
              {/* Encabezado */}
              <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/30 lya:bg-lya-primary/15 text-orange-600 dark:text-orange-400 lya:text-lya-primary flex items-center justify-center shrink-0">
                    <FileDown size={24} strokeWidth={2.5} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white lya:text-lya-text tracking-tight truncate">
                      Funciones de Promociones y Reglas (PDF)
                    </h3>
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 truncate">
                      Documento PDF tamaño Carta listo para imprimir y colocar en mesas o mostrador
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

              {/* Barra Superior Simplificada: Solo Formato de Hoja Carta y Modo de Tinta */}
              <div className="p-4 sm:px-6 bg-gray-50 dark:bg-gray-800/50 lya:bg-lya-bg border-b border-gray-100 dark:border-gray-800 lya:border-lya-border/30 grid grid-cols-1 sm:grid-cols-2 gap-3 shrink-0">
                {/* 1. Formato de Hoja Carta */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1.5">
                    <Columns size={12} /> Formato de Hoja Carta (PDF)
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-gray-900 lya:bg-lya-surface p-1 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40">
                    <button
                      type="button"
                      onClick={() => setPrintLayout('poster')}
                      className={`py-2 px-3 rounded-lg text-xs font-black transition-all ${
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
                      className={`py-2 px-3 rounded-lg text-xs font-black transition-all ${
                        printLayout === 'tent'
                          ? 'bg-orange-500 lya:bg-lya-primary text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 lya:text-lya-text/70'
                      }`}
                    >
                      2x Hoja (Mesas)
                    </button>
                  </div>
                </div>

                {/* 2. Modo de Tinta */}
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 lya:text-lya-text/50 flex items-center gap-1.5">
                    <Palette size={12} /> Modo de Tinta
                  </span>
                  <div className="grid grid-cols-2 gap-1.5 bg-white dark:bg-gray-900 lya:bg-lya-surface p-1 rounded-xl border border-gray-200 dark:border-gray-700 lya:border-lya-border/40">
                    <button
                      type="button"
                      onClick={() => setPrintTheme('lya')}
                      className={`py-2 px-3 rounded-lg text-xs font-black transition-all ${
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
                      className={`py-2 px-3 rounded-lg text-xs font-black transition-all ${
                        printTheme === 'ink_saver'
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 lya:text-lya-text/70'
                      }`}
                    >
                      Ahorro Tinta
                    </button>
                  </div>
                </div>
              </div>

              {/* Vista Previa en Vivo */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 bg-gray-200/70 dark:bg-gray-950">
                <div className="mx-auto max-w-2xl">
                  <GuidePreviewCard />
                </div>
              </div>

              {/* Pie del Modal con Descarga Directa en PDF */}
              <div className="p-4 sm:p-5 bg-white dark:bg-gray-900 lya:bg-lya-surface border-t border-gray-100 dark:border-gray-800 lya:border-lya-border/30 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 lya:text-lya-text/60 text-center sm:text-left">
                  {printLayout === 'tent'
                    ? '✂️ Se descargará 1 PDF tamaño Carta Horizontal con 2 guías idénticas y línea central de recorte.'
                    : '📄 Se descargará 1 PDF tamaño Carta Vertical con el cartel completo.'}
                </p>
                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="px-5 py-3 rounded-xl bg-gray-100 md:hover:bg-gray-200 dark:bg-gray-800 dark:md:hover:bg-gray-700 lya:bg-lya-bg text-gray-700 dark:text-gray-200 lya:text-lya-text font-black text-xs sm:text-sm transition-colors outline-none"
                  >
                    Cerrar
                  </button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    disabled={isDownloadingPdf}
                    onClick={handleDownloadGuidePdf}
                    className="flex-1 sm:flex-initial px-6 py-3 rounded-xl bg-orange-500 md:hover:bg-orange-600 dark:bg-orange-600 lya:bg-lya-primary text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/30 outline-none disabled:opacity-60"
                  >
                    {isDownloadingPdf ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Generando PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown size={18} strokeWidth={2.5} />
                        <span>Descargar PDF</span>
                      </>
                    )}
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