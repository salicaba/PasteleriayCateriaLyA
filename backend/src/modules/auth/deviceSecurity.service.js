/**
 * Servicio en memoria para prevención de fuerza bruta por dispositivo.
 * Reglas: 5 intentos -> 30 min bloqueo -> +5 intentos -> 60 min -> 120 min, etc.
 */
const deviceStore = new Map();

export default class DeviceSecurityService {
  static getDeviceStatus(deviceId) {
    if (!deviceStore.has(deviceId)) {
      deviceStore.set(deviceId, {
        attempts: 0,
        multiplier: 1, // 1 = 30min, 2 = 60min, 4 = 120min
        blockedUntil: null
      });
    }
    return deviceStore.get(deviceId);
  }

  static checkBlock(deviceId) {
    const status = this.getDeviceStatus(deviceId);
    
    if (status.blockedUntil && status.blockedUntil > Date.now()) {
      return {
        isBlocked: true,
        blockedUntil: status.blockedUntil,
        remainingTimeMs: status.blockedUntil - Date.now()
      };
    }

    // Si el tiempo de bloqueo ya expiró, limpiamos el bloqueo pero MANTENEMOS el multiplicador
    if (status.blockedUntil && status.blockedUntil <= Date.now()) {
      status.blockedUntil = null;
      deviceStore.set(deviceId, status);
    }

    return { isBlocked: false };
  }

  static registerFailure(deviceId) {
    const status = this.getDeviceStatus(deviceId);
    status.attempts += 1;

    if (status.attempts >= 5) {
      // Aplicar bloqueo exponencial: 30 minutos * multiplicador
      const blockDurationMs = 30 * 60 * 1000 * status.multiplier;
      status.blockedUntil = Date.now() + blockDurationMs;
      
      // Preparar el estado para el siguiente ciclo si vuelven a fallar
      status.attempts = 0; 
      status.multiplier *= 2; 
    }

    deviceStore.set(deviceId, status);
    return status;
  }

  static resetDevice(deviceId) {
    deviceStore.delete(deviceId);
  }
}