import type { Customer, Prize, Notification, NotificationHistory, PointTransaction } from '../types';
import { encrypt, decrypt, hashPassword, verifyPassword } from './crypto';
import { sanitizeObject } from './security';
import { logSecurityEvent, SecurityEventType } from './securityLogger';

const STORAGE_KEYS = {
  CUSTOMERS: 'freetosmoke_customers',
  PRIZES: 'freetosmoke_prizes',
  NOTIFICATIONS: 'freetosmoke_notifications',
  NOTIFICATION_HISTORY: 'freetosmoke_notification_history',
  TRANSACTIONS: 'freetosmoke_transactions',
  ADMIN_AUTH: 'freetosmoke_admin_auth',
  ADMIN_CREDENTIALS: 'freetosmoke_admin_credentials'
};

// Interfaccia per le credenziali di amministrazione con password hashata
interface AdminCredentials {
  email: string;
  password: string; // Password hashata
}

// Default admin credentials con password hashata
const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  email: 'admin@freetosmoke.com',
  password: hashPassword('Admin123!') // Password hashata con requisiti di sicurezza
};

// Customer operations con crittografia
export const getCustomers = (): Customer[] => {
  const encryptedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (!encryptedCustomers) return [];
  
  try {
    const decryptedData = decrypt(encryptedCustomers);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Errore durante il recupero dei clienti:', error);
    return [];
  }
};

export const saveCustomers = (customers: Customer[]): void => {
  try {
    // Sanitizziamo i dati prima di salvarli
    const sanitizedCustomers = sanitizeObject(customers);
    const encryptedData = encrypt(JSON.stringify(sanitizedCustomers));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, encryptedData);
  } catch (error) {
    console.error('Errore durante il salvataggio dei clienti:', error);
  }
};

export const addCustomer = (customer: Customer): void => {
  try {
    const customers = getCustomers();
    // Sanitizziamo i dati del cliente
    const sanitizedCustomer = sanitizeObject(customer);
    customers.push(sanitizedCustomer);
    saveCustomers(customers);
    
    // Registriamo l'evento di registrazione
    logSecurityEvent(SecurityEventType.REGISTRATION, customer.id);
  } catch (error) {
    console.error('Errore durante l\'aggiunta del cliente:', error);
  }
};

export const updateCustomer = (updatedCustomer: Customer): void => {
  try {
    const customers = getCustomers();
    const index = customers.findIndex(c => c.id === updatedCustomer.id);
    if (index !== -1) {
      // Sanitizziamo i dati del cliente
      const sanitizedCustomer = sanitizeObject(updatedCustomer);
      customers[index] = sanitizedCustomer;
      saveCustomers(customers);
      
      // Registriamo l'evento di modifica dei dati
      logSecurityEvent(SecurityEventType.CUSTOMER_DATA_MODIFIED, updatedCustomer.id);
    }
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del cliente:', error);
  }
};

export const deleteCustomer = (customerId: string): void => {
  try {
    const customers = getCustomers();
    const updatedCustomers = customers.filter(c => c.id !== customerId);
    saveCustomers(updatedCustomers);
    
    // Registriamo l'evento di eliminazione del cliente
    logSecurityEvent(SecurityEventType.CUSTOMER_DATA_MODIFIED, customerId, 'Cliente eliminato');
  } catch (error) {
    console.error('Errore durante l\'eliminazione del cliente:', error);
  }
};

export const findCustomerByPhone = (phone: string): Customer | null => {
  const customers = getCustomers();
  return customers.find(c => c.phone === phone) || null;
};

export const findCustomerByEmail = (email: string): Customer | null => {
  const customers = getCustomers();
  return customers.find(c => c.email === email) || null;
};

// Prize operations con crittografia
export const getPrizes = (): Prize[] => {
  const encryptedPrizes = localStorage.getItem(STORAGE_KEYS.PRIZES);
  if (!encryptedPrizes) return [];
  
  try {
    const decryptedData = decrypt(encryptedPrizes);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Errore durante il recupero dei premi:', error);
    return [];
  }
};

export const savePrizes = (prizes: Prize[]): void => {
  try {
    // Sanitizziamo i dati prima di salvarli
    const sanitizedPrizes = sanitizeObject(prizes);
    const encryptedData = encrypt(JSON.stringify(sanitizedPrizes));
    localStorage.setItem(STORAGE_KEYS.PRIZES, encryptedData);
  } catch (error) {
    console.error('Errore durante il salvataggio dei premi:', error);
  }
};

// Notification operations con crittografia
export const getNotifications = (): Notification[] => {
  const encryptedNotifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  if (!encryptedNotifications) return [];
  
  try {
    const decryptedData = decrypt(encryptedNotifications);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Errore durante il recupero delle notifiche:', error);
    return [];
  }
};

export const saveNotifications = (notifications: Notification[]): void => {
  try {
    // Sanitizziamo i dati prima di salvarli
    const sanitizedNotifications = sanitizeObject(notifications);
    const encryptedData = encrypt(JSON.stringify(sanitizedNotifications));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, encryptedData);
  } catch (error) {
    console.error('Errore durante il salvataggio delle notifiche:', error);
  }
};

