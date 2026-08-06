/**
 * Servicio en memoria para prevención de fuerza bruta por IP.
 * Reglas: 5 intentos -> 30 min bloqueo -> +5 intentos -> 60 min -> 120 min, etc.
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
        remainingTimeMs: status.blockedUntil - Date.now()
      };
    }

    // Si el tiempo de bloqueo ya expiró, limpiamos el bloqueo pero MANTENEMOS el multiplicador
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
      // Aplicar bloqueo exponencial: 30 minutos * multiplicador
      const blockDurationMs = 30 * 60 * 1000 * status.multiplier;
      status.blockedUntil = Date.now() + blockDurationMs;
      
      // Preparar el estado para el siguiente ciclo si vuelven a fallar
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