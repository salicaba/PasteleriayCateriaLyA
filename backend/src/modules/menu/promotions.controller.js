import Promotion from './Promotion.model.js';
import Product from './Product.model.js';
import { getIO } from '../../config/socket.js';
import { Op } from 'sequelize';

// Helper ultra-robusto para detectar colisiones de días (Soporta Arrays nativos o JSON parseable)
const hasDayOverlap = (existingPromotions, newDays) => {
  const incomingDays = Array.isArray(newDays) ? newDays : JSON.parse(newDays || '[]');
  
  for (const promo of existingPromotions) {
    if (!promo.isActive) continue; 
    
    // Blindaje táctico: Aseguramos que los días guardados se lean como Array
    const savedDays = Array.isArray(promo.validDays) ? promo.validDays : JSON.parse(promo.validDays || '[]');
    
    const overlap = savedDays.some(day => incomingDays.includes(day));
    if (overlap) return true;
  }
  return false;
};

export const getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll();
    return res.status(200).json({ success: true, data: promotions });
  } catch (error) {
    console.error('🔥 Error al obtener promociones:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
};

export const setupPromotion = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type, buyQty, payQty, discountValue, validDays, isActive } = req.body;

    if (isActive) {
      const activePromos = await Promotion.findAll({ where: { productId, isActive: true } });
      if (hasDayOverlap(activePromos, validDays)) {
        return res.status(409).json({ success: false, message: "Ese día ya tiene una promoción activa. Apágala primero." });
      }
    }

    const newPromotion = await Promotion.create({ 
      productId, 
      validDays, 
      isActive, 
      type, 
      buyQty, 
      payQty, 
      discountValue 
    });

    // 🔥 FIX: Tu usePosCart.js exige "promotion: newPromotion" para actualizarse
    getIO().emit('menu:promotions_updated', { productId, promotion: newPromotion });
    
    return res.status(201).json({ success: true, data: newPromotion });
  } catch (error) {
    // 🔥 AHORA SÍ: El error real saldrá en tu terminal de Node
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

    if (nextStatus) {
      const otherActivePromos = await Promotion.findAll({
        where: { productId: promotion.productId, isActive: true, id: { [Op.ne]: id } }
      });
      if (hasDayOverlap(otherActivePromos, promotion.validDays)) {
        return res.status(409).json({ success: false, message: "No puedes encenderla. Ya existe una promoción activa en esos días." });
      }
    }

    promotion.isActive = nextStatus;
    await promotion.save();
    
    getIO().emit('menu:promotions_updated', { productId: promotion.productId, promotion });
    
    return res.status(200).json({ success: true, data: promotion, message: "Estado de promoción actualizado." });
  } catch (error) {
    console.error("🔥 Error al alternar promoción:", error);
    return res.status(500).json({ success: false, message: "Error interno", details: error.message });
  }
};

export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, buyQty, payQty, discountValue, validDays, isActive } = req.body;
    
    const promotion = await Promotion.findByPk(id);
    if (!promotion) return res.status(404).json({ success: false, message: "Promoción no encontrada" });

    if (isActive) {
      const otherActivePromos = await Promotion.findAll({
        where: { productId: promotion.productId, isActive: true, id: { [Op.ne]: id } }
      });
      if (hasDayOverlap(otherActivePromos, validDays)) {
        return res.status(409).json({ success: false, message: "Ese día ya tiene otra promoción activa." });
      }
    }

    await promotion.update({ type, buyQty, payQty, discountValue, validDays, isActive });
    
    getIO().emit('menu:promotions_updated', { productId: promotion.productId, promotion });
    
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
    return res.status(200).json({ success: true, message: "Promoción eliminada definitivamente." });
  } catch (error) {
    console.error("🔥 Error al eliminar promoción:", error);
    return res.status(500).json({ success: false, message: "Error interno al eliminar." });
  }
};