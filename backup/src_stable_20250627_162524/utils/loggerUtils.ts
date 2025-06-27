import { SecurityEvent } from '../types';

// Interfaccia per il logger di sicurezza
export interface SecurityLogger {
  logEvent: (event: SecurityEvent) => Promise<void>;
}

// Logger di default che stampa solo in console
export const consoleLogger: SecurityLogger = {
  logEvent: async (event: SecurityEvent): Promise<void> => {
    console.log('Security log (console):', event);
  }
};

// Variabile globale per il logger attuale
let currentLogger: SecurityLogger = consoleLogger;

/**
 * Imposta il logger di sicurezza da utilizzare
 * @param logger - Il logger da utilizzare
 */
export const setSecurityLogger = (logger: SecurityLogger): void => {
  currentLogger = logger;
};

/**
 * Ottiene il logger di sicurezza attuale
 * @returns Il logger di sicurezza attuale
 */
export const getSecurityLogger = (): SecurityLogger => {
  return currentLogger;
};