// src/config/associations.js
import User from '../modules/users/User.model.js';
import Product from '../modules/menu/Product.model.js';
import Variant from '../modules/menu/Variant.model.js';
import Order from '../modules/pos/Order.model.js';
import OrderItem from '../modules/pos/OrderItem.model.js';

export const setupAssociations = () => {
  // Producto <-> Variante
  Product.hasMany(Variant, { foreignKey: 'productId', as: 'variants' });
  Variant.belongsTo(Product, { foreignKey: 'productId' });

  // Orden <-> OrderItem
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

  // OrderItem <-> Producto/Variante
  OrderItem.belongsTo(Product, { foreignKey: 'productId' });
  OrderItem.belongsTo(Variant, { foreignKey: 'variantId' });

  // Orden <-> Usuario (Creador)
  Order.belongsTo(User, { foreignKey: 'createdBy', as: 'employee' });
};