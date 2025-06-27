import { Customer, Prize, Notification, PointTransaction } from '../types';
import * as firebaseService from './firebase';

// Dati di esempio per testare la migrazione
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
    isActive: true,
    createdAt: new Date().toISOString()
  }
];

const sampleTransactions: PointTransaction[] = [
  {
    id: '1',
    customerId: '1',
    type: 'add',
    points: 50,
    description: 'Acquisto prodotti',
    timestamp: new Date().toISOString()
  },
  {
    id: '2',
    customerId: '1',
    type: 'add',
    points: 100,
    description: 'Bonus registrazione',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    customerId: '2',
    type: 'add',
    points: 75,
    description: 'Acquisto prodotti',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  }
];

export const initializeSampleData = async (): Promise<void> => {
  console.log('Inizializzazione dati di esempio...');
  
  try {
    // Salva i dati di esempio in Firebase
    for (const customer of sampleCustomers) {
      await firebaseService.addCustomer(customer);
    }
    
    await firebaseService.savePrizes(samplePrizes);
    await firebaseService.saveNotifications(sampleNotifications);
    
    // Aggiungi le transazioni
    for (const transaction of sampleTransactions) {
      await firebaseService.addTransaction(transaction);
    }
    
    console.log('Dati di esempio inizializzati con successo!');
    console.log(`- ${sampleCustomers.length} clienti`);
    console.log(`- ${samplePrizes.length} premi`);
    console.log(`- ${sampleNotifications.length} notifiche`);
    console.log(`- ${sampleTransactions.length} transazioni`);
  } catch (error) {
    console.error('Errore durante l\'inizializzazione dei dati di esempio:', error);
    throw error;
  }
};