import { getFirestore, collection, doc, setDoc, getDocs, updateDoc, deleteDoc, query, where, addDoc, Timestamp, orderBy, writeBatch, getDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import { logSecurityEvent } from './securityLogger';
import { setSecurityLogger, SecurityLogger } from './loggerUtils';
import { sanitizeObject } from './security';
import { hashPassword, verifyPassword } from './crypto';
import type { Customer, Prize, Notification, NotificationHistory, PointTransaction } from '../types';
import { SecurityEvent, SecurityEventType } from '../types';
import CryptoJS from 'crypto-js';

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

// Configurazione Firebase - usa le variabili d'ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCWsBesSzANDSW43J23yA0VEjwJVmPOk40",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "free-to-smoke-app-new.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "free-to-smoke-app-new",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "free-to-smoke-app-new.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1003388651049",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1003388651049:web:970822d589de5d93fdfe38"
};

// Inizializza Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Configura il logger di sicurezza
const firebaseLogger: SecurityLogger = {
  logEvent: async (event: SecurityEvent): Promise<void> => {
    try {
      // Log per debug
      console.log('Security log:', event);
      
      const logsRef = collection(db, COLLECTIONS.SETTINGS, 'security_logs', 'events');
      await addDoc(logsRef, event);
    } catch (error) {
      console.error('Errore durante il salvataggio del log di sicurezza:', error);
      // Non fare throw per evitare di bloccare altre operazioni
    }
  }
};

// Imposta il logger di sicurezza
setSecurityLogger(firebaseLogger);

// Nomi delle collezioni Firestore
const COLLECTIONS = {
  CUSTOMERS: 'customers',
  PRIZES: 'prizes',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_HISTORY: 'notification_history',
  TRANSACTIONS: 'transactions',
  ADMIN_CREDENTIALS: 'admin_credentials',
  SETTINGS: 'settings',
  SECURITY_QUESTIONS: 'security_questions'
};

// Funzioni per la gestione dei clienti
export const getCustomers = async (): Promise<Customer[]> => {
  try {
    const customersCollection = collection(db, COLLECTIONS.CUSTOMERS);
    const customersSnapshot = await getDocs(customersCollection);
    return customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
  } catch (error) {
    console.error('Errore durante il recupero dei clienti:', error);
    return [];
  }
};

export const addCustomer = async (customer: Customer): Promise<void> => {
  try {
    // Sanitizziamo i dati del cliente
    const sanitizedCustomer = sanitizeObject(customer);
    
    // Se l'ID è già definito, usiamo quello, altrimenti lasciamo che Firestore ne generi uno
    if (customer.id) {
      await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customer.id), sanitizedCustomer);
    } else {
      const docRef = await addDoc(collection(db, COLLECTIONS.CUSTOMERS), sanitizedCustomer);
      // Aggiorniamo l'ID del cliente con quello generato da Firestore
      await updateDoc(docRef, { id: docRef.id } as Partial<Customer>);
    }
    
    // Registriamo l'evento di registrazione
    logSecurityEvent(SecurityEventType.REGISTRATION, customer.id || 'nuovo-cliente', 'Registrazione nuovo cliente');
  } catch (error) {
    console.error('Errore durante l\'aggiunta del cliente:', error);
    throw error;
  }
};

export const updateCustomer = async (updatedCustomer: Customer): Promise<void> => {
  try {
    if (!updatedCustomer.id) {
      throw new Error('ID cliente mancante per l\'aggiornamento');
    }
    
    // Sanitizziamo i dati del cliente
    const sanitizedCustomer = sanitizeObject(updatedCustomer);
    
    // Aggiorniamo il documento nel database
    await updateDoc(doc(db, COLLECTIONS.CUSTOMERS, updatedCustomer.id), sanitizedCustomer as Partial<Customer>);
    
    // Registriamo l'evento di modifica dei dati
    logSecurityEvent(SecurityEventType.CUSTOMER_DATA_MODIFIED, updatedCustomer.id, 'Dati cliente aggiornati');
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del cliente:', error);
    throw error;
  }
};

