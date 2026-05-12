// backend/src/modules/settings/settings.controller.js
import BusinessConfig from './BusinessConfig.model.js';

export const getConfig = async (req, res) => {
  try {
    // Buscamos la configuración bajo la clave única 'bank_accounts'
    const config = await BusinessConfig.findByPk('bank_accounts');
    
    if (!config) {
      // Si no existe, devolvemos un arreglo vacío
      return res.json({ bank_accounts: [] });
    }

    // Intentamos parsear el valor que es un String JSON en la BD
    const accounts = config.value ? JSON.parse(config.value) : [];
    res.json({ bank_accounts: accounts });
  } catch (error) {
    console.error("Error al obtener ajustes:", error);
    res.status(500).json({ message: "Error al obtener configuración" });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { bank_accounts } = req.body;
    
    // Validamos que venga un arreglo
    if (!Array.isArray(bank_accounts)) {
      return res.status(400).json({ message: "Formato de cuentas inválido" });
    }

    // Guardamos toda la lista como un solo String JSON bajo la clave 'bank_accounts'
    // El método upsert crea el registro si no existe o lo actualiza si ya existe
    await BusinessConfig.upsert({ 
      key: 'bank_accounts', 
      value: JSON.stringify(bank_accounts) 
    });

    res.json({ message: "Configuración guardada exitosamente" });
  } catch (error) {
    console.error("Error al guardar ajustes:", error);
    res.status(500).json({ message: "Error al actualizar la configuración" });
  }
};