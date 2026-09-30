import Promotion from './Promotion.model.js';
import Product from './Product.model.js';
import { getIO } from '../../config/socket.js';
import { Op } from 'sequelize';

// =========================================================================
// 🌐 UTILIDAD: FECHA LOCAL ESTRICTA (CHIAPAS / CDMX)
// =========================================================================
const getLocalNow = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
};

// Helper ultra-robusto para detectar colisiones de días 
const hasDayOverlap = (existingPromotions, newDays) => {
  const incomingDays = Array.isArray(newDays) ? newDays : JSON.parse(newDays || '[]');
  
  for (const promo of existingPromotions) {
    if (!promo.isActive) continue; 
    
    const savedDays = Array.isArray(promo.validDays) ? promo.validDays : JSON.parse(promo.validDays || '[]');
    
    const overlap = savedDays.some(day => incomingDays.includes(day));
    if (overlap) return true;
  }
  return false;
};

export const getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll({
      // Opcional: Incluir info básica de los productos para la UI del Gestor
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl'] }]
    });
    return res.status(200).json({ success: true, data: promotions });
  } catch (error) {
    console.error('🔥 Error al obtener promociones:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

export const setupPromotion = async (req, res) => {
  try {
    // Si viene de la ruta vieja por params, lo tomamos de ahí. Si viene del nuevo Gestor General, del body.
    const productId = req.params.productId || req.body.productId || null;
    
    const { 
      type, buyQty, payQty, discountValue, validDays, isActive, 
      applyToProducts, rewardProducts, minTicketAmount, name 
    } = req.body;

    // Solo validamos colisiones de producto individual si trae un productId definido
    if (isActive && productId) {
      const activePromos = await Promotion.findAll({ where: { productId, isActive: true } });
      if (hasDayOverlap(activePromos, validDays)) {
        return res.status(409).json({ success: false, message: "Ese día ya tiene una promoción activa para este producto. Apágala primero." });
      }
    }

    const dbNow = new Date();

    const newPromotion = await Promotion.create({ 
      productId, 
      name,
      applyToProducts,
      rewardProducts,
      minTicketAmount,
      validDays, 
      isActive, 
      type, 
      buyQty, 
      payQty, 
      discountValue,
      createdAt: dbNow, 
      updatedAt: dbNow  
    });

    getIO().emit('menu:promotions_updated', { productId, promotion: newPromotion });
    getIO().emit('pos:update'); 

    return res.status(201).json({ success: true, data: newPromotion });
  } catch (error) {
    console.error("🔥 Error CRÍTICO al guardar promoción:", error);
    return res.status(500).json({ success: false, message: "Error interno", details: error.message });
  }
};

export const togglePromotionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByPk(id);
    if (!promotion) return res.status(404).json({ success: false, message: "Promoción no encontrada" });

    const nextStatus = !promotion.isActive;

    // Solo validamos colisión si pertenece a un producto en específico
    if (nextStatus && promotion.productId) {
      const otherActivePromos = await Promotion.findAll({
        where: { productId: promotion.productId, isActive: true, id: { [Op.ne]: id } }
      });
      if (hasDayOverlap(otherActivePromos, promotion.validDays)) {
        return res.status(409).json({ success: false, message: "No puedes encenderla. Ya existe una promoción activa en esos días para este producto." });
      }
    }

    promotion.isActive = nextStatus;
    promotion.updatedAt = new Date(); 
    await promotion.save();
    
    getIO().emit('menu:promotions_updated', { productId: promotion.productId, promotion });
    getIO().emit('pos:update'); 
    
    return res.status(200).json({ success: true, data: promotion, message: "Estado de promoción actualizado." });
  } catch (error) {
    console.error("🔥 Error al alternar promoción:", error);
    return res.status(500).json({ success: false, message: "Error interno", details: error.message });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, buyQty, payQty, discountValue, validDays, isActive, 
      applyToProducts, rewardProducts, minTicketAmount, name, productId
    } = req.body;
    
    const promotion = await Promotion.findByPk(id);
    if (!promotion) return res.status(404).json({ success: false, message: "Promoción no encontrada" });

    // Determinar el producto final (puede estar cambiando de producto individual a global)
    const finalProductId = productId !== undefined ? productId : promotion.productId;

    if (isActive && finalProductId) {
      const otherActivePromos = await Promotion.findAll({
        where: { productId: finalProductId, isActive: true, id: { [Op.ne]: id } }
      });
      if (hasDayOverlap(otherActivePromos, validDays)) {
        return res.status(409).json({ success: false, message: "Ese día ya tiene otra promoción activa para este producto." });
      }
    }

    await promotion.update({ 
        productId: finalProductId,
        name,
        applyToProducts,
        rewardProducts,
        minTicketAmount,
        type, 
        buyQty, 
        payQty, 
        discountValue, 
        validDays, 
        isActive, 
        updatedAt: new Date() 
    });
    
    getIO().emit('menu:promotions_updated', { productId: finalProductId, promotion });
    getIO().emit('pos:update'); 
    
    return res.status(200).json({ success: true, data: promotion, message: "Promoción editada correctamente." });
  } catch (error) {
    console.error("🔥 Error al editar promoción:", error);
    return res.status(500).json({ success: false, message: "Error interno." });
  }
};

export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByPk(id);
    if (!promotion) return res.status(404).json({ success: false, message: "Promoción no encontrada" });

    const productId = promotion.productId;
    await promotion.destroy();
    
    getIO().emit('menu:promotions_updated', { productId });
    getIO().emit('pos:update'); 

    return res.status(200).json({ success: true, message: "Promoción eliminada definitivamente." });
  } catch (error) {
    console.error("🔥 Error al eliminar promoción:", error);
    return res.status(500).json({ success: false, message: "Error interno al eliminar." });
  }
};