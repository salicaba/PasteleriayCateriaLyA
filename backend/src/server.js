import app from './app.js';
import sequelize from './config/database.js';
import { setupAssociations } from './config/associations.js'; 

import GlobalOption from './modules/menu/GlobalOption.model.js'; 
import './modules/settings/BusinessConfig.model.js';
import './modules/users/User.model.js'; 
import PasteleriaOrder from './modules/pasteleria/PasteleriaOrder.model.js'; 

// Importamos los modelos
import Transaction from './modules/cash/Transaction.model.js';
import OrderItem from './modules/pos/OrderItem.model.js';

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    // 1. Probar la conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');
    
    // 2. Ejecutar las relaciones ANTES de sincronizar
    setupAssociations(); 
    
    // 3. ALTERAMOS TABLAS ESPECÍFICAS (Solo las necesarias)
    console.log('⏳ Actualizando esquemas específicos...');
    await PasteleriaOrder.sync({ alter: true });
    await GlobalOption.sync({ alter: true });
    
    // 🔥 SOLUCIÓN DEFINITIVA PARA AÑADIR LA COLUMNA:
    // Evitamos "alter: true" en Transaction usando SQL puro para no chocar con el límite de 64 keys de MySQL
    try {
      await sequelize.query("ALTER TABLE Transactions ADD COLUMN paymentMethod ENUM('CASH', 'TRANSFER', 'CARD') DEFAULT 'CASH';");
      console.log('✅ Columna paymentMethod añadida con éxito a Transactions.');
    } catch (e) {
      // Si el error es porque la columna ya existe, lo ignoramos de forma segura
      if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
        console.log('⚡ La columna paymentMethod ya existía en Transactions (omitido).');
      } else {
        console.log('⚠️ Aviso SQL (puede que la columna ya exista):', e.message);
      }
    }
    
    // 4. Sincronizar el resto NORMALMENTE (Sin alter)
    await sequelize.sync();
    console.log('✅ Modelos sincronizados con la base de datos.');

  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
  }
}

// 5. Encender el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor de 𝓛𝔂𝓐 corriendo en http://localhost:${PORT}`);
  main(); 
});