import { SecurityEventType, SecurityEvent } from '../types';
import { getSecurityLogs as getFirebaseSecurityLogs, clearSecurityLogs as clearFirebaseSecurityLogs } from './firebase';
import { getSecurityLogger } from './loggerUtils';

/**
 * Ottiene i log di sicurezza
 * @returns Promise che risolve a un array di eventi di sicurezza
 * @deprecated Utilizzare direttamente il servizio Firebase
 */
export const getSecurityLogs = async (): Promise<SecurityEvent[]> => {
  console.warn('getSecurityLogs è deprecato. Utilizzare direttamente il servizio Firebase.');
  return [];
};

// La funzione saveSecurityLogs non è più necessaria poiché i log vengono salvati direttamente in Firebase
// tramite la funzione addSecurityLog

/**
 * Aggiunge un evento di sicurezza ai log
 * @param eventType - Il tipo di evento di sicurezza
 * @param userId - L'ID dell'utente coinvolto (opzionale)
 * @param details - Dettagli aggiuntivi sull'evento (opzionale)
 */
export const logSecurityEvent = async (
  eventType: SecurityEventType,
  userId?: string,
  details?: string
): Promise<void> => {
  try {
    // Crea il nuovo evento
    const newEvent: SecurityEvent = {
      type: eventType,
      timestamp: Date.now(),
      userId,
      details,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server-side',
      // In un'applicazione reale, l'indirizzo IP dovrebbe essere ottenuto dal server
      // Qui simuliamo un IP locale
      ipAddress: '127.0.0.1'
    };
    
    // Utilizza il logger configurato
    await getSecurityLogger().logEvent(newEvent);
    
    // In un'applicazione reale, potremmo anche inviare i log a un server
    // per un monitoraggio centralizzato
    // sendLogToServer(newEvent);
  } catch (error) {
    console.error('Errore durante la registrazione dell\'evento di sicurezza:', error);
  }
};

/**
 * Ottiene gli eventi di sicurezza di un determinato tipo
 * @param eventType - Il tipo di evento di sicurezza
 * @param limit - Il numero massimo di eventi da restituire
 * @returns Promise che risolve a un array di eventi di sicurezza filtrati
 */
export const getSecurityEventsByType = async (
  eventType: SecurityEventType,
  limit: number = 10
): Promise<SecurityEvent[]> => {
  try {
    const logs = await getFirebaseSecurityLogs();
    
    return logs
      .filter(event => event.type === eventType)
      .sort((a, b) => b.timestamp - a.timestamp) // Ordina per timestamp decrescente
      .slice(0, limit);
  } catch (error) {
    console.error('Errore durante il recupero degli eventi di sicurezza per tipo:', error);
    return [];
  }
};

/**
 * Ottiene gli eventi di sicurezza per un determinato utente
 * @param userId - L'ID dell'utente
 * @param limit - Il numero massimo di eventi da restituire
 * @returns Promise che risolve a un array di eventi di sicurezza filtrati
 */
export const getSecurityEventsByUser = async (
  userId: string,
  limit: number = 10
): Promise<SecurityEvent[]> => {
  try {
    const logs = await getFirebaseSecurityLogs();
    
    return logs
      .filter(event => event.userId === userId)
      .sort((a, b) => b.timestamp - a.timestamp) // Ordina per timestamp decrescente
      .slice(0, limit);
  } catch (error) {
    console.error('Errore durante il recupero degli eventi di sicurezza per utente:', error);
    return [];
  }
};

/**
 * Verifica se ci sono attività sospette per un determinato utente
 * @param userId - L'ID dell'utente
 * @param timeWindow - La finestra temporale in millisecondi
 * @param failureThreshold - Il numero di fallimenti che attiva l'allarme
 * @returns Promise che risolve a true se sono state rilevate attività sospette, altrimenti false
 */
export const detectSuspiciousActivity = async (
  userId: string,
  timeWindow: number = 3600000, // 1 ora
  failureThreshold: number = 3
): Promise<boolean> => {
  try {
    const logs = await getFirebaseSecurityLogs();
    const now = Date.now();
    
    // Filtra i tentativi di accesso falliti recenti per l'utente
    const recentFailures = logs.filter(
      event => 
        event.userId === userId && 
        event.type === SecurityEventType.LOGIN_FAILURE &&
        now - event.timestamp < timeWindow
    );
    
    return recentFailures.length >= failureThreshold;
  } catch (error) {
    console.error('Errore durante il rilevamento di attività sospette:', error);
    return false; // In caso di errore, assumiamo che non ci siano attività sospette
  }
};

/**
 * Cancella tutti i log di sicurezza
 * Questa funzione dovrebbe essere utilizzata solo per scopi amministrativi
 * @returns Promise che si risolve quando i log sono stati cancellati
 */
export const clearSecurityLogs = async (): Promise<void> => {
  try {
    await clearFirebaseSecurityLogs();
  } catch (error) {
    console.error('Errore durante la cancellazione dei log di sicurezza:', error);
  }
};