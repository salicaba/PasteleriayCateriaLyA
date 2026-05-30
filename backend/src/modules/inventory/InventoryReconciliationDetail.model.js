import { DataTypes } from 'sequelize';
import sequelize from '../../config/database.js';

const InventoryReconciliationDetail = sequelize.define('InventoryReconciliationDetail', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  logicalStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Lo que el sistema dice que debería haber (Stock Teórico)',
  },
  physicalStock: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'Lo que el usuario contó físicamente',
  },
  difference: {
    type: DataTypes.DECIMAL(10, 3),
    allowNull: false,
    comment: 'physicalStock - logicalStock (Si es negativo, hubo consumo)',
  },
  averageCostAtTime: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'El costo promedio del insumo en el instante del arqueo',
  },
  totalDifferenceCost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Valor monetario de la diferencia (difference * averageCostAtTime)',
  }
}, {
  tableName: 'inventory_reconciliation_details',
  timestamps: true,
});

export default InventoryReconciliationDetail;