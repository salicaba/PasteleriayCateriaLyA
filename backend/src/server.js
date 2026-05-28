import app from './app.js';
import sequelize from './config/database.js';
import { setupAssociations } from './config/associations.js'; 

// Importamos el modelo GlobalOption asignándolo a una variable para poder usarlo abajo
import GlobalOption from './modules/menu/GlobalOption.model.js'; 

import './modules/settings/BusinessConfig.model.js';
import './modules/users/User.model.js'; 

// 1. IMPORTAMOS EL MODELO ESPECÍFICO DE PASTELERÍA
import PasteleriaOrder from './modules/pasteleria/PasteleriaOrder.model.js'; 

// 🔥 NUEVO: Importamos los modelos que modificamos hoy
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
    
    // 3. ALTERAMOS TABLAS ESPECÍFICAS 🚀
    console.log('⏳ Actualizando esquemas específicos...');
    await PasteleriaOrder.sync({ alter: true });
    
    // Forzamos la actualización de GlobalOption
    await GlobalOption.sync({ alter: true });
    console.log('✅ Tabla GlobalOptions actualizada correctamente.');

    // 🔥 NUEVO: Forzamos la actualización de las tablas para agregar folio e isTakeaway
    await Transaction.sync({ alter: true });
    console.log('✅ Tabla Transactions actualizada correctamente (Nueva columna: folio).');
    
    await OrderItem.sync({ alter: true });
    console.log('✅ Tabla OrderItems actualizada correctamente (Nueva columna: isTakeaway).');
    
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