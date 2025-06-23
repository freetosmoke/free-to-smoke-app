import React from 'react';
import { useState, useEffect } from 'react';
import { UserPlus, LogIn, Shield, Instagram, Award, Gift, TrendingUp } from 'lucide-react';
import { Customer } from '../types';
import { getCustomers } from '../utils/storage';
import { LEVEL_CONFIGS, getUserLevel, getNextLevel, getPointsToNextLevel } from '../utils/levels';
import { setupSecurityProtections } from '../utils/security';
import { isAuthenticated, getCurrentUserId, logout } from '../utils/auth';
import { logSecurityEvent, SecurityEventType } from '../utils/securityLogger';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [loggedInCustomer, setLoggedInCustomer] = useState<Customer | null>(null);
  
  useEffect(() => {
    // Imposta le protezioni di sicurezza
    setupSecurityProtections();
    
    // Controlla se c'è un utente loggato usando il sistema di autenticazione sicuro
    if (isAuthenticated()) {
      const userId = getCurrentUserId();
      if (userId) {
        try {
          const customers = getCustomers();
          const customer = customers.find(c => c.id === userId);
          if (customer) {
            setLoggedInCustomer(customer);
            // Registra l'accesso alla home page
            logSecurityEvent(SecurityEventType.PAGE_ACCESS, userId, 'Accesso alla home page');
          } else {
            // Se l'utente non esiste più, effettua il logout
            logout();
          }
        } catch (error) {
          console.error('Errore durante il recupero dei dati cliente:', error);
          // In caso di errore, effettua il logout per sicurezza
          logout();
        }
      }
    }
  }, []);
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Logo and Title with Action Buttons */}
      <div className="flex flex-col items-center justify-center pt-4 pb-2">
        <img src="/Logo senza sfondo Free to smoke.png" alt="Free To Smoke Logo" className="h-40 mb-0" />
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
              onClick={() => {
                logout();
                setLoggedInCustomer(null);
                logSecurityEvent(SecurityEventType.LOGOUT, loggedInCustomer.id, 'Logout dalla home page');
                // Forza il refresh della pagina per assicurarsi che tutti i dati sensibili vengano rimossi
                window.location.reload();
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
                
                {/* Premi Infiniti */}
                <div className="bg-gradient-to-br from-gray-700/40 to-gray-800/40 rounded-xl p-4 shadow-md">
                  <h3 className="text-white text-lg font-semibold mb-3 flex items-center justify-center">
                    <Gift className="w-5 h-5 mr-2 text-green-400" />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-400">Premi Infiniti</span>
                  </h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Più punti accumuli, più premi esclusivi potrai sbloccare!
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-900/30 rounded-lg p-2 transform transition-all duration-200 hover:scale-105 border border-blue-900/30">
                      <p className="text-blue-300 text-sm font-semibold text-center">Accessori</p>
                    </div>
                    <div className="bg-green-900/30 rounded-lg p-2 transform transition-all duration-200 hover:scale-105 border border-green-900/30">
                      <p className="text-green-300 text-sm font-semibold text-center">Sconti</p>
                    </div>
                    <div className="bg-purple-900/30 rounded-lg p-2 transform transition-all duration-200 hover:scale-105 border border-purple-900/30">
                      <p className="text-purple-300 text-sm font-semibold text-center">Prodotti</p>
                    </div>
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
      
      {/* Footer - Migliorato con accesso admin */}
      <div className="text-center mt-8 pb-6 bg-gradient-to-t from-black/30 to-transparent pt-4">
        <p className="text-gray-400 text-sm font-medium">© 2025 Free To Smoke - Fidelity Card</p>
        <div className="flex flex-col items-center mt-2">
          <button
            onClick={() => {
              onNavigate('admin');
              logSecurityEvent(SecurityEventType.ADMIN_ACCESS_ATTEMPT, 'unknown', 'Tentativo di accesso all\'area admin dalla home page');
            }}
            className="text-gray-500 hover:text-gray-300 text-xs flex items-center justify-center mt-3 transition-colors duration-300 bg-transparent"
          >
            <Shield className="w-3 h-3 mr-1 opacity-70" />
            <span>Area Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;