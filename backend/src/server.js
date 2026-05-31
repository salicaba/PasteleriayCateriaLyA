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
    
    // 4. Sincronizar el resto NORMALMENTE (Sin alter)
    // Al quitar los alter:true de Transaction y OrderItem evitamos el error de los 64 índices
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