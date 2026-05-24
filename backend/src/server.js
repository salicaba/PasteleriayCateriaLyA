import app from './app.js';
import sequelize from './config/database.js';
import { setupAssociations } from './config/associations.js'; 
import './modules/menu/GlobalOption.model.js'; 
import './modules/settings/BusinessConfig.model.js';
import './modules/users/User.model.js'; 

// 1. IMPORTAMOS EL MODELO ESPECÍFICO DE PASTELERÍA
import PasteleriaOrder from './modules/pasteleria/PasteleriaOrder.model.js'; 

const PORT = process.env.PORT || 4000;

async function main() {
  try {
    // 1. Probar la conexión
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida.');
    
    // 2. Ejecutar las relaciones ANTES de sincronizar
    setupAssociations(); 
    
    // 3. ALTERAMOS SÓLO LA TABLA DE PASTELERÍA (para que agregue 'categoria') 🚀
    console.log('⏳ Actualizando esquema de PasteleriaOrders...');
    await PasteleriaOrder.sync({ alter: true });
    
    // 4. Sincronizar el resto NORMALMENTE (Sin alter, para evitar el error de los 64 keys en Categories)
    await sequelize.sync();
    console.log('✅ Modelos sincronizados con la base de datos.');

    // 5. Encender el servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor de 𝓛𝔂𝓐 corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ No se pudo conectar a la base de datos:', error);
  }
}

// ¡Esta es la línea que enciende todo!
main();