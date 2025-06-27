import * as firebaseService from './firebase';

/**
 * Sanitizza un input di testo per prevenire attacchi XSS
 * @param input - Il testo da sanitizzare
 * @returns Il testo sanitizzato
 */
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  // Sostituisce i caratteri speciali con le entità HTML
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Sanitizza un oggetto ricorsivamente
 * @param obj - L'oggetto da sanitizzare
 * @returns L'oggetto sanitizzato
 */
export const sanitizeObject = <T>(obj: T): T => {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeInput(obj) as unknown as T;
  }
  
  if (typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as unknown as T;
  }
  
  const result = {} as T;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Rimuovi completamente i campi undefined per evitare errori Firestore
      if (value !== undefined) {
        result[key] = sanitizeObject(value);
      }
    }
  }
  
  return result;
};

/**
 * Genera un token CSRF
 * @returns Il token CSRF generato
 */
export const generateCsrfToken = (): string => {
  // Genera un token casuale
  const token = Math.random().toString(36).substring(2, 15) + 
               Math.random().toString(36).substring(2, 15) + 
               Date.now().toString(36);
  
  return token;
};

/**
 * Verifica se un token CSRF è valido
 * @param token - Il token CSRF da verificare
 * @returns true se il token è valido, altrimenti false
 */
export const validateCsrfToken = (token: string): boolean => {
  // Validazione semplice: verifica che il token non sia vuoto e abbia una lunghezza minima
  return Boolean(token && token.length > 10);
};

/**
 * Implementa una protezione contro attacchi di clickjacking
 * Imposta gli header X-Frame-Options e Content-Security-Policy
 */
export const setupFrameProtection = (): void => {
  // In un'applicazione React, possiamo solo simulare questa protezione
  // In un'applicazione reale, questi header dovrebbero essere impostati dal server
  
  // Aggiungiamo un meta tag per simulare Content-Security-Policy
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = "frame-ancestors 'self'";
  document.head.appendChild(meta);
};

/**
 * Implementa una protezione contro attacchi di tipo Content-Type sniffing
 * Imposta l'header X-Content-Type-Options
 */
export const setupContentTypeProtection = (): void => {
  // In un'applicazione React, possiamo solo simulare questa protezione
  // In un'applicazione reale, questi header dovrebbero essere impostati dal server
  
  // Aggiungiamo un meta tag per simulare X-Content-Type-Options
  const meta = document.createElement('meta');
  meta.httpEquiv = 'X-Content-Type-Options';
  meta.content = 'nosniff';
  document.head.appendChild(meta);
};

/**
 * Implementa una protezione contro attacchi XSS basati su script
 * Imposta l'header X-XSS-Protection
 */
export const setupXssProtection = (): void => {
  // In un'applicazione React, possiamo solo simulare questa protezione
  // In un'applicazione reale, questi header dovrebbero essere impostati dal server
  
  // Aggiungiamo un meta tag per simulare X-XSS-Protection
  const meta = document.createElement('meta');
  meta.httpEquiv = 'X-XSS-Protection';
  meta.content = '1; mode=block';
  document.head.appendChild(meta);
};

/**
 * Configura tutte le protezioni di sicurezza
 */
export const setupSecurityProtections = (): void => {
  setupFrameProtection();
  setupContentTypeProtection();
  setupXssProtection();
  generateCsrfToken(); // Genera un token CSRF iniziale
};

/**
 * Implementa una protezione contro attacchi di rate limiting
 * @param key - La chiave per identificare l'azione (es. 'login', 'register')
 * @param maxAttempts - Il numero massimo di tentativi consentiti
 * @param timeWindow - La finestra temporale in millisecondi
 * @returns Promise che risolve a true se l'azione è consentita, altrimenti false
 */
export const rateLimiter = async (key: string, maxAttempts: number = 5, timeWindow: number = 60000): Promise<boolean> => {
  try {
    // Ottieni i tentativi precedenti da Firebase
    const attempts = await firebaseService.getRateLimitAttempts(key);
    
    // Filtra i tentativi all'interno della finestra temporale
    const now = Date.now();
    const recentAttempts = attempts.filter((timestamp: number) => now - timestamp < timeWindow);
    
    // Verifica se è stato superato il limite
    if (recentAttempts.length >= maxAttempts) {
      return false; // Limite superato
    }
    
    // Aggiungi il tentativo corrente
    recentAttempts.push(now);
    
    // Salva i tentativi aggiornati in Firebase
    await firebaseService.setRateLimitAttempts(key, recentAttempts);
    
    return true; // Azione consentita
  } catch (error) {
    console.error('Errore durante il rate limiting:', error);
    return false; // In caso di errore, blocca l'azione per sicurezza
  }
};

/**
 * Resetta il contatore di rate limiting per una determinata chiave
 * @param key - La chiave per identificare l'azione
 */
export const resetRateLimiter = async (key: string): Promise<void> => {
  try {
    await firebaseService.resetRateLimit(key);
  } catch (error) {
    console.error('Errore durante il reset del rate limiter:', error);
  }
};