import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, Shield } from 'lucide-react';
import { findCustomerByPhone } from '../utils/storage';
import Toast from './Toast';
import { sanitizeInput } from '../utils/security';
import { generateCsrfToken, validateCsrfToken, setupSecurityProtections, rateLimiter } from '../utils/security';
import { authenticateCustomer, isAuthenticated } from '../utils/auth';
import { logSecurityEvent, SecurityEventType } from '../utils/securityLogger';

interface LoginProps {
  onNavigate: (page: string, data?: unknown) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [phone, setPhone] = useState('+39 ');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error', isVisible: boolean}>({    message: '', type: 'success', isVisible: false
  });
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState<number>(0);
  
  // Imposta le protezioni di sicurezza e genera un token CSRF all'avvio
  useEffect(() => {
    // Reindirizza se l'utente è già autenticato
    if (isAuthenticated()) {
      onNavigate('profile');
      return;
    }
    
    // Imposta le protezioni di sicurezza
    setupSecurityProtections();
    
    // Genera un nuovo token CSRF
    const token = generateCsrfToken();
    setCsrfToken(token);
    
    // Controlla se l'utente è bloccato a causa di troppi tentativi
    const blockedUntil = localStorage.getItem('login_blocked_until');
    if (blockedUntil) {
      const blockTime = parseInt(blockedUntil);
      if (blockTime > Date.now()) {
        setIsBlocked(true);
        const remainingTime = Math.ceil((blockTime - Date.now()) / 1000);
        setBlockTimeRemaining(remainingTime);
        
        // Aggiorna il contatore ogni secondo
        const timer = setInterval(() => {
          setBlockTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setIsBlocked(false);
              localStorage.removeItem('login_blocked_until');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(timer);
      } else {
        localStorage.removeItem('login_blocked_until');
      }
    }
  }, [onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica se l'utente è bloccato
    if (isBlocked) {
      setToast({
        message: `Troppi tentativi falliti. Riprova tra ${blockTimeRemaining} secondi.`,
        type: 'error',
        isVisible: true
      });
      return;
    }
    
    // Verifica il token CSRF
    if (!validateCsrfToken(csrfToken)) {
      setToast({
        message: "Errore di sicurezza. Ricarica la pagina e riprova.",
        type: 'error',
        isVisible: true
      });
      logSecurityEvent(SecurityEventType.CSRF_ATTACK, 'unknown', 'Tentativo di login con token CSRF non valido');
      return;
    }
    
    // Verifica il rate limiting
    if (!rateLimiter('login', 5)) { // Massimo 5 richieste in un minuto
      setToast({
        message: "Troppe richieste. Riprova tra qualche minuto.",
        type: 'error',
        isVisible: true
      });
      return;
    }
    
    if (!phone.trim()) {
      setToast({
        message: 'Inserisci il numero di cellulare',
        type: 'error',
        isVisible: true
      });
      return;
    }

    // Sanitizza l'input
    const sanitizedPhone = sanitizeInput(phone.trim());
    const customer = findCustomerByPhone(sanitizedPhone);
    
    if (customer) {
      try {
        // Genera un token di autenticazione e lo salva
        const token = await authenticateCustomer(customer);
        if (!token) {
          throw new Error('Errore durante la generazione del token');
        }
        
        // Registra il login riuscito
        logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, customer.id);
        
        // Reset dei tentativi di login
        setLoginAttempts(0);
        localStorage.removeItem('login_blocked_until');
        
        setToast({
          message: `Benvenuto ${customer.firstName}!`,
          type: 'success',
          isVisible: true
        });
        
        setTimeout(() => {
          onNavigate('profile', customer);
        }, 1500);
      } catch (error) {
        console.error('Errore durante il login:', error);
        setToast({
          message: "Errore durante il login. Riprova più tardi.",
          type: 'error',
          isVisible: true
        });
        logSecurityEvent(SecurityEventType.LOGIN_FAILURE, 'unknown', 'Errore durante la generazione del token');
      }
    } else {
      // Incrementa i tentativi falliti
      const newAttempts = loginAttempts + 1;
      setLoginAttempts(newAttempts);
      
      // Blocca l'utente dopo 5 tentativi falliti
      if (newAttempts >= 5) {
        const blockUntil = Date.now() + (2 * 60 * 1000); // 2 minuti di blocco
        localStorage.setItem('login_blocked_until', blockUntil.toString());
        setIsBlocked(true);
        setBlockTimeRemaining(120); // 2 minuti in secondi
        setToast({
          message: "Troppi tentativi falliti. Account bloccato per 2 minuti.",
          type: 'error',
          isVisible: true
        });
        
        // Registra il blocco dell'account
        logSecurityEvent(SecurityEventType.ACCOUNT_BLOCKED, 'unknown', `Blocco temporaneo dopo ${newAttempts} tentativi falliti`);
      } else {
        setToast({
          message: `Numero non trovato. Registrati prima di accedere. Tentativi rimanenti: ${5 - newAttempts}`,
          type: 'error',
          isVisible: true
        });
        
        // Registra il tentativo fallito
        logSecurityEvent(SecurityEventType.LOGIN_FAILURE, 'unknown', `Tentativo fallito per il numero: ${sanitizedPhone}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* Header */}
      <div className="flex items-center p-6">
        <button
          onClick={() => onNavigate('home')}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center ml-4">
          <img src="/Logo senza sfondo Free to smoke.png" alt="Free to Smoke Logo" className="h-14 mr-3" />
          <h1 className="text-xl font-semibold text-white">Accedi</h1>
        </div>
      </div>

      {/* Login Form */}
      <div className="max-w-md mx-auto px-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center overflow-visible">
              <img src="/Logo senza sfondo Free to smoke.png" alt="Free to Smoke Logo" className="w-full h-full object-contain p-0 scale-[1.8]" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Benvenuto!</h2>
            <p className="text-gray-300">Inserisci il tuo numero per accedere</p>
          </div>

          {isBlocked ? (
            <div className="p-4 mb-4 text-sm text-red-500 bg-red-900/30 rounded-lg flex items-center">
              <Shield className="w-5 h-5 mr-2 text-red-500" />
              <div>
                <p className="font-medium">Troppi tentativi di accesso falliti.</p>
                <p>Riprova tra {blockTimeRemaining} secondi.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Campo nascosto per il token CSRF */}
              <input type="hidden" name="csrf_token" value={csrfToken} />
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Numero di cellulare
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <div className="w-full overflow-visible">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => {
                      const input = e.target.value;
                      
                      // Se l'utente tenta di cancellare completamente, mantieni almeno il prefisso
                      if (input === '') {
                        setPhone('+39 ');
                        return;
                      }
                      
                      // Se l'utente tenta di modificare o rimuovere il prefisso
                      if (!input.startsWith('+39')) {
                        // Estrai solo le cifre dall'input
                        const digits = input.replace(/\D/g, '');
                        // Limita a 10 cifre
                        const limitedDigits = digits.substring(0, 10);
                        // Formatta con il prefisso
                        setPhone('+39 ' + limitedDigits);
                      } else {
                        // Gestisci normalmente l'input che mantiene il prefisso
                        // Estrai le cifre dopo il prefisso +39
                        const prefixRemoved = input.substring(3); // Rimuovi '+39'
                        const digits = prefixRemoved.replace(/\D/g, '');
                        // Limita a 10 cifre
                        const limitedDigits = digits.substring(0, 10);
                        // Formatta con il prefisso
                        setPhone('+39 ' + limitedDigits);
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 text-base font-medium text-lg"
                    placeholder="+39 123 456 7890"
                    autoFocus
                    maxLength={14} // +39 + 10 cifre + eventuali spazi
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
            >
              Accedi
            </button>
          </form>
          )}

          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Non hai ancora un account?{' '}
              <button
                onClick={() => onNavigate('register')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Registrati
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;