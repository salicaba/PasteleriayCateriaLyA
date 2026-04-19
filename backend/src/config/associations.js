import Order from '../modules/pos/Order.model.js';
import OrderItem from '../modules/pos/OrderItem.model.js';
import Product from '../modules/menu/Product.model.js';
import Table from '../modules/pos/Table.model.js'; // <-- Importar el modelo de mesas

export const setupAssociations = () => {
  // Relación Orden -> Items (Una orden tiene muchos items)
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  // Relación Item -> Producto (Un item pertenece a un producto específico)
  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  // Relación Mesa -> Órdenes (Una mesa puede tener muchas órdenes a lo largo del tiempo)
  Table.hasMany(Order, { foreignKey: 'tableId', as: 'orders' });
  Order.belongsTo(Table, { foreignKey: 'tableId', as: 'table' });

  console.log('🔗 Asociaciones de Sequelize configuradas correctamente.');
};