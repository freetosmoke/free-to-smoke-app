import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Trophy, Gift, Bell, User, Star, Upload, Camera, Check, X, Shield } from 'lucide-react';
import { Customer, Prize, Notification, SecurityEventType } from '../types';
import { getUserLevel, getNextLevel, getPointsToNextLevel, LEVEL_CONFIGS } from '../utils/levels';
import * as firebaseService from '../utils/firebase';
import { sanitizeObject, setupSecurityProtections, generateCsrfToken, validateCsrfToken } from '../utils/security';
import { isAuthenticated, getCurrentUserId, logout } from '../utils/auth';
import { logSecurityEvent } from '../utils/securityLogger';

interface CustomerProfileProps {
  customer: Customer;
  onNavigate: (page: string) => void;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ customer, onNavigate }) => {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<Customer>(customer);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [newProfileImage, setNewProfileImage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
// Remove unused userLevel declaration since it's not used anywhere in the component
// Removed unused nextLevel declaration
// Removed unused pointsToNext declaration

  const [csrfToken, setCsrfToken] = useState<string>("");

  useEffect(() => {
    let isMounted = true;
    
    // Verifica se l'utente è autenticato
    const checkAuth = async () => {
      const authenticated = await isAuthenticated();
      if (!isMounted) return;
      
      if (!authenticated || getCurrentUserId() !== customer.id) {
        // Reindirizza alla pagina di login se non autenticato o se l'ID non corrisponde
        onNavigate('home');
        return;
      }
      
      // Continua con il caricamento dei dati solo se l'utente è autenticato
      try {
        const prizesData = await firebaseService.getPrizes();
        if (!isMounted) return;
        setPrizes(prizesData.filter((p: Prize) => p.isActive));
        
        const notificationsData = await firebaseService.getNotifications();
        if (!isMounted) return;
        setNotifications(notificationsData.filter((n: Notification) => n.isActive));
        
        // Registra l'accesso al profilo
        logSecurityEvent(SecurityEventType.PROFILE_ACCESS, customer.id, 'Accesso al profilo cliente');
      } catch (error) {
        console.error('Errore durante il caricamento dei dati:', error);
      }
    };
    
    // Imposta le protezioni di sicurezza
    setupSecurityProtections();
    
    // Genera un nuovo token CSRF
    const token = generateCsrfToken();
    setCsrfToken(token);
    
    checkAuth();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [customer.id, onNavigate]);

  // Sincronizza currentCustomer con customer quando cambia
  useEffect(() => {
    setCurrentCustomer(customer);
  }, [customer]);
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Verifica il token CSRF
    if (!validateCsrfToken(csrfToken)) {
      alert("Errore di sicurezza. Ricarica la pagina e riprova.");
      logSecurityEvent(SecurityEventType.CSRF_ATTACK, customer.id, 'Tentativo di caricamento immagine con token CSRF non valido');
      return;
    }
    
    const file = e.target.files?.[0];
    if (file) {
      // Verifica il tipo di file
      const validImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validImageTypes.includes(file.type)) {
        alert("Formato file non supportato. Utilizza JPEG, PNG, GIF o WEBP.");
        return;
      }
      
      // Verifica la dimensione del file (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("L'immagine è troppo grande. La dimensione massima è 2MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const saveProfileImage = async () => {
    // Verifica il token CSRF
    if (!validateCsrfToken(csrfToken)) {
      alert("Errore di sicurezza. Ricarica la pagina e riprova.");
      logSecurityEvent(SecurityEventType.CSRF_ATTACK, customer.id, 'Tentativo di modifica immagine profilo con token CSRF non valido');
      return;
    }
    
    try {
      // Sanitizza i dati del cliente prima dell'aggiornamento
      const sanitizedCustomer = sanitizeObject({
        ...currentCustomer,
        profileImage: newProfileImage
      });
      
      await firebaseService.updateCustomer(sanitizedCustomer);
      setCurrentCustomer(sanitizedCustomer);
      setIsEditingImage(false);
      setNewProfileImage('');
      
      // Registra la modifica dell'immagine del profilo
      logSecurityEvent(SecurityEventType.PROFILE_UPDATE, customer.id, 'Aggiornamento immagine profilo');
    } catch (error) {
      console.error('Errore durante il salvataggio dell\'immagine:', error);
      alert("Si è verificato un errore durante il salvataggio dell'immagine. Riprova più tardi.");
    }
  };
  
  const cancelImageEdit = () => {
    setIsEditingImage(false);
    setNewProfileImage('');
  };

// Removed unused availablePrizes variable since it's not used anywhere in the component

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-blue-900 p-3 sm:p-6">
      {/* Header */}
      <div className="flex items-center p-4 sticky top-0 z-10 bg-gradient-to-r from-gray-900 to-gray-800 shadow-md">
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('home')}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700/50"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <img src="/Logo senza sfondo Free to smoke.png" alt="Free to Smoke Logo" className="h-8 ml-3 mr-3" />
          <h1 className="text-xl font-semibold text-white">Profilo Cliente</h1>
        </div>
        <div className="ml-auto">
          <button
            onClick={async () => {
              try {
                await firebaseService.logoutAdmin();
                logout();
                logSecurityEvent(SecurityEventType.LOGOUT, customer.id, 'Logout cliente');
                onNavigate('home');
              } catch (error) {
                console.error('Errore durante il logout:', error);
                onNavigate('home');
              }
            }}
            className="flex items-center text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700/50"
            title="Logout"
          >
            <Shield className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-800 to-blue-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg">
          <div className="flex items-center mb-4">
            {isEditingImage ? (
              <div className="relative">
                <div className="w-20 h-20 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-blue-500">
                  <img 
                    src={newProfileImage || currentCustomer.profileImage || ''} 
                    alt="Anteprima immagine profilo"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 flex space-x-1">
                  <button
                    onClick={saveProfileImage}
                    className="bg-green-500 rounded-full p-1 text-white hover:bg-green-600 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelImageEdit}
                    className="bg-red-500 rounded-full p-1 text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div 
                  className="w-20 h-20 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-blue-500 bg-blue-600/30 flex items-center justify-center shadow-md"
                  onClick={() => setIsEditingImage(true)}
                >
                  {currentCustomer.profileImage ? (
                    <img 
                      src={currentCustomer.profileImage} 
                      alt="Immagine profilo"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 sm:w-8 sm:h-8 text-blue-400" />
                  )}
                </div>
                <button
                  onClick={() => setIsEditingImage(true)}
                  className="absolute -bottom-2 -right-2 bg-blue-500 rounded-full p-1.5 text-white hover:bg-blue-600 transition-colors shadow-md"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="ml-4">
              <h2 className="text-xl font-semibold text-white">
                Ciao {currentCustomer.firstName}!
              </h2>
              <p className="text-gray-300">Benvenuto nel tuo profilo</p>
            </div>
          </div>
          
          {isEditingImage && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-xl">
              <p className="text-gray-300 text-sm mb-3">Carica una nuova immagine profilo</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 px-4 rounded-lg transition-colors flex items-center w-full justify-center shadow-md"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Seleziona immagine
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          )}
        </div>

        {/* Customer Info */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-white mb-3">I Tuoi Dati</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-gray-700/30 p-2 rounded-lg">
              <span className="text-gray-400 text-sm block">Nome</span>
              <span className="text-white font-medium">{currentCustomer.firstName} {currentCustomer.lastName}</span>
            </div>
            <div className="bg-gray-700/30 p-2 rounded-lg">
              <span className="text-gray-400 text-sm block">Email</span>
              <span className="text-white text-sm break-all">{currentCustomer.email}</span>
            </div>
            <div className="bg-gray-700/30 p-2 rounded-lg">
              <span className="text-gray-400 text-sm block">Cellulare</span>
              <span className="text-white">{currentCustomer.phone}</span>
            </div>
            <div className="bg-gray-700/30 p-2 rounded-lg">
              <span className="text-gray-400 text-sm block">Data di nascita</span>
              <span className="text-white">{new Date(currentCustomer.birthDate).toLocaleDateString('it-IT')}</span>
            </div>
            <div className="bg-gray-700/30 p-2 rounded-lg">
              <span className="text-gray-400 text-sm block">Membro da</span>
              <span className="text-white">{new Date(currentCustomer.createdAt).toLocaleDateString('it-IT')}</span>
            </div>
          </div>
        </div>

        {/* Points Card */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -mr-10 -mt-10 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 rounded-full blur-3xl -ml-10 -mb-10 animate-pulse"></div>
          
          <div className="text-center relative z-10">
            <div className="flex items-center justify-center mb-2">
              {/* Contenitore principale con dimensione fissa */}
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* Cerchio rotante esterno */}
                <div className="absolute inset-0 w-full h-full rounded-full border border-dashed border-teal-400 animate-spin-slow"></div>
                
                {/* Contenitore dei punti */}
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-green-500/20 to-blue-500/20 flex items-center justify-center z-10">
                  <div className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent px-2 py-1 flex items-center justify-center">
                    {currentCustomer.points}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-300 mb-4 font-medium">Punti Disponibili</p>
            
            {/* Level Badge */}
            <div className={`inline-flex items-center px-5 py-2.5 rounded-full ${getUserLevel(currentCustomer.points).bgColor} border border-opacity-40 shadow-md transform hover:scale-105 transition-all duration-300`}>
              <Star className={`w-5 h-5 mr-2 ${getUserLevel(currentCustomer.points).color} animate-pulse-slow`} />
              <span className={`font-semibold ${getUserLevel(currentCustomer.points).color}`}>
                {getUserLevel(currentCustomer.points).name}
              </span>
            </div>

            {/* Progress to Next Level */}
            {getNextLevel(currentCustomer.points) && (
              <div className="mt-6 bg-gray-800/70 p-3 rounded-lg border border-gray-700/50">
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    {getNextLevel(currentCustomer.points)?.name}
                  </span>
                  <span className="font-medium text-blue-400">{getPointsToNextLevel(currentCustomer.points)} punti</span>
                </div>
                <div className="w-full bg-gray-700/70 rounded-full h-3 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500 relative overflow-hidden"
                    style={{ 
                      width: `${Math.max(10, ((currentCustomer.points - getUserLevel(currentCustomer.points).minPoints) / (getNextLevel(currentCustomer.points)!.minPoints - getUserLevel(currentCustomer.points).minPoints)) * 100)}%` 
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse-slow"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* LivelloUtente Component */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 left-0 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mt-20"></div>
          
          <div className="flex items-center mb-5 relative z-10">
            <div className="p-2 bg-blue-500/20 rounded-full mr-3">
              <Trophy className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">Livelli Utente</h3>
          </div>
          
          <div className="space-y-3 sm:space-y-4 relative z-10">
            {LEVEL_CONFIGS.map(level => {
              const isCurrentLevel = level.name === getUserLevel(currentCustomer.points).name;
              return (
                <div 
                  key={level.name} 
                  className={`p-4 rounded-lg transition-all duration-300 transform ${isCurrentLevel ? 'border-2 border-blue-500 scale-102 shadow-md shadow-blue-500/20' : 'border border-gray-700 hover:border-gray-600'} ${level.bgColor}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className={`p-1.5 rounded-full ${isCurrentLevel ? 'bg-blue-500/30' : 'bg-gray-700/50'} mr-3`}>
                        <Star className={`w-5 h-5 ${level.color} ${isCurrentLevel ? 'animate-pulse-slow' : ''}`} />
                      </div>
                      <div>
                        <span className={`font-medium text-lg ${level.color}`}>{level.name}</span>
                        {isCurrentLevel && (
                          <div className="flex items-center text-xs text-blue-400 mt-0.5">
                            <span className="inline-block w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></span>
                            Livello attuale
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-sm ${isCurrentLevel ? 'text-white' : 'text-gray-300'} font-medium`}>
                        {level.minPoints}{level.maxPoints !== Infinity ? ` - ${level.maxPoints}` : '+'} punti
                      </span>
                      {isCurrentLevel && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                            Sbloccato
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* PremiUtente Component */}
        <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden relative">
          <div className="absolute top-0 right-0 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="flex items-center mb-5 relative z-10">
            <div className="p-2 bg-yellow-500/20 rounded-full mr-3">
              <Gift className="w-5 h-5 text-yellow-400" />
            </div>
            <h3 className="text-lg font-semibold bg-gradient-to-r from-yellow-400 to-amber-300 bg-clip-text text-transparent">Premi Riscattabili</h3>
          </div>
          
          {prizes.filter(prize => currentCustomer.points >= prize.pointsRequired).length > 0 ? (
            <div className="space-y-3 sm:space-y-4 relative z-10">
              {prizes.filter(prize => currentCustomer.points >= prize.pointsRequired).map(prize => (
                <div key={prize.id} className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-4 border border-green-500/30 shadow-md hover:shadow-green-500/10 hover:border-green-400/40 transition-all duration-300 transform hover:scale-[1.01]">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                    <div className="flex-1 mb-2 sm:mb-0">
                      <div className="flex items-center">
                        <div className="p-1.5 bg-green-500/20 rounded-full mr-2">
                          <Gift className="w-4 h-4 text-green-400" />
                        </div>
                        <h4 className="font-semibold text-green-400">{prize.name}</h4>
                      </div>
                      <p className="text-gray-300 text-sm mt-2 ml-8">{prize.description}</p>
                    </div>
                    <div className="flex justify-between sm:block sm:text-right">
                      <div className="text-sm bg-gradient-to-r from-green-400 to-emerald-300 bg-clip-text text-transparent font-medium">
                        {prize.pointsRequired} punti
                      </div>
                      <div className="mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                          Disponibile
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="mt-5 bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-yellow-300 text-sm font-medium">
                  Mostra questo schermo al negozio per riscattare i premi
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-gray-700/30 to-gray-800/30 rounded-xl p-6 sm:p-8 text-center relative z-10 border border-gray-700/50">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-gray-700/50 rounded-full">
                  <Gift className="w-12 h-12 sm:w-10 sm:h-10 text-gray-500" />
                </div>
              </div>
              <p className="text-gray-300 font-medium text-lg">Nessun premio disponibile</p>
              <p className="text-gray-400 text-sm mt-2 max-w-xs mx-auto">
                Accumula più punti per sbloccare premi esclusivi
              </p>
              {prizes.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-700">
                  <p className="text-gray-300 text-sm font-medium mb-3 flex items-center justify-center">
                    <svg className="w-4 h-4 mr-1.5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Prossimo premio:
                  </p>
                  {prizes
                    .filter(prize => prize.pointsRequired > currentCustomer.points)
                    .sort((a, b) => a.pointsRequired - b.pointsRequired)
                    .slice(0, 1)
                    .map(prize => (
                      <div key={prize.id} className="bg-gray-700/50 rounded-xl p-3 border border-gray-600">
                        <h4 className="font-medium text-gray-300">{prize.name}</h4>
                        <div className="flex justify-between items-center mt-2">
                          <p className="text-gray-400 text-xs">{prize.pointsRequired - currentCustomer.points} punti mancanti</p>
                          <p className="text-gray-400 text-xs">{prize.pointsRequired} punti totali</p>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-1.5 mt-2">
                          <div 
                            className="bg-gray-500 h-1.5 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${Math.max(5, (currentCustomer.points / prize.pointsRequired) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          )}
        </div>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg overflow-hidden relative">
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mb-20"></div>
            
            <div className="flex items-center mb-5 relative z-10">
              <div className="p-2 bg-indigo-500/20 rounded-full mr-3">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-purple-300 bg-clip-text text-transparent">Notifiche</h3>
            </div>
            
            <div className="space-y-3 sm:space-y-4 relative z-10">
              {notifications.slice(0, 3).map(notification => (
                <div 
                  key={notification.id} 
                  className="bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-xl p-4 shadow-md hover:shadow-indigo-500/5 border border-gray-700 hover:border-indigo-500/20 transition-all duration-300 transform hover:scale-[1.01]"
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                      notification.type === 'promo' ? 'bg-yellow-500/20' :
                      notification.type === 'offer' ? 'bg-green-500/20' : 'bg-blue-500/20'
                    }`}>
                      <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                        notification.type === 'promo' ? 'bg-yellow-400' :
                        notification.type === 'offer' ? 'bg-green-400' : 'bg-blue-400'
                      }`}></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="font-medium text-white">{notification.title}</h4>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full ${
                          notification.type === 'promo' ? 'bg-yellow-500/20 text-yellow-300' :
                          notification.type === 'offer' ? 'bg-green-500/20 text-green-300' : 'bg-blue-500/20 text-blue-300'
                        }">
                          {notification.type === 'promo' ? 'Promo' :
                           notification.type === 'offer' ? 'Offerta' : 'Info'}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mt-1.5">{notification.message}</p>
                      <div className="flex items-center mt-2 text-xs text-gray-400">
                        <svg className="w-3.5 h-3.5 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {new Date(notification.createdAt).toLocaleDateString('it-IT')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>
    </div>
    );
};

export default CustomerProfile;