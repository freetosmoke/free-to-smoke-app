import { Customer } from '../types';
import { generateToken, verifyToken } from './crypto';
import * as firebaseService from './firebase';

// Durata della sessione

// Durata della sessione in millisecondi (30 minuti)
const SESSION_DURATION = 30 * 60 * 1000;

/**
 * Crea un token di autenticazione per un cliente e lo salva in Firebase
 * @param customer - Il cliente da autenticare
 * @returns Il token generato
 */
export const authenticateCustomer = async (customer: Customer): Promise<string> => {
  // Creiamo un payload con solo le informazioni necessarie (evitando dati sensibili)
  const payload = {
    id: customer.id,
    role: 'customer'
  };
  
  // Generiamo il token con scadenza
  const token = generateToken(payload, SESSION_DURATION);
  
  // Impostiamo il timeout della sessione
  const expiresAt = Date.now() + SESSION_DURATION;
  
  // Salviamo il token in Firebase
  await firebaseService.setAuthToken(customer.id, token, expiresAt);
  
  return token;
};

/**
 * Crea un token di autenticazione per l'amministratore e lo salva in Firebase
 * @param adminId - L'ID dell'amministratore
 * @returns Il token generato
 */
export const authenticateAdmin = async (adminId: string): Promise<string> => {
  const payload = {
    id: adminId,
    role: 'admin'
  };
  
  const token = generateToken(payload, SESSION_DURATION);
  const expiresAt = Date.now() + SESSION_DURATION;
  
  // Salviamo il token in Firebase
  await firebaseService.setAdminToken(adminId, token, expiresAt);
  
  return token;
};

/**
 * Verifica se l'utente corrente è autenticato
 * @returns true se l'utente è autenticato, altrimenti false
 */
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    // Otteniamo l'ID utente dalla sessione
    const userId = sessionStorage.getItem('current_user_id');
    if (!userId) return false;
    
    // Verifichiamo se esiste un token in Firebase
    const authData = await firebaseService.getAuthToken(userId);
    if (!authData || !authData.token) return false;
    
    // Verifichiamo se il token è valido
    const payload = verifyToken(authData.token);
    if (!payload) {
      // Se il token non è valido, effettuiamo il logout
      await logout();
      return false;
    }
    
    // Verifichiamo se la sessione è scaduta
    if (authData.expiresAt < Date.now()) {
      // Se la sessione è scaduta, effettuiamo il logout
      await logout();
      return false;
    }
    
    // Rinnoviamo il timeout della sessione
    const expiresAt = Date.now() + SESSION_DURATION;
    await firebaseService.setAuthToken(userId, authData.token, expiresAt);
    
    return true;
  } catch (error) {
    console.error('Errore durante la verifica dell\'autenticazione:', error);
    return false;
  }
};

/**
 * Verifica se l'utente corrente è un amministratore
 * @returns true se l'utente è un amministratore autenticato, altrimenti false
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    // Otteniamo l'ID admin dalla sessione
    const adminId = sessionStorage.getItem('current_admin_id');
    if (!adminId) return false;
    
    // Verifichiamo se esiste un token in Firebase
    const authData = await firebaseService.getAdminToken(adminId);
    if (!authData || !authData.token) return false;
    
    // Verifichiamo se il token è valido
    const payload = verifyToken(authData.token);
    return payload?.role === 'admin';
  } catch (error) {
    console.error('Errore durante la verifica dell\'amministratore:', error);
    return false;
  }
};

/**
 * Effettua il logout dell'utente corrente
 */
export const logout = async (): Promise<void> => {
  try {
    // Otteniamo gli ID utente e admin dal sessionStorage
    const userId = sessionStorage.getItem('current_user_id');
    const adminId = sessionStorage.getItem('current_admin_id');
    
    // Rimuoviamo i token da Firebase
    if (userId) {
      await firebaseService.removeAuthToken(userId);
      sessionStorage.removeItem('current_user_id');
    }
    
    if (adminId) {
      await firebaseService.removeAdminToken(adminId);
      sessionStorage.removeItem('current_admin_id');
    }
  } catch (error) {
    console.error('Errore durante il logout:', error);
  }
};

/**
 * Ottiene l'ID dell'utente corrente dal sessionStorage
 * @returns L'ID dell'utente se autenticato, altrimenti null
 */
export const getCurrentUserId = (): string | null => {
  return sessionStorage.getItem('current_user_id') || sessionStorage.getItem('current_admin_id') || null;
};

/**
 * Ottiene il ruolo dell'utente corrente
 * @returns Il ruolo dell'utente se autenticato, altrimenti null
 */
export const getCurrentUserRole = async (): Promise<'admin' | 'customer' | null> => {
  try {
    const userId = sessionStorage.getItem('current_user_id');
    const adminId = sessionStorage.getItem('current_admin_id');
    
    if (adminId) {
      const authData = await firebaseService.getAdminToken(adminId);
      if (authData && authData.token) {
        const payload = verifyToken(authData.token);
        if (payload?.role === 'admin') return 'admin';
      }
    }
    
    if (userId) {
      const authData = await firebaseService.getAuthToken(userId);
      if (authData && authData.token) {
        const payload = verifyToken(authData.token);
        if (payload?.role === 'customer') return 'customer';
      }
    }
    
    return null;
  } catch (error) {
    console.error('Errore durante il recupero del ruolo utente:', error);
    return null;
  }
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