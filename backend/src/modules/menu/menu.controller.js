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
      where: { isActive: true },
      include: [{ model: Variant, as: 'variants' }]
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el menú', error: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    // 🔥 BLINDAJE PARA CREAR: Extraemos requiereCocina y departamento
    const { 
      name, 
      description, 
      basePrice, 
      imageUrl, 
      controlarStock, 
      stockQuantity, 
      categoryId,
      opciones,
      departamento,
      requiereCocina 
    } = req.body;
    
    const newProduct = await Product.create({
      name,
      description,
      basePrice,
      imageUrl,
      controlarStock,
      stockQuantity,
      categoryId,
      opciones,
      departamento, 
      requiereCocina 
    });

    res.status(201).json({ message: 'Producto creado', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    
    // 🔥 BLINDAJE PARA EDITAR: Extraemos requiereCocina y departamento
    const { 
      name, 
      description, 
      basePrice, 
      imageUrl, 
      controlarStock, 
      stockQuantity, 
      categoryId, 
      opciones, 
      departamento, 
      requiereCocina 
    } = req.body;

    const product = await Product.findByPk(id);
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await product.update({
      name, 
      description, 
      basePrice, 
      imageUrl, 
      controlarStock, 
      stockQuantity, 
      categoryId, 
      opciones, 
      departamento, 
      requiereCocina
    });
    
    res.json({ message: 'Producto actualizado', product });
  } catch (error) {
    console.error('Error al actualizar el producto:', error);
    res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByPk(id);
    
    if (!product) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    await product.update({ isActive: false });

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