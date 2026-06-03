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

async function main() {
  try {
    // 1. Probar la conexión a Supabase
    await sequelize.authenticate();
    console.log('✅ Conexión a Supabase (PostgreSQL) establecida.');
    
    // 2. Ejecutar las relaciones ANTES de sincronizar
    setupAssociations(); 
    
    // 3. Sincronizar esquemas (Postgres maneja los 'alter' perfectamente)
    console.log('⏳ Sincronizando esquemas con la nube...');
    await sequelize.sync({ alter: true });
    
    console.log('✅ Base de datos lista y actualizada en Supabase.');

  } catch (error) {
    console.error('❌ No se pudo conectar a Supabase:', error);
  }
}

server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP y WebSockets corriendo en puerto ${PORT}`);
  main(); 
});