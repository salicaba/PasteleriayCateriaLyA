// backend/src/modules/settings/settings.controller.js
import BusinessConfig from './BusinessConfig.model.js';
import { getIO } from '../../config/socket.js';

export const getConfig = async (req, res) => {
  try {
    const configs = await BusinessConfig.findAll();
    
    // 🔥 Objeto con valores predeterminados seguros blindado
    const result = { 
      bank_accounts: [], 
      whatsapp_number: '', 
      // Agregamos 'enabled' al config base para la impresora
      printer_config: { enabled: false, type: 'usb', interface: '' }, 
      barcode_config: { autoAdd: true },
      disabled_qrs: [],
      pasteleria_config: { categorias: [], tamanos: [], sabores: [] } 
    };
    
    configs.forEach(config => {
      if (['bank_accounts', 'printer_config', 'barcode_config', 'disabled_qrs', 'pasteleria_config'].includes(config.key)) {
        try {
          result[config.key] = JSON.parse(config.value);
        } catch(e) {
          result[config.key] = (config.key === 'bank_accounts' || config.key === 'disabled_qrs') ? [] : {};
        }
      } else {
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
      
      if (['bank_accounts', 'printer_config', 'barcode_config', 'disabled_qrs', 'pasteleria_config'].includes(key) || typeof value === 'object') {
        valueToSave = JSON.stringify(value);
      }
      
      await BusinessConfig.upsert({ 
        key, 
        value: String(valueToSave) 
      });
    }

    const io = getIO();
    if (io) {
      io.emit('config:update', updates);
      io.emit('business_config_updated'); 
      io.emit('pos:update'); 
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

        const io = getIO();
        if (io) {
            io.emit('config:update', { qr_service_active: String(active) });
            io.emit('qr:status_changed', active);
            io.emit('pos:update'); 
        }

        res.json({ active: config.value === 'true' });
    } catch (error) {
        console.error("Error al actualizar estado del QR:", error);
        res.status(500).json({ message: "Error al actualizar estado del QR" });
    }
};