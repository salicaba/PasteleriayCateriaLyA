// src/config/associations.js
import Order from '../modules/pos/Order.model.js';
import OrderItem from '../modules/pos/OrderItem.model.js';
import Product from '../modules/menu/Product.model.js';
import Table from '../modules/pos/Table.model.js';
import Category from '../modules/menu/Category.model.js';
import Variant from '../modules/menu/Variant.model.js'; 
import PasteleriaOrder from '../modules/pasteleria/PasteleriaOrder.model.js';
import Transaction from '../modules/cash/Transaction.model.js';
import User from '../modules/users/User.model.js';

// 🔥 NUEVOS IMPORTS: Módulo de Inventario
import InventoryItem from '../modules/inventory/InventoryItem.model.js';
import InventoryTransaction from '../modules/inventory/InventoryTransaction.model.js';
import RecipeItem from '../modules/inventory/RecipeItem.model.js';

export const setupAssociations = () => {
  // ==========================================
  // RELACIONES ACTUALES (POS, MENÚ Y CAJA)
  // ==========================================

  // Relación Orden -> Items
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  // Relación Mesa -> Órdenes
  Table.hasMany(Order, { foreignKey: 'tableId', as: 'orders' });
  Order.belongsTo(Table, { foreignKey: 'tableId', as: 'table' });

  // Relación Categoría -> Producto
  Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
  Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

  // Relación Item -> Producto
  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // Relación Variantes -> Producto
  Product.hasMany(Variant, { foreignKey: 'productId', as: 'variants' });
  Variant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // Relaciones de Caja
  Transaction.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Transaction.belongsTo(User, { foreignKey: 'cancelledBy', as: 'canceller' });


  // ==========================================
  // NUEVAS RELACIONES: CONTROL DE INVENTARIO
  // ==========================================

  // 1. Catálogo de Insumos -> Transacciones (El Kardex)
  // Un insumo tiene muchos movimientos (entradas, salidas, mermas)
  InventoryItem.hasMany(InventoryTransaction, { foreignKey: 'inventoryItemId', as: 'transactions' });
  InventoryTransaction.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId', as: 'item' });

  // 2. Auditoría de Transacciones -> Usuarios
  // Saber qué empleado registró la compra, ajuste o merma en el inventario
  User.hasMany(InventoryTransaction, { foreignKey: 'userId', as: 'inventoryMovements' });
  InventoryTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // 3. Recetas (El puente entre lo que se vende y lo que se gasta)
  // Un producto final (ej. Frappé) tiene una receta conformada por varios insumos
  Product.hasMany(RecipeItem, { foreignKey: 'productId', as: 'recipe' });
  RecipeItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // Un insumo (ej. Leche) puede ser parte de muchas recetas
  InventoryItem.hasMany(RecipeItem, { foreignKey: 'inventoryItemId', as: 'usedIn' });
  RecipeItem.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId', as: 'inventoryItem' });

  console.log('🔗 Asociaciones de Sequelize configuradas correctamente.');
};