import { Customer } from '../types';
import { generateToken, verifyToken } from './crypto';

// Chiavi per il localStorage
const AUTH_TOKEN_KEY = 'freetosmoke_auth_token';
const SESSION_TIMEOUT_KEY = 'freetosmoke_session_timeout';
const ADMIN_TOKEN_KEY = 'freetosmoke_admin_token';

// Durata della sessione in millisecondi (30 minuti)
const SESSION_DURATION = 30 * 60 * 1000;

/**
 * Crea un token di autenticazione per un cliente e lo salva nel localStorage
 * @param customer - Il cliente da autenticare
 * @returns Il token generato
 */
export const authenticateCustomer = (customer: Customer): string => {
  // Creiamo un payload con solo le informazioni necessarie (evitando dati sensibili)
  const payload = {
    id: customer.id,
    role: 'customer'
  };
  
  // Generiamo il token con scadenza
  const token = generateToken(payload, SESSION_DURATION);
  
  // Salviamo il token nel localStorage
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  
  // Impostiamo il timeout della sessione
  const expiresAt = Date.now() + SESSION_DURATION;
  localStorage.setItem(SESSION_TIMEOUT_KEY, expiresAt.toString());
  
  return token;
};

/**
 * Crea un token di autenticazione per l'amministratore e lo salva nel localStorage
 * @param adminId - L'ID dell'amministratore
 * @returns Il token generato
 */
export const authenticateAdmin = (adminId: string): string => {
  const payload = {
    id: adminId,
    role: 'admin'
  };
  
  const token = generateToken(payload, SESSION_DURATION);
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
  
  // Impostiamo il timeout della sessione
  const expiresAt = Date.now() + SESSION_DURATION;
  localStorage.setItem(SESSION_TIMEOUT_KEY, expiresAt.toString());
  
  return token;
};

/**
 * Verifica se l'utente corrente è autenticato
 * @returns true se l'utente è autenticato, altrimenti false
 */
export const isAuthenticated = (): boolean => {
  // Verifichiamo se esiste un token
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return false;
  
  // Verifichiamo se il token è valido
  const payload = verifyToken(token);
  if (!payload) {
    // Se il token non è valido, effettuiamo il logout
    logout();
    return false;
  }
  
  // Verifichiamo se la sessione è scaduta
  const timeout = localStorage.getItem(SESSION_TIMEOUT_KEY);
  if (timeout && parseInt(timeout) < Date.now()) {
    // Se la sessione è scaduta, effettuiamo il logout
    logout();
    return false;
  }
  
  // Rinnoviamo il timeout della sessione
  const expiresAt = Date.now() + SESSION_DURATION;
  localStorage.setItem(SESSION_TIMEOUT_KEY, expiresAt.toString());
  
  return true;
};

/**
 * Verifica se l'utente corrente è un amministratore
 * @returns true se l'utente è un amministratore autenticato, altrimenti false
 */
export const isAdmin = (): boolean => {
  const token = localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return false;
  
  const payload = verifyToken(token);
  return payload?.role === 'admin';
};

/**
 * Effettua il logout dell'utente corrente
 */
export const logout = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  localStorage.removeItem(SESSION_TIMEOUT_KEY);
};

/**
 * Ottiene l'ID dell'utente corrente dal token
 * @returns L'ID dell'utente se autenticato, altrimenti null
 */
export const getCurrentUserId = (): string | null => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;
  
  const payload = verifyToken(token);
  return (payload?.id as string) || null;
};

/**
 * Ottiene il ruolo dell'utente corrente dal token
 * @returns Il ruolo dell'utente se autenticato, altrimenti null
 */
export const getCurrentUserRole = (): 'admin' | 'customer' | null => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(ADMIN_TOKEN_KEY);
  if (!token) return null;
  
  const payload = verifyToken(token);
  return (payload?.role as 'admin' | 'customer') || null;
};

/**
 * Verifica se una password soddisfa i requisiti di sicurezza
 * @param password - La password da verificare
 * @returns Un oggetto con il risultato della validazione e un messaggio
 */
export const validatePasswordStrength = (password: string): { isValid: boolean; message: string } => {
  if (password.length < 8) {
    return { isValid: false, message: 'La password deve contenere almeno 8 caratteri' };
  }
  
  // Verifica la presenza di almeno una lettera maiuscola
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'La password deve contenere almeno una lettera maiuscola' };
  }
  
  // Verifica la presenza di almeno una lettera minuscola
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'La password deve contenere almeno una lettera minuscola' };
  }
  
  // Verifica la presenza di almeno un numero
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'La password deve contenere almeno un numero' };
  }
  
  // Verifica la presenza di almeno un carattere speciale
  if (!/[!@#$%^&*()_+\-=[\]{};':"|,.<>/?]/.test(password)) {
    return { isValid: false, message: 'La password deve contenere almeno un carattere speciale' };
  }
  
  return { isValid: true, message: 'Password valida' };
};