export const deleteCustomer = async (customerId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.CUSTOMERS, customerId));
    
    // Registriamo l'evento di eliminazione del cliente
    logSecurityEvent(SecurityEventType.CUSTOMER_DATA_MODIFIED, customerId, 'Cliente eliminato');
  } catch (error) {
    console.error('Errore durante l\'eliminazione del cliente:', error);
    throw error;
  }
};

export const findCustomerByPhone = async (phone: string): Promise<Customer | null> => {
  try {
    const customersCollection = collection(db, COLLECTIONS.CUSTOMERS);
    const q = query(customersCollection, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Customer;
  } catch (error) {
    console.error('Errore durante la ricerca del cliente per telefono:', error);
    return null;
  }
};

export const findCustomerByEmail = async (email: string): Promise<Customer | null> => {
  try {
    const customersCollection = collection(db, COLLECTIONS.CUSTOMERS);
    const q = query(customersCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const doc = querySnapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Customer;
  } catch (error) {
    console.error('Errore durante la ricerca del cliente per email:', error);
    return null;
  }
};

// Funzioni per la gestione dei premi
export const getPrizes = async (): Promise<Prize[]> => {
  try {
    const prizesCollection = collection(db, COLLECTIONS.PRIZES);
    const prizesSnapshot = await getDocs(prizesCollection);
    return prizesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prize));
  } catch (error) {
    console.error('Errore durante il recupero dei premi:', error);
    return [];
  }
};

export const savePrizes = async (prizes: Prize[]): Promise<void> => {
  try {
    // Eliminiamo tutti i premi esistenti
    const prizesCollection = collection(db, COLLECTIONS.PRIZES);
    const prizesSnapshot = await getDocs(prizesCollection);
    
    // Batch per operazioni multiple
    const batch = writeBatch(db);
    
    // Eliminiamo i documenti esistenti
    prizesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Aggiungiamo i nuovi premi
    prizes.forEach((prize) => {
      const sanitizedPrize = sanitizeObject(prize);
      const prizeRef = doc(prizesCollection);
      batch.set(prizeRef, { ...sanitizedPrize, id: prizeRef.id });
    });
    
    // Eseguiamo il batch
    await batch.commit();
  } catch (error) {
    console.error('Errore durante il salvataggio dei premi:', error);
    throw error;
  }
};

// Funzione per aggiungere un singolo premio
export const addPrize = async (prize: Omit<Prize, 'id'>): Promise<Prize> => {
  try {
    const prizesCollection = collection(db, COLLECTIONS.PRIZES);
    const sanitizedPrize = sanitizeObject(prize);
    
    // Creiamo un nuovo documento con ID generato automaticamente
    const prizeRef = doc(prizesCollection);
    const newPrize = { ...sanitizedPrize, id: prizeRef.id };
    
    // Salviamo il nuovo premio
    await setDoc(prizeRef, newPrize);
    
    // Registriamo l'evento di sicurezza
    logSecurityEvent(SecurityEventType.PRIZE_ADDED, 'admin', `Aggiunto nuovo premio: ${prize.name}`);
    
    return newPrize as Prize;
  } catch (error) {
    console.error('Errore durante l\'aggiunta del premio:', error);
    throw error;
  }
};

// Funzione per aggiornare un premio esistente
export const updatePrize = async (prize: Prize): Promise<void> => {
  try {
    const prizeRef = doc(db, COLLECTIONS.PRIZES, prize.id);
    const sanitizedPrize = sanitizeObject(prize);
    
    // Aggiorniamo il premio - utilizziamo setDoc con merge per evitare problemi di tipo con updateDoc
    await setDoc(prizeRef, sanitizedPrize, { merge: true });
    
    // Registriamo l'evento di sicurezza
    logSecurityEvent(SecurityEventType.PRIZE_UPDATED, 'admin', `Aggiornato premio: ${prize.name}`);
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del premio:', error);
    throw error;
  }
};

// Funzioni per la gestione delle notifiche
export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const notificationsCollection = collection(db, COLLECTIONS.NOTIFICATIONS);
    const notificationsSnapshot = await getDocs(notificationsCollection);
    return notificationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
  } catch (error) {
    console.error('Errore durante il recupero delle notifiche:', error);
    return [];
  }
};

