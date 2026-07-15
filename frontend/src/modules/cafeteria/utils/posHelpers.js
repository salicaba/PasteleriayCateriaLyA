// src/modules/cafeteria/utils/posHelpers.js

export const getProductModifiers = (product) => {
  if (!product) return [];
  let ops = product.opciones;
  if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { } }
  if (typeof ops === 'string') { try { ops = JSON.parse(ops); } catch (e) { } }
  
  if (ops && typeof ops === 'object') {
      const mods = [];
      const mapOption = (opt) => {
          if (typeof opt === 'string') return { id: opt, label: opt, price: 0 };
          return { id: opt.nombre || 'Opción', label: opt.nombre || 'Opción', price: Number(opt.precioAdicional || 0) };
      };

      const tamanos = Array.isArray(ops.tamanos) ? ops.tamanos : [];
      const leches = Array.isArray(ops.leches) ? ops.leches : [];
      const extras = Array.isArray(ops.extras) ? ops.extras : [];

      if (tamanos.length > 0) mods.push({ id: 'tamano', title: 'Tamaño', type: 'single', options: tamanos.map(mapOption) });
      if (leches.length > 0) mods.push({ id: 'leche', title: 'Tipo de Leche', type: 'single', options: leches.map(mapOption) });
      if (extras.length > 0) mods.push({ id: 'extras', title: 'Extras Adicionales', type: 'multiple', options: extras.map(mapOption) });

      return mods;
  }
  return [];
};

export const getDefaultCustomizations = (product) => {
  const modifiers = getProductModifiers(product);
  if (modifiers.length === 0) return null;

  let total = Number(product.precioBase || product.precio || 0);
  let tamanoStr = 'Estándar';
  let lecheStr = null;
  let extrasArr = [];

  modifiers.forEach(mod => {
      if (mod.type === 'single' && mod.options.length > 0) {
          const opt = mod.options[0];
          total += opt.price;
          
          const idLower = String(mod.id).toLowerCase();
          const titleLower = String(mod.title).toLowerCase();
          
          if (idLower.includes('leche') || titleLower.includes('leche')) {
              lecheStr = opt.label;
          } else if (idLower.includes('taman') || idLower.includes('tamañ') || titleLower.includes('tamañ')) {
              tamanoStr = opt.label;
          } else {
              extrasArr.push(opt.label);
          }
      }
  });

  return {
      precioFinal: total,
      detalles: { tamano: tamanoStr, ...(lecheStr && { leche: lecheStr }), ...(extrasArr.length > 0 && { extras: extrasArr }) },
  };
};