import React, { useState, useEffect } from 'react';
import { initializeFirebaseData } from '../utils/initFirebaseData';

interface FirebaseInitializerProps {
  children: React.ReactNode;
}

const FirebaseInitializer: React.FC<FirebaseInitializerProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        console.log('Inizializzazione Firebase in corso...');
        
        // Aspettiamo un momento per assicurarci che Firebase sia pronto
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Inizializziamo i dati di esempio direttamente in Firebase
        await initializeFirebaseData();
        
        console.log('Firebase inizializzato con successo!');
        setIsInitialized(true);
      } catch (err) {
        console.error('Errore durante l\'inizializzazione di Firebase:', err);
        const errorMessage = err instanceof Error ? err.message : 'Errore sconosciuto';
        
        if (errorMessage.includes('Firebase non è stato inizializzato')) {
          setError('Errore di configurazione Firebase. Verifica che il progetto Firebase sia configurato correttamente.');
        } else if (errorMessage.includes('permission-denied') || errorMessage.includes('PERMISSION_DENIED')) {
          setError('Accesso negato al database Firebase. Verifica le regole di sicurezza del database.');
        } else {
          setError(`Errore durante l'inizializzazione di Firebase: ${errorMessage}`);
        }
      }
    };

    initializeFirebase();
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-red-50">
        <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md flex flex-col items-center space-y-4">
          <div className="text-xl font-medium text-red-600">Errore</div>
          <p className="text-center text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Riprova
          </button>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-md flex flex-col items-center space-y-4">
          <div className="text-xl font-medium text-blue-600">Inizializzazione</div>
          <p className="text-center text-gray-700">Inizializzazione di Firebase in corso...</p>
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default FirebaseInitializer;