export const saveNotifications = async (notifications: Notification[]): Promise<void> => {
  try {
    // Eliminiamo tutte le notifiche esistenti
    const notificationsCollection = collection(db, COLLECTIONS.NOTIFICATIONS);
    const notificationsSnapshot = await getDocs(notificationsCollection);
    
    // Batch per operazioni multiple
    const batch = writeBatch(db);
    
    // Eliminiamo i documenti esistenti
    notificationsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Aggiungiamo le nuove notifiche
    notifications.forEach((notification) => {
      const sanitizedNotification = sanitizeObject(notification);
      const notificationRef = doc(notificationsCollection);
      batch.set(notificationRef, { ...sanitizedNotification, id: notificationRef.id });
    });
    
    // Eseguiamo il batch
    await batch.commit();
  } catch (error) {
    console.error('Errore durante il salvataggio delle notifiche:', error);
    throw error;
  }
};

// Funzioni per la gestione della cronologia delle notifiche
export const getNotificationHistory = async (): Promise<NotificationHistory[]> => {
  try {
    const historyCollection = collection(db, COLLECTIONS.NOTIFICATION_HISTORY);
    const historySnapshot = await getDocs(historyCollection);
    return historySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NotificationHistory));
  } catch (error) {
    console.error('Errore durante il recupero dello storico notifiche:', error);
    return [];
  }
};

export const addNotificationToHistory = async (historyEntry: NotificationHistory): Promise<void> => {
  try {
    const sanitizedEntry = sanitizeObject(historyEntry);
    await addDoc(collection(db, COLLECTIONS.NOTIFICATION_HISTORY), {
      ...sanitizedEntry,
      timestamp: Timestamp.now()
    });
  } catch (error) {
    console.error('Errore durante l\'aggiunta alla cronologia delle notifiche:', error);
    throw error;
  }
};

// Funzioni per la gestione delle transazioni
export const getTransactions = async (): Promise<PointTransaction[]> => {
  try {
    const transactionsCollection = collection(db, COLLECTIONS.TRANSACTIONS);
    const q = query(transactionsCollection, orderBy('timestamp', 'desc'));
    const transactionsSnapshot = await getDocs(q);
    return transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PointTransaction));
  } catch (error) {
    console.error('Errore durante il recupero delle transazioni:', error);
    return [];
  }
};

export const addTransaction = async (transaction: PointTransaction): Promise<void> => {
  try {
    const sanitizedTransaction = sanitizeObject(transaction);
    await addDoc(collection(db, COLLECTIONS.TRANSACTIONS), {
      ...sanitizedTransaction,
      timestamp: transaction.timestamp || Timestamp.now()
    });
  } catch (error) {
    console.error('Errore durante l\'aggiunta della transazione:', error);
    throw error;
  }
};

// Funzioni per l'autenticazione dell'amministratore
export const loginAdmin = async (email: string, password: string): Promise<boolean> => {
  try {
    // Utilizziamo Firebase Authentication per il login
    await signInWithEmailAndPassword(auth, email, password);
    
    // Registriamo l'evento di accesso
    logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, 'admin', 'Login amministratore riuscito');
    return true;
  } catch (error) {
    console.error('Errore durante il login dell\'amministratore:', error);
    
    // Registriamo il tentativo di accesso fallito
    logSecurityEvent(SecurityEventType.LOGIN_FAILURE, 'admin', `Tentativo di accesso fallito per l'email: ${email}`);
    return false;
  }
};

export const logoutAdmin = async (): Promise<void> => {
  try {
    await signOut(auth);
    
    // Registriamo l'evento di logout
    logSecurityEvent(SecurityEventType.LOGOUT, 'admin', 'Logout amministratore');
  } catch (error) {
    console.error('Errore durante il logout dell\'amministratore:', error);
    throw error;
  }
};

export const isAdminLoggedIn = (): boolean => {
  return auth.currentUser !== null;
};

