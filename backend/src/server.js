import app from './app.js';
import sequelize from './config/database.js';
import { setupAssociations } from './config/associations.js'; 

// 🔥 FIX: Importamos el modelo GlobalOption asignándolo a una variable para poder usarlo abajo
import GlobalOption from './modules/menu/GlobalOption.model.js'; 

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
    
    // 3. ALTERAMOS TABLAS ESPECÍFICAS 🚀
    console.log('⏳ Actualizando esquemas específicos...');
    await PasteleriaOrder.sync({ alter: true });
    
    // 🔥 FIX: Forzamos la actualización de GlobalOption para que cree la nueva columna 'order'
    await GlobalOption.sync({ alter: true });
    console.log('✅ Tabla GlobalOptions actualizada correctamente.');
    
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