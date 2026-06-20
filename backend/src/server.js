import http from 'http';
import app from './app.js';
import sequelize from './config/database.js';
import { setupAssociations } from './config/associations.js'; 
import { initSocket } from './config/socket.js'; 

import GlobalOption from './modules/menu/GlobalOption.model.js'; 
import './modules/settings/BusinessConfig.model.js';
import './modules/users/User.model.js'; 
import PasteleriaOrder from './modules/pasteleria/PasteleriaOrder.model.js'; 
import Transaction from './modules/cash/Transaction.model.js';
import OrderItem from './modules/pos/OrderItem.model.js';

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

initSocket(server);

// 🔥 CORRECCIÓN: Convertimos esto en la función principal de arranque
async function startServer() {
  try {
    // 1. Probar la conexión a Supabase
    await sequelize.authenticate();
    console.log('✅ Conexión a Supabase (PostgreSQL) establecida.');
    
    // 2. Ejecutar las relaciones ANTES de sincronizar
    setupAssociations(); 
    console.log('🔗 Asociaciones de Sequelize configuradas correctamente.');
    
    // 3. Sincronizar esquemas (Bloquea hasta que termine)
    console.log('⏳ Sincronizando esquemas con la nube...');
    await sequelize.sync({ alter: true });
    
    console.log('✅ Base de datos lista y actualizada en Supabase.');

    // 4. 🔥 AHORA SÍ: Abrimos las puertas para que el Frontend se conecte
    server.listen(PORT, () => {
      console.log(`🚀 Servidor HTTP y WebSockets corriendo en puerto ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Error crítico al arrancar el servidor:', error);
  }
}

// Iniciar el ciclo de arranque
startServer();