// Funzione per creare l'account admin se non esiste
export const setupAdminAccount = async (email: string, password: string): Promise<void> => {
  try {
    console.log('Inizio creazione admin con email:', email);
    
    // Verifichiamo se esiste già un utente con questa email
    const adminCredentialsCollection = collection(db, COLLECTIONS.ADMIN_CREDENTIALS);
    const q = query(adminCredentialsCollection, where("email", "==", email));
    const querySnapshot = await getDocs(q);
    
    console.log('Query risultati:', querySnapshot.size, 'documenti trovati');
    
    if (querySnapshot.empty) {
      console.log('Admin non esiste, creazione in corso...');
      
      // Creiamo l'utente in Firebase Authentication
      console.log('Creazione utente in Firebase Auth...');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log('Utente creato in Firebase Auth con UID:', userCredential.user.uid);
      
      // Salviamo le credenziali anche in Firestore (senza la password in chiaro)
      console.log('Salvataggio credenziali in Firestore...');
      const docRef = await addDoc(adminCredentialsCollection, {
        email: email,
        uid: userCredential.user.uid,
        createdAt: Timestamp.now(),
        role: 'admin'
      });
      console.log('Documento admin creato con ID:', docRef.id);
      
      logSecurityEvent(SecurityEventType.ADMIN_ACCOUNT_CREATED, 'admin', 'Account amministratore creato');
      console.log('Admin creato con successo!');
    } else {
      console.log('Admin già esistente');
    }
  } catch (error) {
    console.error('Errore durante la configurazione dell\'account admin:', error);
    if (error instanceof Error) {
      console.error('Messaggio errore:', error.message);
      console.error('Stack trace:', error.stack);
    }
    throw error;
  }
};

export const changeAdminPassword = async (newPassword: string): Promise<void> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Nessun utente autenticato');
    }
    
    await updatePassword(user, newPassword);
    
    // Registriamo l'evento di modifica della password
    logSecurityEvent(SecurityEventType.PASSWORD_CHANGE, 'admin', 'Password amministratore modificata');
  } catch (error) {
    console.error('Errore durante la modifica della password admin:', error);
    throw error;
  }
};

// Funzioni per la gestione del blocco dell'admin
export const setAdminLoginBlocked = async (blockedUntil: number | null): Promise<void> => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'admin_login_block');
    
    if (blockedUntil === null) {
      // Rimuovi il blocco
      await setDoc(settingsRef, { blocked_until: null });
    } else {
      // Imposta il blocco
      await setDoc(settingsRef, { blocked_until: blockedUntil });
    }
  } catch (error) {
    console.error('Errore durante l\'impostazione del blocco admin:', error);
    throw error;
  }
};

export const getAdminLoginBlocked = async (): Promise<number | null> => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'admin_login_block');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return data.blocked_until;
    }
    
    return null;
  } catch (error) {
    console.error('Errore durante il recupero del blocco admin:', error);
    return null;
  }
};

// Funzioni per gestire il blocco del login utente
export const setUserLoginBlocked = async (userId: string, blockUntil: number | null): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, `user_login_block_${userId}`);
    
    if (blockUntil === null) {
      // Se blockUntil è null, rimuoviamo il documento
      await deleteDoc(docRef);
    } else {
      // Altrimenti, aggiorniamo o creiamo il documento
      await setDoc(docRef, { blockUntil });
    }
  } catch (error) {
    console.error('Errore durante il salvataggio del blocco login utente:', error);
    throw error;
  }
};

