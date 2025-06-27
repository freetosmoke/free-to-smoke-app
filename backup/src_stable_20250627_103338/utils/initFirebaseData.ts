import * as firebaseService from './firebase';
import { logSecurityEvent } from './securityLogger';
import { SecurityEventType } from '../types';
import type { Customer, Prize, Notification, PointTransaction } from '../types';

// Dati di esempio per inizializzare Firebase
const sampleCustomers: Customer[] = [
  {
    id: '1',
    firstName: 'Mario',
    lastName: 'Rossi',
    email: 'mario.rossi@email.com',
    phone: '+39 123 456 7890',
    birthDate: '1990-01-15',
    points: 150,
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    firstName: 'Giulia',
    lastName: 'Bianchi',
    email: 'giulia.bianchi@email.com',
    phone: '+39 098 765 4321',
    birthDate: '1985-05-20',
    points: 75,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const samplePrizes: Prize[] = [
  {
    id: '1',
    name: 'Sconto 10%',
    description: 'Sconto del 10% su tutti i prodotti',
    pointsRequired: 100,
    isActive: true
  },
  {
    id: '2',
    name: 'Prodotto Gratuito',
    description: 'Un prodotto gratuito a scelta',
    pointsRequired: 200,
    isActive: true
  }
];

const sampleNotifications: Notification[] = [
  {
    id: '1',
    title: 'Benvenuto!',
    message: 'Benvenuto nel programma fedeltà Free to Smoke!',
    type: 'info',
    createdAt: new Date().toISOString(),
    isActive: true
  },
  {
    id: '2',
    title: 'Nuovi Premi',
    message: 'Sono disponibili nuovi premi nel catalogo!',
    type: 'promo',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true
  }
];

const sampleTransactions: PointTransaction[] = [
  {
    id: '1',
    customerId: '1',
    points: 50,
    type: 'add',
    description: 'Acquisto prodotti',
    timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    customerId: '1',
    points: 100,
    type: 'add',
    description: 'Bonus fedeltà',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    customerId: '2',
    points: 75,
    type: 'add',
    description: 'Acquisto prodotti',
    timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Funzione per inizializzare i dati di esempio in Firebase
export const initializeFirebaseData = async (): Promise<void> => {
  try {
    console.log('Inizializzazione dati di esempio in Firebase...');
    
    // Verifichiamo se ci sono già dati in Firebase
    const existingCustomers = await firebaseService.getCustomers();
    if (existingCustomers.length > 0) {
      console.log('I dati sono già presenti in Firebase, salto l\'inizializzazione');
      return;
    }
    
    // Inizializziamo i clienti
    for (const customer of sampleCustomers) {
      await firebaseService.addCustomer(customer);
    }
    console.log(`Inizializzati ${sampleCustomers.length} clienti in Firebase`);
    
    // Inizializziamo i premi
    await firebaseService.savePrizes(samplePrizes);
    console.log(`Inizializzati ${samplePrizes.length} premi in Firebase`);
    
    // Inizializziamo le notifiche
    await firebaseService.saveNotifications(sampleNotifications);
    console.log(`Inizializzate ${sampleNotifications.length} notifiche in Firebase`);
    
    // Inizializziamo le transazioni
    for (const transaction of sampleTransactions) {
      await firebaseService.addTransaction(transaction);
    }
    console.log(`Inizializzate ${sampleTransactions.length} transazioni in Firebase`);
    
    // Configuriamo l'account admin
    await firebaseService.setupAdminAccount('admin@freetosmoke.com', 'Admin123!');
    console.log('Account admin configurato in Firebase');
    
    // Registriamo l'evento di inizializzazione
    logSecurityEvent(SecurityEventType.SYSTEM_EVENT, 'system', 'Inizializzazione dati di esempio in Firebase completata');
    
    console.log('Inizializzazione dati di esempio in Firebase completata con successo');
  } catch (error) {
    console.error('Errore durante l\'inizializzazione dei dati di esempio in Firebase:', error);
    throw error;
  }
};

export default {
  initializeFirebaseData
};