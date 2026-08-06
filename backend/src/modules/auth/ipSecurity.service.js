/**
 * Servicio en memoria para prevención de fuerza bruta por IP.
 */
const ipStore = new Map();

export default class IpSecurityService {
  static getIpStatus(ip) {
    if (!ipStore.has(ip)) {
      ipStore.set(ip, {
        attempts: 0,
        multiplier: 1, // 1 = 30min, 2 = 60min, 4 = 120min
        blockedUntil: null
      });
    }
    return ipStore.get(ip);
  }

  static checkBlock(ip) {
    const status = this.getIpStatus(ip);
    
    if (status.blockedUntil && status.blockedUntil > Date.now()) {
      return {
        isBlocked: true,
        blockedUntil: status.blockedUntil,
        remainingMs: status.blockedUntil - Date.now() // 🔥 Agregamos el tiempo restante
      };
    }

    if (status.blockedUntil && status.blockedUntil <= Date.now()) {
      status.blockedUntil = null;
      ipStore.set(ip, status);
    }

    return { isBlocked: false };
  }

  static registerFailure(ip) {
    const status = this.getIpStatus(ip);
    status.attempts += 1;

    if (status.attempts >= 5) {
      const blockDurationMs = 30 * 60 * 1000 * status.multiplier;
      status.blockedUntil = Date.now() + blockDurationMs;
      
      status.attempts = 0; 
      status.multiplier *= 2; 
    }

    ipStore.set(ip, status);
    return status;
  }

  static resetIp(ip) {
    ipStore.delete(ip);
  }
}