export const getUserLoginBlocked = async (userId: string): Promise<number | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, `user_login_block_${userId}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.blockUntil;
    }
    
    return null;
  } catch (error) {
    console.error('Errore durante il recupero del blocco login utente:', error);
    return null;
  }
};

// Funzioni per la gestione dell'autenticazione admin
export const setAdminAuth = async (isAuthenticated: boolean): Promise<void> => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'admin_auth');
    await setDoc(settingsRef, { isAuthenticated, timestamp: Date.now() });
    
    // Registriamo l'evento di accesso o logout dell'amministratore
    if (isAuthenticated) {
      logSecurityEvent(SecurityEventType.ADMIN_ACCESS, 'admin', 'Accesso amministratore');
    } else {
      logSecurityEvent(SecurityEventType.LOGOUT, 'admin', 'Logout amministratore');
    }
  } catch (error) {
    console.error('Errore durante l\'impostazione dell\'autenticazione admin:', error);
    throw error;
  }
};

export const getAdminAuth = async (): Promise<boolean> => {
  try {
    const settingsRef = doc(db, COLLECTIONS.SETTINGS, 'admin_auth');
    const settingsDoc = await getDoc(settingsRef);
    
    if (settingsDoc.exists()) {
      const data = settingsDoc.data();
      return data.isAuthenticated || false;
    }
    
    return false;
  } catch (error) {
    console.error('Errore durante il recupero dell\'autenticazione admin:', error);
    return false;
  }
};

// Funzioni per la gestione delle credenziali admin
export const getAdminCredentials = async (): Promise<AdminCredentials> => {
  try {
    const credentialsRef = doc(db, COLLECTIONS.ADMIN_CREDENTIALS, 'admin');
    const credentialsDoc = await getDoc(credentialsRef);
    
    if (credentialsDoc.exists()) {
      const data = credentialsDoc.data();
      return {
        email: data.email,
        password: data.password
      };
    }
    
    return DEFAULT_ADMIN_CREDENTIALS;
  } catch (error) {
    console.error('Errore durante il recupero delle credenziali admin:', error);
    return DEFAULT_ADMIN_CREDENTIALS;
  }
};

export const setAdminCredentials = async (email: string, password: string): Promise<void> => {
  try {
    // Sanitizziamo l'email e hashiamo la password
    const sanitizedEmail = sanitizeObject(email);
    const hashedPassword = hashPassword(password);
    
    const credentials: AdminCredentials = { 
      email: sanitizedEmail, 
      password: hashedPassword 
    };
    
    const credentialsRef = doc(db, COLLECTIONS.ADMIN_CREDENTIALS, 'admin');
    await setDoc(credentialsRef, credentials);
    
    // Registriamo l'evento di modifica delle credenziali
    logSecurityEvent(SecurityEventType.PASSWORD_CHANGE, 'admin', 'Credenziali amministratore aggiornate');
  } catch (error) {
    console.error('Errore durante l\'impostazione delle credenziali admin:', error);
    throw error;
  }
};

export const validateAdminCredentials = async (email: string, password: string): Promise<boolean> => {
  try {
    const credentials = await getAdminCredentials();
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

// Chiave di crittografia per i dati sensibili
const ENCRYPTION_KEY = 'freetosmoke_secure_key_2023';

// Funzioni di crittografia
const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (ciphertext: string): string => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Funzioni per gestire i token CSRF
export const setCsrfToken = async (userId: string, token: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, `csrf_token_${userId}`);
    await setDoc(docRef, { token: encrypt(token), createdAt: Date.now() });
  } catch (error) {
    console.error('Errore durante il salvataggio del token CSRF:', error);
    throw error;
  }
};

export const getCsrfToken = async (userId: string): Promise<string | null> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, `csrf_token_${userId}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return decrypt(data.token);
    }
    
    return null;
  } catch (error) {
    console.error('Errore durante il recupero del token CSRF:', error);
    return null;
  }
};

// Funzioni per gestire il rate limiting
export const getRateLimitAttempts = async (key: string): Promise<number[]> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, `ratelimit_${key}`);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.attempts || [];
    }
    
    return [];
  } catch (error) {
    console.error('Errore durante il recupero dei tentativi di rate limit:', error);
    return [];
  }
};

export const setRateLimitAttempts = async (key: string, attempts: number[]): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, `ratelimit_${key}`);
    await setDoc(docRef, { attempts });
  } catch (error) {
    console.error('Errore durante il salvataggio dei tentativi di rate limit:', error);
    throw error;
  }
};

export const resetRateLimit = async (key: string): Promise<void> => {
  try {
    const docRef = doc(db, COLLECTIONS.SETTINGS, `ratelimit_${key}`);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Errore durante il reset del rate limit:', error);
    throw error;
  }
};

// Funzioni per gestire i log di sicurezza
export const getSecurityLogs = async (): Promise<SecurityEvent[]> => {
  try {
    const logsRef = collection(db, COLLECTIONS.SETTINGS, 'security_logs', 'events');
    const querySnapshot = await getDocs(logsRef);
    
    const logs: SecurityEvent[] = [];
    querySnapshot.forEach((doc) => {
      logs.push(doc.data() as SecurityEvent);
    });
    
    // Ordina i log per timestamp in ordine decrescente
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error('Errore durante il recupero dei log di sicurezza:', error);
    return [];
  }
};

// La funzione addSecurityLog è stata spostata nel logger configurato

