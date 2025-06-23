import { encrypt, decrypt } from './crypto';

// Chiave per i log di sicurezza nel localStorage
const SECURITY_LOGS_KEY = 'freetosmoke_security_logs';

// Tipi di eventi di sicurezza
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  REGISTRATION = 'REGISTRATION',
  REGISTRATION_FAILURE = 'REGISTRATION_FAILURE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_CHANGE_FAILURE = 'PASSWORD_CHANGE_FAILURE',
  ADMIN_ACCESS = 'ADMIN_ACCESS',
  ADMIN_ACCESS_ATTEMPT = 'ADMIN_ACCESS_ATTEMPT',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CUSTOMER_DATA_MODIFIED = 'CUSTOMER_DATA_MODIFIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  CSRF_ATTACK = 'CSRF_ATTACK',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  PROFILE_ACCESS = 'PROFILE_ACCESS',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  ACCOUNT_BLOCKED = 'ACCOUNT_BLOCKED',
  PAGE_ACCESS = 'PAGE_ACCESS'
}

// Interfaccia per un evento di sicurezza
interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  userId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Ottiene i log di sicurezza dal localStorage
 * @returns Array di eventi di sicurezza
 */
export const getSecurityLogs = (): SecurityEvent[] => {
  const encryptedLogs = localStorage.getItem(SECURITY_LOGS_KEY);
  if (!encryptedLogs) return [];
  
  try {
    const decryptedLogs = decrypt(encryptedLogs);
    return JSON.parse(decryptedLogs);
  } catch (error) {
    console.error('Errore durante il recupero dei log di sicurezza:', error);
    return [];
  }
};

/**
 * Salva i log di sicurezza nel localStorage
 * @param logs - Array di eventi di sicurezza da salvare
 */
const saveSecurityLogs = (logs: SecurityEvent[]): void => {
  try {
    // Limitiamo il numero di log per evitare di riempire il localStorage
    const limitedLogs = logs.slice(-1000); // Manteniamo solo gli ultimi 1000 log
    const encryptedLogs = encrypt(JSON.stringify(limitedLogs));
    localStorage.setItem(SECURITY_LOGS_KEY, encryptedLogs);
  } catch (error) {
    console.error('Errore durante il salvataggio dei log di sicurezza:', error);
  }
};

/**
 * Aggiunge un evento di sicurezza ai log
 * @param eventType - Il tipo di evento di sicurezza
 * @param userId - L'ID dell'utente coinvolto (opzionale)
 * @param details - Dettagli aggiuntivi sull'evento (opzionale)
 */
export const logSecurityEvent = (
  eventType: SecurityEventType,
  userId?: string,
  details?: string
): void => {
  try {
    // Ottieni i log esistenti
    const logs = getSecurityLogs();
    
    // Crea il nuovo evento
    const newEvent: SecurityEvent = {
      type: eventType,
      timestamp: Date.now(),
      userId,
      details,
      userAgent: navigator.userAgent,
      // In un'applicazione reale, l'indirizzo IP dovrebbe essere ottenuto dal server
      // Qui simuliamo un IP locale
      ipAddress: '127.0.0.1'
    };
    
    // Aggiungi l'evento ai log
    logs.push(newEvent);
    
    // Salva i log aggiornati
    saveSecurityLogs(logs);
    
    // In un'applicazione reale, potremmo anche inviare i log a un server
    // per un monitoraggio centralizzato
    // sendLogToServer(newEvent);
  } catch (error) {
    console.error('Errore durante la registrazione dell\'evento di sicurezza:', error);
  }
};

/**
 * Ottiene gli ultimi eventi di sicurezza di un determinato tipo
 * @param eventType - Il tipo di evento di sicurezza da filtrare
 * @param limit - Il numero massimo di eventi da restituire
 * @returns Array di eventi di sicurezza filtrati
 */
export const getSecurityEventsByType = (
  eventType: SecurityEventType,
  limit: number = 10
): SecurityEvent[] => {
  const logs = getSecurityLogs();
  
  return logs
    .filter(event => event.type === eventType)
    .sort((a, b) => b.timestamp - a.timestamp) // Ordina per timestamp decrescente
    .slice(0, limit);
};

/**
 * Ottiene gli eventi di sicurezza per un determinato utente
 * @param userId - L'ID dell'utente
 * @param limit - Il numero massimo di eventi da restituire
 * @returns Array di eventi di sicurezza filtrati
 */
export const getSecurityEventsByUser = (
  userId: string,
  limit: number = 10
): SecurityEvent[] => {
  const logs = getSecurityLogs();
  
  return logs
    .filter(event => event.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp) // Ordina per timestamp decrescente
    .slice(0, limit);
};

/**
 * Verifica se ci sono attività sospette per un determinato utente
 * @param userId - L'ID dell'utente
 * @param timeWindow - La finestra temporale in millisecondi
 * @param failureThreshold - Il numero di fallimenti che attiva l'allarme
 * @returns true se sono state rilevate attività sospette, altrimenti false
 */
export const detectSuspiciousActivity = (
  userId: string,
  timeWindow: number = 3600000, // 1 ora
  failureThreshold: number = 3
): boolean => {
  const logs = getSecurityLogs();
  const now = Date.now();
  
  // Filtra i tentativi di accesso falliti recenti per l'utente
  const recentFailures = logs.filter(
    event => 
      event.userId === userId && 
      event.type === SecurityEventType.LOGIN_FAILURE &&
      now - event.timestamp < timeWindow
  );
  
  return recentFailures.length >= failureThreshold;
};

/**
 * Cancella tutti i log di sicurezza
 * Questa funzione dovrebbe essere utilizzata solo per scopi amministrativi
 */
export const clearSecurityLogs = (): void => {
  localStorage.removeItem(SECURITY_LOGS_KEY);
};