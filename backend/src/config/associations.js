import Order from '../modules/pos/Order.model.js';
import OrderItem from '../modules/pos/OrderItem.model.js';
import Product from '../modules/menu/Product.model.js';
import Table from '../modules/pos/Table.model.js';
import Category from '../modules/menu/Category.model.js';
import Variant from '../modules/menu/Variant.model.js'; 
import PasteleriaOrder from '../modules/pasteleria/PasteleriaOrder.model.js';
import Transaction from '../modules/cash/Transaction.model.js';
import User from '../modules/users/User.model.js';

// Módulo de Inventario
import InventoryItem from '../modules/inventory/InventoryItem.model.js';
import InventoryTransaction from '../modules/inventory/InventoryTransaction.model.js';
import InventoryReconciliation from '../modules/inventory/InventoryReconciliation.model.js';
import InventoryReconciliationDetail from '../modules/inventory/InventoryReconciliationDetail.model.js';

export const setupAssociations = () => {
  // ==========================================
  // RELACIONES ACTUALES (POS, MENÚ Y CAJA)
  // ==========================================
  Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items' });
  OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

  Table.hasMany(Order, { foreignKey: 'tableId', as: 'orders' });
  Order.belongsTo(Table, { foreignKey: 'tableId', as: 'table' });

  Category.hasMany(Product, { foreignKey: 'categoryId', as: 'products' });
  Product.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

  Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems' });
  OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  Product.hasMany(Variant, { foreignKey: 'productId', as: 'variants' });
  Variant.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

  Transaction.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
  Transaction.belongsTo(User, { foreignKey: 'cancelledBy', as: 'canceller' });

  // ==========================================
  // RELACIONES: CONTROL DE INVENTARIO
  // ==========================================
  InventoryItem.hasMany(InventoryTransaction, { foreignKey: 'inventoryItemId', as: 'transactions' });
  InventoryTransaction.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId', as: 'item' });

  User.hasMany(InventoryTransaction, { foreignKey: 'userId', as: 'inventoryMovements' });
  InventoryTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // ==========================================
  // RELACIONES: ARQUEO DE INVENTARIO (NUEVO)
  // ==========================================
  
  // Usuario que realiza el arqueo
  User.hasMany(InventoryReconciliation, { foreignKey: 'userId', as: 'reconciliations' });
  InventoryReconciliation.belongsTo(User, { foreignKey: 'userId', as: 'user' });

  // Relación Cabecera -> Detalle
  InventoryReconciliation.hasMany(InventoryReconciliationDetail, { foreignKey: 'reconciliationId', as: 'details' });
  InventoryReconciliationDetail.belongsTo(InventoryReconciliation, { foreignKey: 'reconciliationId', as: 'reconciliation' });

  // Relación Detalle -> Insumo (Para saber qué se contó)
  InventoryItem.hasMany(InventoryReconciliationDetail, { foreignKey: 'inventoryItemId', as: 'reconciliationDetails' });
  InventoryReconciliationDetail.belongsTo(InventoryItem, { foreignKey: 'inventoryItemId', as: 'inventoryItem' });

  console.log('🔗 Asociaciones de Sequelize configuradas correctamente.');
};