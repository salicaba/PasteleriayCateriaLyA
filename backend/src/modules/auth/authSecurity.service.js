/**
 * Servicio en memoria para prevención de fuerza bruta COMBINADA (Device-ID + Username).
 */
const blockStore = new Map();

export default class AuthSecurityService {
  static getStatus(securityKey) {
    if (!blockStore.has(securityKey)) {
      blockStore.set(securityKey, {
        attempts: 0,
        multiplier: 1, 
        blockedUntil: null
      });
    }
    return blockStore.get(securityKey);
  }

  static checkBlock(securityKey) {
    const status = this.getStatus(securityKey);
    
    if (status.blockedUntil && status.blockedUntil > Date.now()) {
      return {
        isBlocked: true,
        blockedUntil: status.blockedUntil,
        remainingMs: status.blockedUntil - Date.now()
      };
    }

    if (status.blockedUntil && status.blockedUntil <= Date.now()) {
      status.blockedUntil = null;
      blockStore.set(securityKey, status);
    }

    return { isBlocked: false };
  }

  static registerFailure(securityKey) {
    const status = this.getStatus(securityKey);
    status.attempts += 1;

    if (status.attempts >= 5) {
      const blockDurationMs = 30 * 60 * 1000 * status.multiplier;
      status.blockedUntil = Date.now() + blockDurationMs;
      
      status.attempts = 0; 
      status.multiplier *= 2; 
    }

    blockStore.set(securityKey, status);
    return status;
  }

  static reset(securityKey) {
    blockStore.delete(securityKey);
  }
}