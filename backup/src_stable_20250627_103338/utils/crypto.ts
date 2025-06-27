import * as CryptoJS from 'crypto-js';
// Add to package.json: npm install --save crypto-js @types/crypto-js

// Chiave di crittografia segreta (in un'applicazione reale, questa dovrebbe essere memorizzata in modo sicuro)
// Idealmente, questa chiave dovrebbe essere generata e memorizzata in un ambiente sicuro come variabili d'ambiente
const SECRET_KEY = 'free-to-smoke-secure-encryption-key-2023';

/**
 * Cripta un valore utilizzando AES
 * @param value - Il valore da criptare
 * @returns Il valore criptato come stringa
 */
export const encrypt = (value: string): string => {
  if (!value) return '';
  try {
    return CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
  } catch (error) {
    console.error('Errore durante la crittografia:', error);
    return '';
  }
};

/**
 * Decripta un valore criptato
 * @param encryptedValue - Il valore criptato da decriptare
 * @returns Il valore decriptato
 */
export const decrypt = (encryptedValue: string): string => {
  if (!encryptedValue) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedValue, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Errore durante la decrittografia:', error);
    return '';
  }
};

/**
 * Genera un hash sicuro di una password utilizzando SHA-256
 * @param password - La password da hashare
 * @returns L'hash della password
 */
export const hashPassword = (password: string): string => {
  if (!password) return '';
  try {
    return CryptoJS.SHA256(password).toString();
  } catch (error) {
    console.error('Errore durante l\'hashing della password:', error);
    return '';
  }
};

/**
 * Verifica se una password corrisponde a un hash
 * @param password - La password da verificare
 * @param hash - L'hash con cui confrontare
 * @returns true se la password corrisponde all'hash, altrimenti false
 */
export const verifyPassword = (password: string, hash: string): boolean => {
  if (!password || !hash) return false;
  try {
    const passwordHash = CryptoJS.SHA256(password).toString();
    return passwordHash === hash;
  } catch (error) {
    console.error('Errore durante la verifica della password:', error);
    return false;
  }
};

/**
 * Genera un token JWT semplificato
 * @param payload - I dati da includere nel token
 * @param expiresIn - Durata di validità in millisecondi
 * @returns Il token generato
 */
export const generateToken = (payload: Record<string, unknown>, expiresIn: number = 3600000): string => {
  try {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const now = Date.now();
    const exp = now + expiresIn;
    
    const data = {
      ...payload,
      iat: now,
      exp
    };
    
    const encodedHeader = btoa(JSON.stringify(header));
    const encodedPayload = btoa(JSON.stringify(data));
    
    const signature = CryptoJS.HmacSHA256(`${encodedHeader}.${encodedPayload}`, SECRET_KEY).toString(CryptoJS.enc.Base64);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  } catch (error) {
    console.error('Errore durante la generazione del token:', error);
    return '';
  }
};

/**
 * Verifica un token JWT semplificato
 * @param token - Il token da verificare
 * @returns Il payload decodificato se il token è valido, altrimenti null
 */
export const verifyToken = (token: string): Record<string, unknown> | null => {
  try {
    const [encodedHeader, encodedPayload, signature] = token.split('.');
    
    // Verifica la firma
    const expectedSignature = CryptoJS.HmacSHA256(`${encodedHeader}.${encodedPayload}`, SECRET_KEY).toString(CryptoJS.enc.Base64);
    
    if (signature !== expectedSignature) {
      return null; // Firma non valida
    }
    
    // Decodifica il payload
    const payload = JSON.parse(atob(encodedPayload));
    
    // Verifica la scadenza
    if (payload.exp && payload.exp < Date.now()) {
      return null; // Token scaduto
    }
    
    return payload;
  } catch (error) {
    console.error('Errore durante la verifica del token:', error);
    return null;
  }
};