// src/config/associations.js
import Order from '../modules/pos/Order.model.js';
import OrderItem from '../modules/pos/OrderItem.model.js';
import Product from '../modules/menu/Product.model.js';
import Table from '../modules/pos/Table.model.js';
import Category from '../modules/menu/Category.model.js';
import Variant from '../modules/menu/Variant.model.js'; // <-- 1. Importamos Variant

export const setupAssociations = () => {
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

  // 🔥 NUEVA: Relación Producto -> Variante (1 a Muchos)
  Product.hasMany(Variant, { foreignKey: 'productId', as: 'variants' });
  Variant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  console.log('🔗 Asociaciones de Sequelize configuradas correctamente.');
};