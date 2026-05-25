// backend/src/modules/settings/settings.controller.js
import BusinessConfig from './BusinessConfig.model.js';

export const getConfig = async (req, res) => {
  try {
    const configs = await BusinessConfig.findAll();
    
    // Objeto con valores predeterminados seguros
    const result = { 
      bank_accounts: [], 
      whatsapp_number: '', 
      printer_config: null, 
      barcode_config: null 
    };
    
    configs.forEach(config => {
      if (config.key === 'bank_accounts' || config.key === 'printer_config' || config.key === 'barcode_config') {
        try {
          result[config.key] = JSON.parse(config.value);
        } catch(e) {
          result[config.key] = config.key === 'bank_accounts' ? [] : {};
        }
      } else {
        // Configuraciones de texto plano, como whatsapp_number
        result[config.key] = config.value;
      }
    });
    
    res.json(result);
  } catch (error) {
    console.error("Error al obtener ajustes:", error);
    res.status(500).json({ message: "Error al obtener configuración" });
  }
};

export const updateConfig = async (req, res) => {
  try {
    const updates = req.body;
    
    for (const [key, value] of Object.entries(updates)) {
      let valueToSave = value;
      
      // Aseguramos que objetos y arreglos se guarden como string JSON
      if (key === 'bank_accounts' || key === 'printer_config' || key === 'barcode_config' || typeof value === 'object') {
        valueToSave = JSON.stringify(value);
      }
      
      await BusinessConfig.upsert({ 
        key, 
        value: String(valueToSave) 
      });
    }

    res.json({ message: "Configuración guardada exitosamente" });
  } catch (error) {
    console.error("Error al guardar ajustes:", error);
    res.status(500).json({ message: "Error al actualizar la configuración" });
  }
};