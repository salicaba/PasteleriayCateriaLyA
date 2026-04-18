import Product from './Product.model.js';
import Variant from './Variant.model.js';

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
      categoryId 
    } = req.body;
    
    const newProduct = await Product.create({
      name,
      description,
      basePrice,
      imageUrl,
      controlarStock,
      stockQuantity,
      categoryId
    });

    res.status(201).json({ message: 'Producto creado', product: newProduct });
  } catch (error) {
    res.status(500).json({ message: 'Error al crear producto', error: error.message });
  }
};