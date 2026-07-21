import Promotion from './Promotion.model.js';
import Product from './Product.model.js';
import { getIO } from '../../config/socket.js';

// Obtener todas las promociones configuradas
export const getAllPromotions = async (req, res) => {
  try {
    const promotions = await Promotion.findAll();
    return res.status(200).json({ success: true, data: promotions });
  } catch (error) {
    console.error('Error al obtener promociones:', error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor al cargar promociones.' });
  }
};

// Crear o actualizar (Upsert) una promoción para un producto
export const setupPromotion = async (req, res) => {
  try {
    const { productId } = req.params;
    const { type, buyQty, payQty, discountValue, validDays, isActive } = req.body;

    // Verificar que el producto exista
    const product = await Product.findByPk(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Buscar si ya existe una promo, si sí, se actualiza; si no, se crea
    let promotion = await Promotion.findOne({ where: { productId } });
    
    if (promotion) {
      promotion = await promotion.update({ type, buyQty, payQty, discountValue, validDays, isActive });
    } else {
      promotion = await Promotion.create({ productId, type, buyQty, payQty, discountValue, validDays, isActive });
    }

    // ¡MAGIA EN TIEMPO REAL! Emitimos a todas las pantallas que la promo cambió
    const io = getIO();
    io.emit('menu:promotions_updated', { productId, promotion });

    return res.status(200).json({ success: true, data: promotion, message: 'Promoción guardada exitosamente.' });
  } catch (error) {
    console.error('Error en setupPromotion:', error);
    return res.status(500).json({ success: false, message: 'Error interno al guardar la promoción.' });
  }
};

// Alternar el estado (Pausar/Reanudar) desde el Admin
export const togglePromotionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const promotion = await Promotion.findByPk(id);
    
    if (!promotion) {
      return res.status(404).json({ success: false, message: 'Promoción no encontrada.' });
    }

    promotion.isActive = !promotion.isActive;
    await promotion.save();

    // Notificar a las pantallas
    const io = getIO();
    io.emit('menu:promotions_updated', { productId: promotion.productId, promotion });

    return res.status(200).json({ 
      success: true, 
      data: promotion, 
      message: `Promoción ${promotion.isActive ? 'reanudada' : 'pausada'} correctamente.` 
    });
  } catch (error) {
    console.error('Error en togglePromotionStatus:', error);
    return res.status(500).json({ success: false, message: 'Error al cambiar estado de la promoción.' });
  }
};