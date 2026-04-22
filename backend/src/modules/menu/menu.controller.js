// src/modules/menu/menu.controller.js
import Category from './Category.model.js';
import Product from './Product.model.js';
import Variant from './Variant.model.js';
import sequelize from '../../config/database.js';
import GlobalOption from './GlobalOption.model.js';

// ==========================================
// 📁 GESTIÓN DE CATEGORÍAS (Drag & Drop)
// ==========================================

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [['order', 'ASC']], // Crucial: Devolver siempre ordenado
      include: [{
        model: Product,
        as: 'products',
        attributes: ['id'] // Solo para saber si tiene productos asociados
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
    
    // Obtener el order más alto actual para poner la nueva al final
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

// Añadir en backend/src/modules/menu/menu.controller.js
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

// 🔥 ENDPOINT PARA REORDENAMIENTO (Drag & Drop)
export const reorderCategories = async (req, res) => {
  const { items } = req.body; // Formato: [{ id: 'uuid-1', order: 0 }, ...]

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

// GET: Todos pueden ver el menú (Owner y Employee)
export const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { isActive: true },
      include: [{ model: Variant, as: 'variants' }]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el menú', error: error.message });
  }
};

// POST: Solo Owner puede crear productos
export const createProduct = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      basePrice, 
      imageUrl, 
      controlarStock, 
      stockQuantity, 
      categoryId,
      opciones // 🔥 AQUÍ ESTÁ EL FIX: Le decimos al backend que reciba las opciones
    } = req.body;
    
    const newProduct = await Product.create({
      name,
      description,
      basePrice,
      imageUrl,
      controlarStock,
      stockQuantity,
      categoryId,
      opciones // 🔥 Y que las guarde en MySQL
    });

    res.status(201).json({ message: 'Producto creado', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

// PUT: Actualizar producto (Recomendado tenerlo para tu Modal de Edición)
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await product.update(updateData);
    res.json({ message: 'Producto actualizado', product });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

// DELETE: Eliminación lógica (Soft Delete) o física
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Eliminación lógica (recomendado para POS)
    await product.update({ isActive: false });
    // O si prefieres física: await product.destroy();

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
    const options = await GlobalOption.findAll();
    res.json(options);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener opciones', error: error.message });
  }
};

export const createGlobalOption = async (req, res) => {
  try {
    const newOption = await GlobalOption.create(req.body);
    res.status(201).json(newOption);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear opción', error: error.message });
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