// Notification History operations con crittografia
export const getNotificationHistory = (): NotificationHistory[] => {
  const encryptedHistory = localStorage.getItem(STORAGE_KEYS.NOTIFICATION_HISTORY);
  if (!encryptedHistory) return [];
  
  try {
    const decryptedData = decrypt(encryptedHistory);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Errore durante il recupero dello storico notifiche:', error);
    return [];
  }
};

export const saveNotificationHistory = (history: NotificationHistory[]): void => {
  try {
    const sanitizedHistory = sanitizeObject(history);
    const encryptedData = encrypt(JSON.stringify(sanitizedHistory));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATION_HISTORY, encryptedData);
  } catch (error) {
    console.error('Errore durante il salvataggio dello storico notifiche:', error);
  }
};

export const addNotificationToHistory = (historyEntry: NotificationHistory): void => {
  const currentHistory = getNotificationHistory();
  currentHistory.push(historyEntry);
  saveNotificationHistory(currentHistory);
};

// Transaction operations con crittografia
export const getTransactions = (): PointTransaction[] => {
  const encryptedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  if (!encryptedTransactions) return [];
  
  try {
    const decryptedData = decrypt(encryptedTransactions);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Errore durante il recupero delle transazioni:', error);
    return [];
  }
};

export const saveTransactions = (transactions: PointTransaction[]): void => {
  try {
    // Sanitizziamo i dati prima di salvarli
    const sanitizedTransactions = sanitizeObject(transactions);
    const encryptedData = encrypt(JSON.stringify(sanitizedTransactions));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, encryptedData);
  } catch (error) {
    console.error('Errore durante il salvataggio delle transazioni:', error);
  }
};

export const addTransaction = (transaction: PointTransaction): void => {
  try {
    const transactions = getTransactions();
    // Sanitizziamo i dati della transazione
    const sanitizedTransaction = sanitizeObject(transaction);
    transactions.push(sanitizedTransaction);
    saveTransactions(transactions);
  } catch (error) {
    console.error('Errore durante l\'aggiunta della transazione:', error);
  }
};

// Admin authentication con crittografia
export const setAdminAuth = (isAuthenticated: boolean): void => {
  try {
    const encryptedData = encrypt(JSON.stringify(isAuthenticated));
    localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, encryptedData);
    
    // Registriamo l'evento di accesso o logout dell'amministratore
    if (isAuthenticated) {
      logSecurityEvent(SecurityEventType.ADMIN_ACCESS, 'admin');
    } else {
      logSecurityEvent(SecurityEventType.LOGOUT, 'admin');
    }
  } catch (error) {
    console.error('Errore durante l\'impostazione dell\'autenticazione admin:', error);
  }
};

export const getAdminAuth = (): boolean => {
  const encryptedAuth = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);
  if (!encryptedAuth) return false;
  
  try {
    const decryptedData = decrypt(encryptedAuth);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Errore durante il recupero dell\'autenticazione admin:', error);
    return false;
  }
};

// Admin credentials management con crittografia e hashing delle password
export const getAdminCredentials = (): AdminCredentials => {
  const encryptedCredentials = localStorage.getItem(STORAGE_KEYS.ADMIN_CREDENTIALS);
  if (!encryptedCredentials) return DEFAULT_ADMIN_CREDENTIALS;
  
  try {
    const decryptedData = decrypt(encryptedCredentials);
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Errore durante il recupero delle credenziali admin:', error);
    return DEFAULT_ADMIN_CREDENTIALS;
  }
};

export const setAdminCredentials = (email: string, password: string): void => {
  try {
    // Sanitizziamo l'email e hashiamo la password
    const sanitizedEmail = sanitizeObject(email);
    const hashedPassword = hashPassword(password);
    
    const credentials: AdminCredentials = { 
      email: sanitizedEmail, 
      password: hashedPassword 
    };
    
    const encryptedData = encrypt(JSON.stringify(credentials));
    localStorage.setItem(STORAGE_KEYS.ADMIN_CREDENTIALS, encryptedData);
    
    // Registriamo l'evento di modifica delle credenziali
    logSecurityEvent(SecurityEventType.PASSWORD_CHANGE, 'admin');
  } catch (error) {
    console.error('Errore durante l\'impostazione delle credenziali admin:', error);
  }
};

export const validateAdminCredentials = (email: string, password: string): boolean => {
  try {
    const credentials = getAdminCredentials();
    const isValid = credentials.email === email && verifyPassword(password, credentials.password);
    
    // Registriamo il tentativo di accesso
    if (isValid) {
      logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, 'admin');
    } else {
      logSecurityEvent(SecurityEventType.LOGIN_FAILURE, 'admin', `Tentativo di accesso fallito per l'email: ${email}`);
    }
    
    return isValid;
  } catch (error) {
    console.error('Errore durante la validazione delle credenziali admin:', error);
    return false;
  }
};