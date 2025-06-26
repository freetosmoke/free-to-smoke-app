import React, { useState, useEffect } from 'react';
import { ArrowLeft, Phone, Shield, Lock, Eye, EyeOff, X } from 'lucide-react';
import * as firebaseService from '../utils/firebase';
import Toast from './Toast';
import { sanitizeInput } from '../utils/security';
import { generateCsrfToken, validateCsrfToken, setupSecurityProtections, rateLimiter } from '../utils/security';
import { authenticateCustomer, isAuthenticated } from '../utils/auth';
import { logSecurityEvent } from '../utils/securityLogger';
import { SecurityEventType } from '../types';

interface LoginProps {
  onNavigate: (page: string, data?: unknown) => void;
}

const Login: React.FC<LoginProps> = ({ onNavigate }) => {
  const [phone, setPhone] = useState('+39 ');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error', isVisible: boolean}>({ message: '', type: 'success', isVisible: false });
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState<number>(0);
  
  // Stati per il recupero password
  const [showPasswordRecovery, setShowPasswordRecovery] = useState(false);
  const [recoveryForm, setRecoveryForm] = useState({
    email: '',
    securityAnswers: ['', '', '']
  });
  const [recoveryStep, setRecoveryStep] = useState<'questions' | 'newPassword'>('questions');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [securityQuestions, setSecurityQuestions] = useState<string[]>([]);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPasswordForm, setNewPasswordForm] = useState({
    password: '',
    confirmPassword: ''
  });
  
  // Imposta le protezioni di sicurezza e genera un token CSRF all'avvio
  useEffect(() => {
    const checkAuth = async () => {
      // Reindirizza se l'utente è già autenticato
      const authenticated = await isAuthenticated();
      if (authenticated) {
        onNavigate('profile');
        return;
      }
    };
    
    checkAuth();
    
    // Imposta le protezioni di sicurezza
    setupSecurityProtections();
    
    // Genera un nuovo token CSRF
    const token = generateCsrfToken();
    setCsrfToken(token);
    
    // Carica le domande di sicurezza
    loadSecurityQuestions();
    
    // Controlla se l'utente è bloccato a causa di troppi tentativi
    const checkLoginBlock = async () => {
      const blockedUntil = await firebaseService.getUserLoginBlocked('generic');
      if (blockedUntil && blockedUntil > Date.now()) {
        setIsBlocked(true);
        const remainingTime = Math.ceil((blockedUntil - Date.now()) / 1000);
        setBlockTimeRemaining(remainingTime);
        
        // Aggiorna il contatore ogni secondo
        const timer = setInterval(() => {
          setBlockTimeRemaining(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setIsBlocked(false);
              // Rimuovi il blocco in Firebase
              firebaseService.setUserLoginBlocked('generic', null);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(timer);
      }
    };
    
    checkLoginBlock();
  }, [onNavigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica se l'utente è bloccato
    if (isBlocked) {
      setToast({
        message: `Troppi tentativi falliti. Riprova tra ${blockTimeRemaining} secondi.`,
        type: "error",
        isVisible: true
      });
      return;
    }
    
    // Verifica il token CSRF
    if (!validateCsrfToken(csrfToken)) {
      setToast({
        message: "Errore di sicurezza. Ricarica la pagina e riprova.",
        type: "error",
        isVisible: true
      });
      logSecurityEvent(SecurityEventType.CSRF_ATTACK, "unknown", "Tentativo di login con token CSRF non valido");
      return;
    }
    
    // Verifica il rate limiting
    if (!rateLimiter("login", 5)) { // Massimo 5 richieste in un minuto
      setToast({
        message: "Troppe richieste. Riprova tra qualche minuto.",
        type: "error",
        isVisible: true
      });
      return;
    }
    
    if (!phone.trim()) {
      setToast({
        message: "Inserisci il numero di cellulare",
        type: "error",
        isVisible: true
      });
      return;
    }

    // Sanitizza l'input
    const sanitizedPhone = sanitizeInput(phone.trim());
    
    try {
      const customer = await firebaseService.findCustomerByPhone(sanitizedPhone);
    
      if (customer) {
        try {
          // Genera un token di autenticazione e lo salva
          const token = await authenticateCustomer(customer);
          if (!token) {
            throw new Error("Errore durante la generazione del token");
          }
          
          // Salva l'ID utente nella sessionStorage
          sessionStorage.setItem('current_user_id', customer.id);
          
          // Registra il login riuscito
          logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, customer.id);
          
          // Reset dei tentativi di login
          setLoginAttempts(0);
          // Rimuovi il blocco in Firebase
          await firebaseService.setUserLoginBlocked("generic", null);
          
          setToast({
            message: `Benvenuto ${customer.firstName}!`,
            type: "success",
            isVisible: true
          });
          
          setTimeout(() => {
            onNavigate("profile", customer);
          }, 1500);
        } catch (error) {
          console.error("Errore durante il login:", error);
          setToast({
            message: "Errore durante il login. Riprova più tardi.",
            type: "error",
            isVisible: true
          });
          logSecurityEvent(SecurityEventType.LOGIN_FAILURE, "unknown", "Errore durante la generazione del token");
        }
      } else {
        // Incrementa i tentativi falliti
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Blocca l'utente dopo 5 tentativi falliti
        if (newAttempts >= 5) {
          const blockUntil = Date.now() + (2 * 60 * 1000); // 2 minuti di blocco
          // Salva il blocco in Firebase invece che in localStorage
          await firebaseService.setUserLoginBlocked("generic", blockUntil);
          setIsBlocked(true);
          setBlockTimeRemaining(120); // 2 minuti in secondi
          setToast({
            message: "Troppi tentativi falliti. Account bloccato per 2 minuti.",
            type: "error",
            isVisible: true
          });
          
          // Registra il blocco dell'account
          logSecurityEvent(SecurityEventType.ACCOUNT_BLOCKED, "unknown", `Blocco temporaneo dopo ${newAttempts} tentativi falliti`);
        } else {
          setToast({
            message: `Numero non trovato. Registrati prima di accedere. Tentativi rimanenti: ${5 - newAttempts}`,
            type: "error",
            isVisible: true
          });
          
          // Registra il tentativo fallito
          logSecurityEvent(SecurityEventType.LOGIN_FAILURE, "unknown", `Tentativo fallito per il numero: ${sanitizedPhone}`);
        }
      }
    } catch (error) {
      console.error("Errore durante la ricerca del cliente:", error);
      setToast({
        message: "Errore durante la verifica del numero. Riprova più tardi.",
        type: "error",
        isVisible: true
      });
      logSecurityEvent(SecurityEventType.LOGIN_FAILURE, "unknown", "Errore durante la ricerca del cliente");
    }
  };

  // Funzioni per il recupero password
  const loadSecurityQuestions = async () => {
    console.log('DEBUG - loadSecurityQuestions called');
    try {
      const { questions, hasQuestions } = await firebaseService.getSecurityQuestions();
      console.log('DEBUG - getSecurityQuestions result:', { questions, hasQuestions });
      setSecurityQuestions(questions);
    } catch (error) {
      console.error('Errore nel caricamento delle domande di sicurezza:', error);
    }
  };

  const handlePasswordRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (recoveryStep === 'questions') {
        if (currentQuestionIndex < securityQuestions.length - 1) {
          // Passa alla prossima domanda
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setToast({
            message: `Domanda ${currentQuestionIndex + 2} di ${securityQuestions.length}`,
            type: 'success',
            isVisible: true
          });
        } else {
          // Tutte le domande sono state risposte, verifica le risposte
          const isAnswersValid = await firebaseService.verifySecurityAnswers(recoveryForm.securityAnswers);
          
          if (isAnswersValid) {
            setRecoveryStep('newPassword');
            setToast({
              message: 'Risposte verificate! Ora puoi impostare una nuova password.',
              type: 'success',
              isVisible: true
            });
            
            // Reset dell'indice delle domande
            setCurrentQuestionIndex(0);
          } else {
            setToast({
              message: 'Le risposte fornite non sono corrette. Riprova.',
              type: 'error',
              isVisible: true
            });
            
            // Reset del form per riprovare
            setRecoveryForm({
              email: '',
              securityAnswers: Array(securityQuestions.length).fill('')
            });
            setCurrentQuestionIndex(0);
          }
        }
      } else if (recoveryStep === 'newPassword') {
        // Verifica che le password coincidano
        if (newPasswordForm.password !== newPasswordForm.confirmPassword) {
          setToast({
            message: 'Le password non coincidono',
            type: 'error',
            isVisible: true
          });
          return;
        }
        
        if (newPasswordForm.password.length < 6) {
          setToast({
            message: 'La password deve essere di almeno 6 caratteri',
            type: 'error',
            isVisible: true
          });
          return;
        }
        
        // Aggiorna la password dell'admin
        await firebaseService.updateAdminPassword('admin@freetosmoke.com', newPasswordForm.password);
        
        setToast({
          message: 'Password aggiornata con successo!',
          type: 'success',
          isVisible: true
        });
        
        // Chiudi il modal e resetta tutto
        setShowPasswordRecovery(false);
        setRecoveryStep('questions');
        setCurrentQuestionIndex(0);
        setRecoveryForm({ email: '', securityAnswers: ['', '', ''] });
        setNewPasswordForm({ password: '', confirmPassword: '' });
      }
    } catch (error) {
      console.error('Errore durante il recupero password:', error);
      setToast({
        message: 'Errore durante il recupero password',
        type: 'error',
        isVisible: true
      });
    }
  };

  const closePasswordRecovery = () => {
    setShowPasswordRecovery(false);
    setRecoveryStep('questions');
    setCurrentQuestionIndex(0);
    setRecoveryForm({ email: '', securityAnswers: ['', '', ''] });
    setNewPasswordForm({ password: '', confirmPassword: '' });
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
          onClick={() => onNavigate('home', null)}
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

          <div className="text-center mt-6 space-y-3">
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
      
      {/* Modal per il recupero password */}
      {showPasswordRecovery && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {recoveryStep === 'questions' && 'Recupera Password Admin'}
                {recoveryStep === 'newPassword' && 'Nuova Password'}
              </h3>
              <button
                onClick={closePasswordRecovery}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handlePasswordRecovery} className="space-y-4">
              {recoveryStep === 'questions' && (
                <div>
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-300 text-sm font-medium">
                        Domanda {currentQuestionIndex + 1} di {securityQuestions.length}
                      </span>
                      <div className="flex space-x-1">
                        {securityQuestions.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full ${
                              index <= currentQuestionIndex ? 'bg-blue-500' : 'bg-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-1.5 mb-4">
                      <div 
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${((currentQuestionIndex + 1) / securityQuestions.length) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    {securityQuestions[currentQuestionIndex]}
                  </label>
                  <input
                    type="text"
                    value={recoveryForm.securityAnswers[currentQuestionIndex]}
                    onChange={(e) => {
                      const newAnswers = [...recoveryForm.securityAnswers];
                      newAnswers[currentQuestionIndex] = e.target.value;
                      setRecoveryForm(prev => ({ ...prev, securityAnswers: newAnswers }));
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Inserisci la tua risposta"
                    required
                  />
                  
                  <div className="flex justify-between mt-6">
                    {currentQuestionIndex > 0 && (
                      <button
                        type="button"
                        onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                        className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                      >
                        ← Precedente
                      </button>
                    )}
                    
                    <div className="ml-auto">
                      {currentQuestionIndex < securityQuestions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                          disabled={!recoveryForm.securityAnswers[currentQuestionIndex]}
                        >
                          Successiva →
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors"
                          disabled={!recoveryForm.securityAnswers[currentQuestionIndex]}
                        >
                          Verifica Risposte
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {recoveryStep === 'newPassword' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Nuova Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPasswordForm.password}
                        onChange={(e) => setNewPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Inserisci la nuova password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Conferma Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={newPasswordForm.confirmPassword}
                        onChange={(e) => setNewPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Conferma la nuova password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors mt-6"
                    disabled={!newPasswordForm.password || !newPasswordForm.confirmPassword}
                  >
                    Aggiorna Password
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;