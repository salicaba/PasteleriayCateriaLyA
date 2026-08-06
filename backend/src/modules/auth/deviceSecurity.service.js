/**
 * Servicio en memoria para prevención de fuerza bruta por DISPOSITIVO.
 */
const deviceStore = new Map();

export default class DeviceSecurityService {
  static getDeviceStatus(deviceId) {
    if (!deviceStore.has(deviceId)) {
      deviceStore.set(deviceId, {
        attempts: 0,
        multiplier: 1, 
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
        remainingMs: status.blockedUntil - Date.now()
      };
    }

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
      const blockDurationMs = 30 * 60 * 1000 * status.multiplier;
      status.blockedUntil = Date.now() + blockDurationMs;
      
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