export const clearSecurityLogs = async (): Promise<void> => {
  try {
    const logsRef = collection(db, COLLECTIONS.SETTINGS, 'security_logs', 'events');
    const querySnapshot = await getDocs(logsRef);
    
    // Elimina tutti i documenti nella collezione
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Errore durante la pulizia dei log di sicurezza:', error);
    throw error;
  }
};

// Funzioni per la gestione dei token di autenticazione
export const setAuthToken = async (userId: string, token: string, expiresAt: number): Promise<void> => {
  try {
    const tokenRef = doc(db, COLLECTIONS.SETTINGS, `auth_token_${userId}`);
    await setDoc(tokenRef, { token, expiresAt });
  } catch (error) {
    console.error(`Errore durante il salvataggio del token per l'utente ${userId}:`, error);
    throw error;
  }
};

export const getAuthToken = async (userId: string): Promise<{token: string, expiresAt: number} | null> => {
  try {
    const tokenRef = doc(db, COLLECTIONS.SETTINGS, `auth_token_${userId}`);
    const tokenDoc = await getDoc(tokenRef);
    
    if (tokenDoc.exists()) {
      return tokenDoc.data() as {token: string, expiresAt: number};
    }
    
    return null;
  } catch (error) {
    console.error(`Errore durante il recupero del token per l'utente ${userId}:`, error);
    return null;
  }
};

export const removeAuthToken = async (userId: string): Promise<void> => {
  try {
    const tokenRef = doc(db, COLLECTIONS.SETTINGS, `auth_token_${userId}`);
    await setDoc(tokenRef, { token: null, expiresAt: 0 });
  } catch (error) {
    console.error(`Errore durante la rimozione del token per l'utente ${userId}:`, error);
    throw error;
  }
};

export const setAdminToken = async (adminId: string, token: string, expiresAt: number): Promise<void> => {
  try {
    const tokenRef = doc(db, COLLECTIONS.SETTINGS, `admin_token_${adminId}`);
    await setDoc(tokenRef, { token, expiresAt });
  } catch (error) {
    console.error(`Errore durante il salvataggio del token admin per ${adminId}:`, error);
    throw error;
  }
};

export const getAdminToken = async (adminId: string): Promise<{token: string, expiresAt: number} | null> => {
  try {
    const tokenRef = doc(db, COLLECTIONS.SETTINGS, `admin_token_${adminId}`);
    const tokenDoc = await getDoc(tokenRef);
    
    if (tokenDoc.exists()) {
      return tokenDoc.data() as {token: string, expiresAt: number};
    }
    
    return null;
  } catch (error) {
    console.error(`Errore durante il recupero del token admin per ${adminId}:`, error);
    return null;
  }
};

export const removeAdminToken = async (adminId: string): Promise<void> => {
  try {
    const tokenRef = doc(db, COLLECTIONS.SETTINGS, `admin_token_${adminId}`);
    await setDoc(tokenRef, { token: null, expiresAt: 0 });
  } catch (error) {
    console.error(`Errore durante la rimozione del token admin per ${adminId}:`, error);
    throw error;
  }
};

// Funzioni per il recupero password
export const checkAdminExists = async (email: string): Promise<boolean> => {
  try {
    const adminCredentialsCollection = collection(db, COLLECTIONS.ADMIN_CREDENTIALS);
    const q = query(adminCredentialsCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Errore durante la verifica dell\'admin:', error);
    return false;
  }
};

export const resetAdminCompletely = async (): Promise<void> => {
  try {
    console.log('Inizio reset completo admin...');
    
    // 1. Elimina tutti i documenti dalla collezione admin_credentials
    const adminCredentialsCollection = collection(db, COLLECTIONS.ADMIN_CREDENTIALS);
    const adminDocs = await getDocs(adminCredentialsCollection);
    
    console.log(`Trovati ${adminDocs.size} documenti admin da eliminare`);
    
    const batch = writeBatch(db);
    adminDocs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log('Documenti admin eliminati dal database');
    
    // 2. Logout dell'utente corrente se presente
    if (auth.currentUser) {
      console.log('Logout utente corrente...');
      await signOut(auth);
    }
    
    console.log('Reset completo admin completato');
  } catch (error) {
    console.error('Errore durante il reset completo admin:', error);
    throw error;
  }
};

