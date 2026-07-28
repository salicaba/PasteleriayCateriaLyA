// backend/src/modules/settings/settings.controller.js
import BusinessConfig from './BusinessConfig.model.js';
import { getIO } from '../../config/socket.js'; // 🔥 IMPORTACIÓN CRÍTICA AÑADIDA

export const getConfig = async (req, res) => {
  try {
    const configs = await BusinessConfig.findAll();
    
    // Objeto con valores predeterminados seguros
    const result = { 
      bank_accounts: [], 
      whatsapp_number: '', 
      printer_config: null, 
      barcode_config: null,
      disabled_qrs: [] // 🔥 Aseguramos que siempre nazca como Array
    };
    
    configs.forEach(config => {
      // 🔥 Añadimos disabled_qrs a la lista de parseo seguro
      if (['bank_accounts', 'printer_config', 'barcode_config', 'disabled_qrs'].includes(config.key)) {
        try {
          result[config.key] = JSON.parse(config.value);
        } catch(e) {
          result[config.key] = (config.key === 'bank_accounts' || config.key === 'disabled_qrs') ? [] : {};
        }
      } else {
        // Configuraciones de texto plano, como whatsapp_number y qr_service_active
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
      if (['bank_accounts', 'printer_config', 'barcode_config', 'disabled_qrs'].includes(key) || typeof value === 'object') {
        valueToSave = JSON.stringify(value);
      }
      
      await BusinessConfig.upsert({ 
        key, 
        value: String(valueToSave) 
      });
    }

    // 🚀 INYECCIÓN TIEMPO REAL CORREGIDA: Usamos el Singleton seguro
    const io = getIO();
    if (io) {
      io.emit('config:update', updates);
      io.emit('business_config_updated'); 
      io.emit('pos:update'); // 🔥 Disparo extra para refrescar mapas de mesas en todo el local
    }

    res.json({ message: "Configuración guardada exitosamente" });
  } catch (error) {
    console.error("Error al guardar ajustes:", error);
    res.status(500).json({ message: "Error al actualizar la configuración" });
  }
};

export const getQrStatus = async (req, res) => {
    try {
        const config = await BusinessConfig.findOne({ where: { key: 'qr_service_active' } });
        // Si no existe, por defecto está activo (true)
        res.json({ active: config ? config.value === 'true' : true });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener estado del QR" });
    }
};

export const setQrStatus = async (req, res) => {
    try {
        const { active } = req.body;
        const [config, created] = await BusinessConfig.findOrCreate({
            where: { key: 'qr_service_active' },
            defaults: { value: String(active) }
        });
        
        if (!created) {
            config.value = String(active);
            await config.save();
        }

        // 🚀 INYECCIÓN DE TIEMPO REAL CORREGIDA: Usamos el Singleton seguro
        const io = getIO();
        if (io) {
            // Disparamos la actualización global instantánea
            io.emit('config:update', { qr_service_active: String(active) });
            io.emit('qr:status_changed', active);
            io.emit('pos:update'); // 🔥 Refresca las interfaces instantáneamente
        }

        res.json({ active: config.value === 'true' });
    } catch (error) {
        console.error("Error al actualizar estado del QR:", error);
        res.status(500).json({ message: "Error al actualizar estado del QR" });
    }
};