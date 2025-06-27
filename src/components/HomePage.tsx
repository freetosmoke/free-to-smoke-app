import React, { useState, useEffect } from 'react';
import { UserPlus, LogIn, Award, TrendingUp, Instagram, X } from 'lucide-react';
import { Customer } from '../types';
import { LEVEL_CONFIGS, getUserLevel, getNextLevel, getPointsToNextLevel } from '../utils/levels';
import firebaseService from '../utils/firebase';
import { logSecurityEvent, SecurityEventType } from '../utils/securityLogger';

interface HomePageProps {
  onNavigate: (page: string) => void;
  loggedInCustomer: Customer | null;
  logout: () => void;
  setLoggedInCustomer: (customer: Customer | null) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate, loggedInCustomer, logout, setLoggedInCustomer }) => {
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showSecretForm, setShowSecretForm] = useState(false);
  const [secretCode, setSecretCode] = useState('');
  const [secretError, setSecretError] = useState('');
  // Rimuovi completamente qualsiasi dichiarazione di debug se presente

  // Reset del contatore dopo 3 secondi
  useEffect(() => {
    if (logoClickCount > 0) {
      const timer = setTimeout(() => {
        setLogoClickCount(0);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [logoClickCount]);

  // Gestione del triplo click sul logo
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    
    if (newCount === 3) {
      setShowSecretForm(true);
      setLogoClickCount(0);
      logSecurityEvent(SecurityEventType.ADMIN_ACCESS_ATTEMPT, 'unknown', 'Triplo click sul logo - accesso segreto tentato');
    }
  };

  // Gestione del form segreto
  const handleSecretSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (secretCode === 'FTS2025') {
      logSecurityEvent(SecurityEventType.ADMIN_ACCESS_ATTEMPT, 'unknown', 'Codice segreto corretto - accesso admin autorizzato');
      setShowSecretForm(false);
      setSecretCode('');
      setSecretError('');
      onNavigate('adminLogin');
    } else {
      setSecretError('Codice non valido');
      logSecurityEvent(SecurityEventType.ADMIN_ACCESS_ATTEMPT, 'unknown', `Codice segreto errato: ${secretCode}`);
    }
  };

  useEffect(() => {
    // Protezioni di sicurezza
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
        logSecurityEvent(SecurityEventType.SECURITY_VIOLATION, 'unknown', 'Tentativo di apertura DevTools');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      logSecurityEvent(SecurityEventType.SECURITY_VIOLATION, 'unknown', 'Tentativo di click destro');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      if (loggedInCustomer) {
        try {
          const isValid = await firebaseService.validateCustomerSession(loggedInCustomer.id);
          if (!isValid) {
            console.log('Sessione non valida, effettuo logout');
            await logout();
          }
        } catch (error) {
          console.error('Errore durante la validazione della sessione:', error);
          await logout();
        }
      }
    };
    
    checkAuth();
  }, [loggedInCustomer, logout]); // Assicurati che queste dipendenze siano presenti

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Logo and Title with Action Buttons */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2">
        <img 
          src="/Logo senza sfondo Free to smoke.png" 
          alt="Free To Smoke Logo" 
          className="h-40 mb-0 cursor-pointer transition-transform duration-200 hover:scale-105" 
          onClick={handleLogoClick}
        />
        <h1 className="text-4xl font-bold text-white mb-0 -mt-3">Free To Smoke</h1>
        <p className="text-xl text-gray-400 -mt-1">Fidelity Card</p>
        
        {/* Action Buttons - Improved styling and positioning */}
        <div className="flex space-x-5 mt-6 w-full max-w-sm">
          {loggedInCustomer ? (
            <button
              onClick={() => {
                onNavigate('profile');
                logSecurityEvent(SecurityEventType.PROFILE_ACCESS, loggedInCustomer.id, 'Accesso al profilo dalla home page');
              }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-[1.05] shadow-lg shadow-blue-900/30 border border-blue-400/20"
            >
              <UserPlus className="w-5 h-5" />
              <span>Profilo</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('register')}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-[1.05] shadow-lg shadow-blue-900/30 border border-blue-400/20"
            >
              <UserPlus className="w-5 h-5" />
              <span>Registrati</span>
            </button>
          )}

          {loggedInCustomer ? (
            <button
              onClick={async () => {
                try {
                  await firebaseService.logoutAdmin();
                  logout();
                  setLoggedInCustomer(null);
                  logSecurityEvent(SecurityEventType.LOGOUT, loggedInCustomer.id, 'Logout dalla home page');
                } catch (error) {
                  console.error('Errore durante il logout:', error);
                  setLoggedInCustomer(null);
                }
              }}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-[1.05] shadow-lg shadow-red-900/30 border border-red-400/20"
            >
              <LogIn className="w-5 h-5 transform rotate-180" />
              <span>Logout</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('login')}
              className="flex-1 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all duration-300 transform hover:scale-[1.05] shadow-lg shadow-green-900/30 border border-green-400/20"
            >
              <LogIn className="w-5 h-5" />
              <span>Accedi</span>
            </button>
          )}
        </div>
      </div>

      {/* Secret Admin Access Modal */}
      {showSecretForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Accesso Riservato</h3>
              <button
                onClick={() => {
                  setShowSecretForm(false);
                  setSecretCode('');
                  setSecretError('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSecretSubmit}>
              <input
                type="password"
                value={secretCode}
                onChange={(e) => setSecretCode(e.target.value)}
                placeholder="Inserisci il codice"
                className="w-full p-3 bg-gray-700 text-white rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {secretError && (
                <p className="text-red-400 text-sm mb-3">{secretError}</p>
              )}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Accedi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-lg mx-auto px-4 space-y-4 mt-2">
        {/* Welcome Card */}
        <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 shadow-lg shadow-black/20 text-center">
          <h2 className="text-2xl font-semibold text-white mb-2">
            {loggedInCustomer ? `Benvenuto, ${loggedInCustomer.firstName}!` : 'Benvenuto!'}
          </h2>
          
          {loggedInCustomer ? (
            <div className="mb-4">
              <div className="flex justify-center mb-3">
                {loggedInCustomer.profileImage ? (
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-500">
                    <img 
                      src={loggedInCustomer.profileImage} 
                      alt="Immagine profilo" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                    {loggedInCustomer.firstName.charAt(0)}{loggedInCustomer.lastName.charAt(0)}
                  </div>
                )}
              </div>
              <p className="text-gray-300 mb-2">
                {loggedInCustomer.firstName} {loggedInCustomer.lastName}
              </p>
              <p className="text-gray-400 text-sm mb-2">{loggedInCustomer.email}</p>
              <p className="text-gray-400 text-sm mb-3">{loggedInCustomer.phone}</p>
              
              {/* Livello utente */}
              {(() => {
                const userLevel = getUserLevel(loggedInCustomer.points);
                const nextLevel = getNextLevel(loggedInCustomer.points);
                const pointsToNext = getPointsToNextLevel(loggedInCustomer.points);
                
                return (
                  <div className="mb-3">
                    <div className={`${userLevel.bgColor} rounded-lg p-2 inline-block mb-2`}>
                      <span className={`${userLevel.color} font-semibold flex items-center`}>
                        <Award className="w-4 h-4 mr-1" />
                        Livello {userLevel.name} - {loggedInCustomer.points} punti
                      </span>
                    </div>
                    {nextLevel && (
                      <p className="text-gray-400 text-sm">
                        <TrendingUp className="w-3 h-3 inline mr-1" />
                        {pointsToNext} punti per raggiungere il livello {nextLevel.name}
                      </p>
                    )}
                  </div>
                );
              })()} 
            </div>
          ) : (
            <div>
              <p className="text-gray-300 mb-4">
                Accumula punti ad ogni acquisto e sblocca premi esclusivi
              </p>
              
              {/* Livelli di Fedeltà e Premi - Layout migliorato */}
              <div className="flex flex-col space-y-4">
                {/* Livelli di Fedeltà */}
                <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/40 rounded-xl p-4 shadow-md">
                  <h3 className="text-white text-lg font-semibold mb-3 flex items-center justify-center">
                    <Award className="w-5 h-5 mr-2 text-blue-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">4 Livelli di Fedeltà</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {LEVEL_CONFIGS.map((level, index) => (
                      <div key={index} className={`${level.bgColor} rounded-lg p-3 transform transition-all duration-200 hover:scale-105 border border-gray-700/50`}>
                        <p className={`${level.color} font-semibold text-center`}>{level.name}</p>
                        <p className="text-gray-400 text-xs text-center mt-1">
                          {level.minPoints} - {level.maxPoints === Infinity ? '∞' : level.maxPoints} punti
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="text-center mt-2">
            <span className="text-blue-400 font-semibold">1€ speso = 1 punto</span>
          </div>
        </div>

        {/* Action Buttons rimossi da qui e spostati in alto */}
      </div>

      {/* Instagram Link - Migliorato */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <a 
          href="https://www.instagram.com/freetosmokepalermo" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 text-white font-semibold py-3 px-5 rounded-xl transition-all duration-300 transform hover:scale-[1.03] shadow-lg shadow-purple-900/20"
        >
          <Instagram className="w-5 h-5 mr-2 animate-pulse-slow" />
          <span>Seguici su Instagram</span>
        </a>
      </div>
      
      {/* Footer - Senza pulsante admin */}
      <div className="text-center mt-8 pb-6 bg-gradient-to-t from-black/30 to-transparent pt-4">
        <p className="text-gray-400 text-sm font-medium">© 2025 Free To Smoke - Fidelity Card</p>
      </div>
    </div>
  );
};

export default HomePage;