// backend/src/modules/menu/menu.controller.js
import Category from './Category.model.js';
import Product from './Product.model.js';
import Variant from './Variant.model.js';
import sequelize from '../../config/database.js';
import GlobalOption from './GlobalOption.model.js';
import { getIO } from '../../config/socket.js'; // 🔥 IMPORTAMOS LOS WEBSOCKETS

// 🔥 1. IMPORTAMOS SUPABASE PARA EL STORAGE
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ==========================================
// 🛠️ HELPER: INTERCEPTOR DE IMAGEN INDIVIDUAL A BUCKET
// ==========================================
const uploadSingleImageToStorage = async (imgStr, productId) => {
  // Validaciones de seguridad para evitar cuelgues si no hay imagen
  if (!imgStr || typeof imgStr !== 'string') return imgStr;

  // Si la imagen ya es un link de Supabase (modo edición sin cambios), la conservamos
  if (imgStr.startsWith('http')) return imgStr;

  // Si es Base64 crudo del Frontend, lo transformamos y lo subimos a la nube
  if (imgStr.startsWith('data:image')) {
    try {
      const partes = imgStr.split(',');
      if (partes.length !== 2) return imgStr;

      const mimeType = partes[0].split(';')[0].split(':')[1] || 'image/jpeg';
      const base64Data = partes[1];
      
      const buffer = Buffer.from(base64Data, 'base64');
      const extension = mimeType.split('/')[1] || 'jpg';
      const fileName = `PROD-${productId}_${Date.now()}.${extension}`;

      // Subimos al bucket físico "productos"
      const { error } = await supabase.storage
        .from('productos')
        .upload(fileName, buffer, {
          contentType: mimeType,
          upsert: true
        });

      if (error) {
        console.error(`Error subiendo imagen del producto al Bucket:`, error.message);
        return imgStr; // Si falla, que al menos guarde el base64 como respaldo
      }

      // Recuperamos la URL pública
      const { data: publicUrlData } = supabase.storage
        .from('productos')
        .getPublicUrl(fileName);

      if (publicUrlData && publicUrlData.publicUrl) {
        return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.error("Error decodificando imagen Base64 del menú:", err);
    }
  }

  return imgStr;
};

// ==========================================
// 📁 GESTIÓN DE CATEGORÍAS (Drag & Drop)
// ==========================================

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['order', 'ASC']], 
      include: [{
        model: Product,
        as: 'products',
        attributes: ['id'] 
      }]
    });
    res.json(categories);
  } catch (error) {
    console.error('Error al obtener categorías:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    
    const maxOrder = await Category.max('order') || 0;
    
    const newCategory = await Category.create({ 
      name, 
      order: maxOrder + 1 
    });
    
    res.status(201).json(newCategory);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    res.status(500).json({ message: 'Error al crear la categoría', error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    
    const category = await Category.findByPk(id);
    if (!category) return res.status(404).json({ message: 'Categoría no encontrada' });

    await category.update({ name });
    res.json({ message: 'Categoría actualizada', category });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar', error: error.message });
  }
};

export const reorderCategories = async (req, res) => {
  const { items } = req.body; 

  const transaction = await sequelize.transaction();

  try {
    const updatePromises = items.map(item => 
      Category.update(
        { order: item.order },
        { where: { id: item.id }, transaction }
      )
    );

    await Promise.all(updatePromises);
    await transaction.commit();

    res.json({ message: 'Orden de categorías actualizado correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error en el reordenamiento:', error);
    res.status(500).json({ message: 'Error crítico al guardar el nuevo orden', error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const productsCount = await Product.count({ where: { categoryId: id } });
    if (productsCount > 0) {
      return res.status(400).json({ 
        message: 'No puedes eliminar una categoría que contiene productos. Mueve los productos primero.' 
      });
    }

    await Category.destroy({ where: { id } });
    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    res.status(500).json({ message: 'Error al eliminar la categoría', error: error.message });
  }
};

// ==========================================
// 🍔 GESTIÓN DE PRODUCTOS
// ==========================================

export const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Variant, as: 'variants' }]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el menú', error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { 
      name, description, basePrice, imageUrl, controlarStock, stockQuantity, 
      categoryId, opciones, departamento, requiereCocina, isActive, 
      isAgotado 
    } = req.body;
    
    // 🔥 MAGIA: Interceptamos la imagen del producto
    const finalImageUrl = await uploadSingleImageToStorage(imageUrl, `NEW_${Date.now()}`);

    const newProduct = await Product.create({
      name, description, basePrice, imageUrl: finalImageUrl, controlarStock, stockQuantity, categoryId, opciones, departamento, requiereCocina,
      isActive: isActive !== undefined ? isActive : true,
      isAgotado: isAgotado || false
    });

    // 🔥 EMITIR EN TIEMPO REAL: Por si se crea como agotado o con poco stock
    getIO().emit('stock:update', [{
      id: newProduct.id,
      stock: newProduct.stockQuantity,
      isAgotado: newProduct.isAgotado
    }]);
    getIO().emit('pos:update'); // Refrescar catálogos

    res.status(201).json({ message: 'Producto creado', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, description, basePrice, imageUrl, controlarStock, stockQuantity, 
      categoryId, opciones, departamento, requiereCocina, isActive, disponible,
      isAgotado 
    } = req.body;

    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    // 🔥 MAGIA: Si suben una nueva imagen en la edición, la intercepta
    const finalImageUrl = await uploadSingleImageToStorage(imageUrl, id);

    const estadoFinal = isActive !== undefined ? isActive : (disponible !== undefined ? disponible : product.isActive);
    const agotadoFinal = isAgotado !== undefined ? isAgotado : product.isAgotado;

    await product.update({
      name, description, basePrice, imageUrl: finalImageUrl, controlarStock, stockQuantity, categoryId, opciones, departamento, requiereCocina,
      isActive: estadoFinal,
      isAgotado: agotadoFinal 
    });
    
    // 🔥 MAGIA DE TIEMPO REAL: Le avisamos a todos los clientes y empleados del nuevo stock
    getIO().emit('stock:update', [{
      id: product.id,
      stock: product.stockQuantity,
      isAgotado: product.isAgotado
    }]);
    getIO().emit('pos:update'); // Forzar refresco de tarjetas en todo el local

    res.json({ message: 'Producto actualizado', product });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

    await product.update({ isActive: false });
    
    // 🔥 EMITIR EN TIEMPO REAL: Forzamos stock 0 y Agotado para que los carritos lo expulsen
    getIO().emit('stock:update', [{
      id: product.id,
      stock: 0,
      isAgotado: true
    }]);
    getIO().emit('pos:update');

    res.json({ message: 'Producto eliminado (desactivado)' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
  }
};

// ==========================================
// ⚙️ GESTIÓN DE OPCIONES GLOBALES
// ==========================================
export const getGlobalOptions = async (req, res) => {
  try {
    const options = await GlobalOption.findAll({
      order: [['order', 'ASC']]
    });
    res.json(options);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener opciones', error: error.message });
  }
};

export const createGlobalOption = async (req, res) => {
  try {
    const { tipo } = req.body;
    const maxOrder = await GlobalOption.max('order', { where: { tipo } }) || 0;
    
    const newOption = await GlobalOption.create({
      ...req.body,
      order: maxOrder + 1
    });
    res.status(201).json(newOption);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear opción', error: error.message });
  }
};

export const reorderGlobalOptions = async (req, res) => {
  const { items } = req.body;
  const transaction = await sequelize.transaction();

  try {
    const updatePromises = items.map(item => 
      GlobalOption.update(
        { order: item.order },
        { where: { id: item.id }, transaction }
      )
    );

    await Promise.all(updatePromises);
    await transaction.commit();

    res.json({ message: 'Orden de opciones actualizado correctamente' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error en el reordenamiento de opciones:', error);
    res.status(500).json({ message: 'Error al guardar el nuevo orden', error: error.message });
  }
};

export const deleteGlobalOption = async (req, res) => {
  try {
    await GlobalOption.destroy({ where: { id: req.params.id } });
    res.json({ message: 'Opción eliminada' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar', error: error.message });
  }
};