export const updateAdminPassword = async (email: string, newPassword: string): Promise<void> => {
  try {
    // Hash della nuova password
    const hashedPassword = CryptoJS.SHA256(newPassword).toString();
    
    // Trova il documento admin
    const adminCredentialsCollection = collection(db, COLLECTIONS.ADMIN_CREDENTIALS);
    const q = query(adminCredentialsCollection, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const adminDoc = querySnapshot.docs[0];
      await updateDoc(adminDoc.ref, {
        password: hashedPassword,
        lastPasswordChange: Timestamp.now()
      });
      
      logSecurityEvent(SecurityEventType.PASSWORD_CHANGE, email, 'Password aggiornata tramite recupero');
    } else {
      throw new Error('Admin non trovato');
    }
  } catch (error) {
    console.error('Errore durante l\'aggiornamento della password:', error);
    throw error;
  }
};

// Funzioni per gestire le domande di sicurezza
export const saveSecurityQuestions = async (questionsAndAnswers: { question: string; answer: string }[]): Promise<void> => {
  try {
    const securityQuestionsCollection = collection(db, COLLECTIONS.SECURITY_QUESTIONS);
    
    // Estrai domande e risposte
    const questions = questionsAndAnswers.map(qa => qa.question);
    const answers = questionsAndAnswers.map(qa => qa.answer);
    
    // Cripta le risposte prima di salvarle
    const encryptedAnswers = answers.map(answer => 
      CryptoJS.AES.encrypt(answer.toLowerCase().trim(), 'security-key-2024').toString()
    );
    
    // Salva le domande e risposte crittografate
    await setDoc(doc(securityQuestionsCollection, 'admin'), {
      questions,
      encryptedAnswers,
      createdAt: Timestamp.now(),
      lastUpdated: Timestamp.now()
    });
    
    logSecurityEvent(SecurityEventType.ADMIN_ACCESS, 'admin', 'Security questions configured');
  } catch (error) {
    console.error('Errore durante il salvataggio delle domande di sicurezza:', error);
    throw error;
  }
};

export const getSecurityQuestions = async (): Promise<{ questions: string[], hasQuestions: boolean }> => {
  try {
    console.log('DEBUG - getSecurityQuestions called');
    console.log('DEBUG - COLLECTIONS.SECURITY_QUESTIONS:', COLLECTIONS.SECURITY_QUESTIONS);
    
    const securityQuestionsDoc = doc(db, COLLECTIONS.SECURITY_QUESTIONS, 'admin');
    console.log('DEBUG - Document path:', `${COLLECTIONS.SECURITY_QUESTIONS}/admin`);
    
    const docSnapshot = await getDoc(securityQuestionsDoc);
    console.log('DEBUG - Document exists:', docSnapshot.exists());
    
    if (docSnapshot.exists()) {
      const data = docSnapshot.data();
      console.log('DEBUG - Document data:', data);
      return {
        questions: data.questions || [],
        hasQuestions: true
      };
    } else {
      console.log('DEBUG - Document does not exist, returning default questions');
      // Domande di default se non configurate
      return {
        questions: [
          'Qual è il nome della tua prima azienda?',
          'In che città sei nato/a?',
          'Qual è il nome del tuo primo animale domestico?'
        ],
        hasQuestions: false
      };
    }
  } catch (error) {
    console.error('Errore durante il recupero delle domande di sicurezza:', error);
    return {
      questions: [
        'Qual è il nome della tua prima azienda?',
        'In che città sei nato/a?',
        'Qual è il nome del tuo primo animale domestico?'
      ],
      hasQuestions: false
    };
  }
};

