import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import * as firebaseService from '../utils/firebase';
import Toast from './Toast';
import { sanitizeInput } from '../utils/security';
import { generateCsrfToken, validateCsrfToken, setupSecurityProtections, rateLimiter } from '../utils/security';
import { authenticateAdmin, isAdmin } from '../utils/auth';
import { logSecurityEvent } from '../utils/securityLogger';
import { SecurityEventType } from '../types';
// Rimosso import da storage.ts - ora utilizziamo solo Firebase

interface AdminLoginProps {
  onNavigate: (page: string, data?: unknown) => void;
}

const AdminLogin: React.FC<AdminLoginProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error', isVisible: boolean}>({ message: '', type: 'success', isVisible: false });
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState<number>(0);
  
  // Imposta le protezioni di sicurezza e genera un token CSRF all'avvio
  useEffect(() => {
    const checkAuth = async () => {
      // Reindirizza se l'utente è già autenticato come admin
      const authenticated = await isAdmin();
      if (authenticated) {
        onNavigate('admin');
        return;
      }
    };
    
    checkAuth();
    
    // Imposta le protezioni di sicurezza
    setupSecurityProtections();
    
    // Genera un nuovo token CSRF
    const token = generateCsrfToken();
    setCsrfToken(token);
    
    // Controlla se l'admin è bloccato a causa di troppi tentativi
    const checkLoginBlock = async () => {
      const blockedUntil = await firebaseService.getAdminLoginBlocked();
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
              firebaseService.setAdminLoginBlocked(null);
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
    
    // Verifica se l'admin è bloccato
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
      logSecurityEvent(SecurityEventType.CSRF_ATTACK, "unknown", "Tentativo di login admin con token CSRF non valido");
      return;
    }
    
    // Verifica il rate limiting
    if (!rateLimiter("admin_login", 5)) { // Massimo 5 richieste in un minuto
      setToast({
        message: "Troppe richieste. Riprova tra qualche minuto.",
        type: "error",
        isVisible: true
      });
      return;
    }
    
    if (!email.trim() || !password.trim()) {
      setToast({
        message: "Inserisci email e password",
        type: "error",
        isVisible: true
      });
      return;
    }

    // Sanitizza l'input
    const sanitizedEmail = sanitizeInput(email.trim());
    const sanitizedPassword = sanitizeInput(password.trim());
    
    try {
      // Tenta il login admin
      const success = await firebaseService.loginAdmin(sanitizedEmail, sanitizedPassword);
    
      if (success) {
        try {
          // Genera un token di autenticazione e lo salva
          const token = await authenticateAdmin('admin');
          if (!token) {
            throw new Error("Errore durante la generazione del token");
          }
          
          // Salva l'ID admin nella sessionStorage
          sessionStorage.setItem('current_admin_id', 'admin');
          
          // Imposta lo stato di autenticazione admin
          await firebaseService.setAdminAuth(true);
          
          // Registra il login riuscito
          logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, 'admin');
          
          // Reset dei tentativi di login
          setLoginAttempts(0);
          // Rimuovi il blocco in Firebase
          await firebaseService.setAdminLoginBlocked(null);
          
          setToast({
            message: `Benvenuto Admin!`,
            type: "success",
            isVisible: true
          });
          
          setTimeout(() => {
            onNavigate("admin");
          }, 1500);
        } catch (error) {
          console.error("Errore durante il login admin:", error);
          setToast({
            message: "Errore durante il login. Riprova più tardi.",
            type: "error",
            isVisible: true
          });
          logSecurityEvent(SecurityEventType.LOGIN_FAILURE, "unknown", "Errore durante la generazione del token admin");
        }
      } else {
        // Incrementa i tentativi falliti
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Blocca l'admin dopo 5 tentativi falliti
        if (newAttempts >= 5) {
          const blockUntil = Date.now() + (2 * 60 * 1000); // 2 minuti di blocco
          // Salva il blocco in Firebase
          await firebaseService.setAdminLoginBlocked(blockUntil);
          setIsBlocked(true);
          setBlockTimeRemaining(120); // 2 minuti in secondi
          setToast({
            message: "Troppi tentativi falliti. Account bloccato per 2 minuti.",
            type: "error",
            isVisible: true
          });
          
          // Registra il blocco dell'account
          logSecurityEvent(SecurityEventType.ACCOUNT_BLOCKED, "admin", `Blocco temporaneo dopo ${newAttempts} tentativi falliti`);
        } else {
          setToast({
            message: `Credenziali non valide. Tentativi rimanenti: ${5 - newAttempts}`,
            type: "error",
            isVisible: true
          });
          
          // Registra il tentativo fallito
          logSecurityEvent(SecurityEventType.LOGIN_FAILURE, "unknown", `Tentativo fallito per l'email: ${sanitizedEmail}`);
        }
      }
    } catch (error) {
      console.error("Errore durante il login admin:", error);
      setToast({
        message: "Errore durante la verifica delle credenziali. Riprova più tardi.",
        type: "error",
        isVisible: true
      });
      logSecurityEvent(SecurityEventType.LOGIN_FAILURE, "unknown", "Errore durante il login admin");
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
          onClick={() => onNavigate('home', null)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center ml-4">
          <img src="/Logo senza sfondo Free to smoke.png" alt="Free to Smoke Logo" className="h-14 mr-3" />
          <h1 className="text-xl font-semibold text-white">Area Amministratore</h1>
        </div>
      </div>

      {/* Login Form */}
      <div className="max-w-md mx-auto px-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center overflow-visible">
              <Shield className="w-20 h-20 text-blue-500" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-2">Accesso Amministratore</h2>
            <p className="text-gray-300">Inserisci le tue credenziali per accedere</p>
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
              
              {/* Email */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@freetosmoke.com"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Password */}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
              >
                Accedi
              </button>
            </form>
          )}

          <div className="text-center mt-6 space-y-3">
            <p className="text-gray-400 text-sm">
              <button
                onClick={() => onNavigate('home', null)}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Torna alla Home
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;