export const verifySecurityAnswers = async (answers: string[]): Promise<boolean> => {
  try {
    const securityQuestionsDoc = doc(db, COLLECTIONS.SECURITY_QUESTIONS, 'admin');
    const docSnapshot = await getDoc(securityQuestionsDoc);
    
    if (!docSnapshot.exists()) {
      // Se non ci sono domande configurate, usa le risposte di default per compatibilità
      const defaultAnswers = ['freetosmoke', 'roma', 'buddy'];
      return answers.every((answer, index) => 
        answer.toLowerCase().trim() === defaultAnswers[index]
      );
    }
    
    const data = docSnapshot.data();
    const encryptedAnswers = data.encryptedAnswers || [];
    
    // Verifica ogni risposta
    for (let i = 0; i < answers.length; i++) {
      if (i >= encryptedAnswers.length) return false;
      
      try {
        const decryptedAnswer = CryptoJS.AES.decrypt(encryptedAnswers[i], 'security-key-2024').toString(CryptoJS.enc.Utf8);
        if (answers[i].toLowerCase().trim() !== decryptedAnswer) {
          return false;
        }
      } catch (decryptError) {
        console.error('Errore durante la decrittazione:', decryptError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Errore durante la verifica delle risposte di sicurezza:', error);
    return false;
  }
};

// Funzione per validare la sessione utente
export const validateUserSession = async (): Promise<boolean> => {
  try {
    // Verifica se c'è un utente autenticato
    if (!auth.currentUser) {
      return false;
    }
    
    // Verifica se il token è ancora valido
    const token = await auth.currentUser.getIdToken(true); // force refresh
    
    if (!token) {
      return false;
    }
    
    // Verifica se l'utente esiste ancora nel database
    const userId = auth.currentUser.uid;
    const userRef = doc(db, COLLECTIONS.CUSTOMERS, userId);
    const userDoc = await getDoc(userRef);
    
    return userDoc.exists();
  } catch (error) {
    console.error('Errore durante la validazione della sessione:', error);
    return false;
  }
};

// Funzioni per la gestione del codice segreto
export const getSecretCode = async (): Promise<string> => {
  try {
    const secretCodeRef = doc(db, COLLECTIONS.SETTINGS, 'secret_code');
    const secretCodeDoc = await getDoc(secretCodeRef);
    
    if (secretCodeDoc.exists()) {
      const data = secretCodeDoc.data();
      return data.code || 'FTS2025'; // Fallback al codice di default
    }
    
    // Se non esiste, restituisce il codice di default
    return 'FTS2025';
  } catch (error) {
    console.error('Errore durante il recupero del codice segreto:', error);
    return 'FTS2025'; // Fallback in caso di errore
  }
};

export const setSecretCode = async (newCode: string): Promise<void> => {
  try {
    // Validazione del codice
    if (!newCode || newCode.trim().length < 4) {
      throw new Error('Il codice segreto deve essere di almeno 4 caratteri');
    }
    
    const secretCodeRef = doc(db, COLLECTIONS.SETTINGS, 'secret_code');
    await setDoc(secretCodeRef, {
      code: newCode.trim(),
      lastUpdated: Timestamp.now(),
      updatedBy: 'admin'
    });
    
    // Registra l'evento di sicurezza
    logSecurityEvent(SecurityEventType.ADMIN_ACCESS, 'admin', 'Codice segreto aggiornato');
  } catch (error) {
    console.error('Errore durante l\'aggiornamento del codice segreto:', error);
    throw error;
  }
};

export default {
  app,
  db,
  auth,
  storage,
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  findCustomerByPhone,
  findCustomerByEmail,
  getPrizes,
  savePrizes,
  addPrize,
  updatePrize,
  getNotifications,
  saveNotifications,
  getNotificationHistory,
  addNotificationToHistory,
  getTransactions,
  addTransaction,
  loginAdmin,
  logoutAdmin,
  isAdminLoggedIn,
  setupAdminAccount,
  changeAdminPassword,
  setAdminLoginBlocked,
  getAdminLoginBlocked,
  setUserLoginBlocked,
  getUserLoginBlocked,
  checkAdminExists,
  resetAdminCompletely,
  updateAdminPassword,
  setAuthToken,
  getAuthToken,
  removeAuthToken,
  setAdminToken,
  getAdminToken,
  removeAdminToken,
  getRateLimitAttempts,
  setRateLimitAttempts,
  resetRateLimit,
  getSecurityLogs,
  clearSecurityLogs,
  saveSecurityQuestions,
  getSecurityQuestions,
  verifySecurityAnswers,
  setAdminAuth,
  getAdminAuth,
  getAdminCredentials,
  setAdminCredentials,
  validateAdminCredentials,
  getSecretCode,
  setSecretCode,
  validateUserSession
};