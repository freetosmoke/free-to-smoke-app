import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Plus, Minus, Users, Gift, Settings, Bell, Mail, Lock, Eye, EyeOff, X, Shield, BarChart } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

// Registrazione dei componenti Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  PointElement
);
import { sanitizeInput } from '../utils/security';
import { generateCsrfToken, validateCsrfToken, setupSecurityProtections, rateLimiter } from '../utils/security';
import { validatePasswordStrength, authenticateAdmin, isAdmin, logout } from '../utils/auth';
import { logSecurityEvent, SecurityEventType } from '../utils/securityLogger';
import { Customer, Prize, Notification, NotificationHistory, PointTransaction } from '../types';
import { 
  getCustomers, 
  addCustomer,
  updateCustomer, 
  deleteCustomer,
  getPrizes, 
  savePrizes, 
  getNotifications, 
  saveNotifications,
  getNotificationHistory,
  addNotificationToHistory,
  addTransaction,
  getTransactions,

  setAdminAuth,
  validateAdminCredentials,
  setAdminCredentials,
  getAdminCredentials
} from '../utils/storage';
import { getUserLevel, LEVEL_CONFIGS } from '../utils/levels';
import Toast from './Toast';

interface AdminPanelProps {
  onNavigate: (page: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigate }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'customers' | 'add-customer' | 'prizes' | 'notifications' | 'statistics' | 'settings'>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointsInput, setPointsInput] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'surname' | 'points' | 'birthDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error', isVisible: boolean}>({
    message: '', type: 'success', isVisible: false
  });

  // Prize form state
  const [prizeForm, setPrizeForm] = useState({
    name: '',
    description: '',
    pointsRequired: '',
    isActive: true,
    requiredLevel: '0'
  });
  const [prizeImage, setPrizeImage] = useState<string>('');

  // Notification form state
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: '',
    type: 'info' as 'info' | 'promo' | 'offer',
    isActive: true
  });

  // Add Customer Form State
  const [customerForm, setCustomerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+39',
    birthDate: ''
  });

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    currentPassword: '',
    newEmail: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Stato per il token CSRF
  const [csrfToken, setCsrfToken] = useState<string>("");
  const [loginAttempts, setLoginAttempts] = useState<number>(0);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState<number>(0);

  useEffect(() => {
    // Imposta le protezioni di sicurezza
    setupSecurityProtections();
    
    // Genera un nuovo token CSRF
    const token = generateCsrfToken();
    setCsrfToken(token);
    
    // Check if admin is already authenticated
    const isAuth = isAdmin();
    setIsAuthenticated(isAuth);
    
    // Load data
    if (isAuth) {
      setCustomers(getCustomers());
      setPrizes(getPrizes());
      setNotifications(getNotifications());
    }
    
    // Controlla se l'admin è bloccato a causa di troppi tentativi
    const blockedUntil = localStorage.getItem('admin_login_blocked_until');
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
              localStorage.removeItem('admin_login_blocked_until');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        return () => clearInterval(timer);
      } else {
        localStorage.removeItem('admin_login_blocked_until');
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      setCustomers(getCustomers());
      setPrizes(getPrizes());
      setNotifications(getNotifications());
      
      // Initialize settings form with current credentials
      const credentials = getAdminCredentials();
      setSettingsForm(prev => ({
        ...prev,
        newEmail: credentials.email
      }));
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica se l'admin è bloccato
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
      logSecurityEvent(SecurityEventType.SECURITY_VIOLATION, 'admin', 'Admin login attempt with invalid CSRF token');
      return;
    }
    
    // Verifica il rate limiting
    if (!rateLimiter('admin_login', 3)) { // Massimo 3 richieste in un minuto
      setToast({ 
        message: "Troppe richieste. Riprova tra qualche minuto.", 
        type: 'error', 
        isVisible: true 
      });
      return;
    }
    
    if (!loginForm.email || !loginForm.password) {
      setToast({ message: 'Inserisci email e password', type: 'error', isVisible: true });
      return;
    }

    // Sanitizza gli input
    const sanitizedEmail = sanitizeInput(loginForm.email);
    const sanitizedPassword = loginForm.password; // Non sanitizziamo la password per non alterarla

    try {
      if (validateAdminCredentials(sanitizedEmail, sanitizedPassword)) {
        // Genera un token di autenticazione e lo salva
        const token = authenticateAdmin('admin');
        if (!token) {
          throw new Error('Errore durante la generazione del token');
        }
        
        setIsAuthenticated(true);
        setAdminAuth(true);
        
        // Reset dei tentativi di login
        setLoginAttempts(0);
        localStorage.removeItem('admin_login_blocked_until');
        
        // Registra il login riuscito
        logSecurityEvent(SecurityEventType.ADMIN_ACCESS, 'admin', 'Accesso amministratore riuscito');
        
        setToast({ message: 'Accesso effettuato', type: 'success', isVisible: true });
        
        // Carica i dati
        setCustomers(getCustomers());
        setPrizes(getPrizes());
        setNotifications(getNotifications());
        setNotificationHistory(getNotificationHistory());
      } else {
        // Incrementa i tentativi falliti
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        
        // Blocca l'admin dopo 3 tentativi falliti
        if (newAttempts >= 3) {
          const blockUntil = Date.now() + (5 * 60 * 1000); // 5 minuti di blocco
          localStorage.setItem('admin_login_blocked_until', blockUntil.toString());
          setIsBlocked(true);
          setBlockTimeRemaining(300); // 5 minuti in secondi
          setToast({ 
            message: "Troppi tentativi falliti. Account bloccato per 5 minuti.", 
            type: 'error', 
            isVisible: true 
          });
          
          // Registra il blocco dell'account
          logSecurityEvent(SecurityEventType.ACCOUNT_BLOCKED, 'admin', `Blocco temporaneo dopo ${newAttempts} tentativi falliti`);
        } else {
          setToast({ 
            message: `Credenziali errate. Tentativi rimanenti: ${3 - newAttempts}`, 
            type: 'error', 
            isVisible: true 
          });
          
          // Registra il tentativo fallito
          logSecurityEvent(SecurityEventType.LOGIN_FAILURE, 'admin', `Tentativo fallito per l'email: ${sanitizedEmail}`);
        }
      }
    } catch (error) {
      console.error('Errore durante il login:', error);
      setToast({ 
        message: "Errore durante il login. Riprova più tardi.", 
        type: 'error', 
        isVisible: true 
      });
      logSecurityEvent(SecurityEventType.LOGIN_FAILURE, 'admin', 'Errore durante la generazione del token');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setAdminAuth(false);
    setLoginForm({ email: '', password: '' });
    setActiveTab('customers');
    
    // Esegui il logout sicuro
    logout();
    
    // Registra il logout
    logSecurityEvent(SecurityEventType.LOGOUT, 'admin', 'Logout amministratore');
    
    onNavigate('home');
  };

  const handleUpdateCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica il token CSRF
    if (!validateCsrfToken(csrfToken)) {
      setToast({ 
        message: "Errore di sicurezza. Ricarica la pagina e riprova.", 
        type: 'error', 
        isVisible: true 
      });
      logSecurityEvent(SecurityEventType.CSRF_ATTACK, 'admin', 'Tentativo di modifica credenziali con token CSRF non valido');
      return;
    }
    
    // Sanitizza gli input
    const sanitizedCurrentPassword = settingsForm.currentPassword; // Non sanitizziamo la password
    const sanitizedNewEmail = sanitizeInput(settingsForm.newEmail);
    const sanitizedNewPassword = settingsForm.newPassword; // Non sanitizziamo la password
    const sanitizedConfirmPassword = settingsForm.confirmPassword; // Non sanitizziamo la password
    
    if (!sanitizedCurrentPassword || !sanitizedNewEmail || !sanitizedNewPassword) {
      setToast({ message: 'Compila tutti i campi obbligatori', type: 'error', isVisible: true });
      return;
    }
    
    // Validate current password
    const currentCredentials = getAdminCredentials();
    if (currentCredentials.password !== sanitizedCurrentPassword) {
      setToast({ message: 'Password attuale errata', type: 'error', isVisible: true });
      logSecurityEvent(SecurityEventType.PASSWORD_CHANGE_FAILURE, 'admin', 'Tentativo di modifica credenziali con password attuale errata');
      return;
    }

    // Validate email format
    if (!/\S+@\S+\.\S+/.test(sanitizedNewEmail)) {
      setToast({ message: 'Email non valida', type: 'error', isVisible: true });
      return;
    }

    // Validate password confirmation
    if (sanitizedNewPassword !== sanitizedConfirmPassword) {
      setToast({ message: 'Le password non coincidono', type: 'error', isVisible: true });
      return;
    }

    // Validate password strength
    if (sanitizedNewPassword) {
      const passwordValidation = validatePasswordStrength(sanitizedNewPassword);
      if (!passwordValidation.isValid) {
        setToast({ message: passwordValidation.message, type: 'error', isVisible: true });
        return;
      }
    }
    
    try {
      // Update credentials
      setAdminCredentials(sanitizedNewEmail, sanitizedNewPassword);
      
      // Registra la modifica delle credenziali
      logSecurityEvent(SecurityEventType.PASSWORD_CHANGE, 'admin', 'Credenziali amministratore aggiornate');
      
      // Reset form
      setSettingsForm({
        currentPassword: '',
        newEmail: sanitizedNewEmail,
        newPassword: '',
        confirmPassword: ''
      });

      setToast({ message: 'Credenziali aggiornate con successo', type: 'success', isVisible: true });
    } catch (error) {
      console.error('Errore durante l\'aggiornamento delle credenziali:', error);
      setToast({ message: 'Errore durante l\'aggiornamento delle credenziali', type: 'error', isVisible: true });
      logSecurityEvent(SecurityEventType.PASSWORD_CHANGE_FAILURE, 'admin', 'Errore durante l\'aggiornamento delle credenziali');
    }
  };

  const filteredAndSortedCustomers = customers
    .filter(customer =>
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    )
    .sort((a, b) => {
       let comparison = 0;
       
       switch (sortBy) {
         case 'name':
           comparison = a.firstName.localeCompare(b.firstName);
           break;
         case 'surname':
           comparison = a.lastName.localeCompare(b.lastName);
           break;
         case 'points':
           comparison = a.points - b.points;
           break;
         case 'birthDate':
           const dateA = a.birthDate ? new Date(a.birthDate).getTime() : 0;
           const dateB = b.birthDate ? new Date(b.birthDate).getTime() : 0;
           comparison = dateA - dateB;
           break;
         default:
           comparison = 0;
       }
       
       return sortOrder === 'desc' ? -comparison : comparison;
     });

  const handlePointsOperation = (type: 'add' | 'redeem') => {
    if (!selectedCustomer || !pointsInput) {
      setToast({ message: 'Seleziona un cliente e inserisci i punti', type: 'error', isVisible: true });
      return;
    }

    const points = parseInt(pointsInput);
    if (isNaN(points) || points <= 0) {
      setToast({ message: 'Inserisci un numero valido', type: 'error', isVisible: true });
      return;
    }

    if (type === 'redeem' && selectedCustomer.points < points) {
      setToast({ message: 'Punti insufficienti', type: 'error', isVisible: true });
      return;
    }

    const updatedCustomer = {
      ...selectedCustomer,
      points: type === 'add' ? selectedCustomer.points + points : selectedCustomer.points - points
    };

    updateCustomer(updatedCustomer);
    
    // Add transaction record
    const transaction: PointTransaction = {
      id: Date.now().toString(),
      customerId: selectedCustomer.id,
      points: type === 'add' ? points : -points,
      type,
      description: type === 'add' ? `Punti aggiunti manualmente dall'amministratore` : `Punti riscattati manualmente dall'amministratore`,
      timestamp: new Date().toISOString()
    };
    addTransaction(transaction);

    setCustomers(getCustomers());
    setSelectedCustomer(updatedCustomer);
    setPointsInput('');
    
    setToast({
      message: `${points} punti ${type === 'add' ? 'aggiunti' : 'riscattati'} con successo`,
      type: 'success',
      isVisible: true
    });
  };

  const handleAddPrize = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeForm.name || !prizeForm.description || !prizeForm.pointsRequired) {
      setToast({
        message: 'Compila tutti i campi obbligatori',
        type: 'error',
        isVisible: true
      });
      return;
    }

    const newPrize: Prize = {
      id: Date.now().toString(),
      name: prizeForm.name,
      description: prizeForm.description,
      pointsRequired: Number(prizeForm.pointsRequired),
      isActive: true,
      image: prizeImage,
      requiredLevel: Number(prizeForm.requiredLevel) || 1
    };

    const updatedPrizes = [...prizes, newPrize];
    savePrizes(updatedPrizes);
    setPrizes(updatedPrizes);
    setPrizeForm({
      name: '',
      description: '',
      pointsRequired: '',
      isActive: true,
      requiredLevel: '0',
    });
    setPrizeImage('');

    setToast({
      message: 'Premio aggiunto con successo',
      type: 'success',
      isVisible: true
    });
  };
  
  const handlePrizeImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPrizeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title || !notificationForm.message) {
      setToast({ message: 'Compila tutti i campi', type: 'error', isVisible: true });
      return;
    }

    const newNotification: Notification = {
      id: Date.now().toString(),
      title: notificationForm.title,
      message: notificationForm.message,
      type: notificationForm.type,
      createdAt: new Date().toISOString(),
      isActive: notificationForm.isActive
    };

    const updatedNotifications = [...notifications, newNotification];
    setNotifications(updatedNotifications);
    saveNotifications(updatedNotifications);
    
    // Aggiungi la notifica allo storico (inviata a tutti i clienti)
    const allCustomers = getCustomers();
    const historyEntry: NotificationHistory = {
      id: `history_${Date.now()}`,
      notificationId: newNotification.id,
      title: newNotification.title,
      message: newNotification.message,
      type: newNotification.type,
      recipients: allCustomers.map(c => c.id),
      recipientNames: allCustomers.map(c => `${c.firstName} ${c.lastName}`),
      sentAt: new Date().toISOString(),
      sentBy: 'Amministratore'
    };
    
    addNotificationToHistory(historyEntry);
    setNotificationHistory(prev => [...prev, historyEntry]);
    
    setNotificationForm({ title: '', message: '', type: 'info', isActive: true });
    setToast({ message: 'Notifica aggiunta e inviata con successo', type: 'success', isVisible: true });
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!customerForm.firstName || !customerForm.lastName || !customerForm.email || !customerForm.phone || !customerForm.birthDate) {
      setToast({
        message: 'Compila tutti i campi obbligatori',
        type: 'error',
        isVisible: true
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerForm.email)) {
      setToast({
        message: 'Inserisci un indirizzo email valido',
        type: 'error',
        isVisible: true
      });
      return;
    }

    // Validate phone format (Italian mobile)
    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    if (!phoneRegex.test(customerForm.phone.replace(/\s/g, ''))) {
      setToast({
        message: 'Inserisci un numero di cellulare valido',
        type: 'error',
        isVisible: true
      });
      return;
    }

    // Check for duplicate email
    const existingCustomers = getCustomers();
    const emailExists = existingCustomers.some(customer => 
      customer.email.toLowerCase() === customerForm.email.toLowerCase()
    );
    
    if (emailExists) {
      setToast({
        message: 'Esiste già un cliente con questa email',
        type: 'error',
        isVisible: true
      });
      return;
    }

    // Check for duplicate phone
    const phoneExists = existingCustomers.some(customer => 
      customer.phone.replace(/\s/g, '') === customerForm.phone.replace(/\s/g, '')
    );
    
    if (phoneExists) {
      setToast({
        message: 'Esiste già un cliente con questo numero di cellulare',
        type: 'error',
        isVisible: true
      });
      return;
    }

    // Create new customer
    const newCustomer: Customer = {
      id: Date.now().toString(),
      firstName: customerForm.firstName.trim(),
      lastName: customerForm.lastName.trim(),
      email: customerForm.email.toLowerCase().trim(),
      phone: customerForm.phone.replace(/\s/g, ''),
      birthDate: customerForm.birthDate,
      points: 0, // Start with 0 points
      createdAt: new Date().toISOString() // Using createdAt instead of registrationDate to match Customer type
    };

    // Save customer
    addCustomer(newCustomer);
    setCustomers(getCustomers());
    
    // Reset form
    setCustomerForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '+39',
      birthDate: ''
    });

    setToast({
      message: `Cliente ${newCustomer.firstName} ${newCustomer.lastName} aggiunto con successo`,
      type: 'success',
      isVisible: true
    });

    // Switch to customers tab to see the new customer
    setActiveTab('customers');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />

        <div className="flex items-center p-6">
          <button
            onClick={() => onNavigate('home')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-semibold text-white ml-4">Admin Login</h1>
        </div>

        <div className="max-w-md mx-auto px-6">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-2xl font-semibold text-white mb-2">Accesso Admin</h2>
              <p className="text-gray-300">Inserisci le tue credenziali</p>
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
                <form onSubmit={handleLogin} className="space-y-6">
                  {/* Campo nascosto per il token CSRF */}
                  <input type="hidden" name="csrf_token" value={csrfToken} />
                  <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Email Admin
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="admin@freetosmoke.com"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Inserisci la password"
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
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                Accedi
              </button>
            </form>
            )
            }

            <div className="mt-6 p-4 bg-gray-700/30 rounded-xl">
              <p className="text-gray-300 text-sm text-center">
                <strong>Credenziali predefinite:</strong><br />
                Email: admin@freetosmoke.com<br />
                Password: admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center">
          <button
            onClick={() => onNavigate('home')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center ml-4">
            <img src="/Logo senza sfondo Free to smoke.png" alt="Free to Smoke Logo" className="h-8 mr-3" />
            <h1 className="text-xl font-semibold text-white">Pannello Admin</h1>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-red-400 hover:text-red-300 text-sm"
        >
          Logout
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-6">
        <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'customers'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 mr-2" />
            Clienti
          </button>
          <button
            onClick={() => setActiveTab('add-customer')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'add-customer'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4 mr-2" />
            Aggiungi Cliente
          </button>
          <button
            onClick={() => setActiveTab('prizes')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'prizes'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Gift className="w-4 h-4 mr-2" />
            Premi
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifiche
          </button>
          <button
            onClick={() => setActiveTab('statistics')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'statistics'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart className="w-4 h-4 mr-2" />
            Statistiche
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 mr-2" />
            Impostazioni
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6">
        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-6">
            {/* Search and Sort */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Cerca per nome, email o cellulare..."
                />
              </div>
              
              {/* Sort Controls */}
               <div className="flex flex-wrap gap-4 items-center">
                 <div className="flex items-center space-x-2">
                   <label className="text-gray-300 text-sm font-medium">Ordina per:</label>
                   <select
                     value={sortBy}
                     onChange={(e) => setSortBy(e.target.value as any)}
                     className="bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     <option value="name">Nome</option>
                     <option value="surname">Cognome</option>
                     <option value="points">Punti</option>
                     <option value="birthDate">Data di nascita</option>
                   </select>
                 </div>
                 
                 <div className="flex items-center space-x-2">
                   <label className="text-gray-300 text-sm font-medium">Ordine:</label>
                   <select
                     value={sortOrder}
                     onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                     className="bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     <option value="asc">{sortBy === 'points' ? 'Minore → Maggiore' : 'A → Z / Più vecchio → Più recente'}</option>
                     <option value="desc">{sortBy === 'points' ? 'Maggiore → Minore' : 'Z → A / Più recente → Più vecchio'}</option>
                   </select>
                 </div>
               </div>
            </div>

            {/* Selected Customer Actions */}
            {selectedCustomer && (
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h3>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-400">Email: <span className="text-white">{selectedCustomer.email}</span></p>
                    <p className="text-gray-400">Cellulare: <span className="text-white">{selectedCustomer.phone}</span></p>
                  </div>
                  <div>
                    <p className="text-gray-400">Punti: <span className="text-green-400 font-semibold">{selectedCustomer.points}</span></p>
                    <p className="text-gray-400">Livello: <span className={getUserLevel(selectedCustomer.points).color}>{getUserLevel(selectedCustomer.points).name}</span></p>
                  </div>
                </div>

                {/* Points Operations */}
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Punti da aggiungere/riscattare
                    </label>
                    <input
                      type="number"
                      value={pointsInput}
                      onChange={(e) => setPointsInput(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                      placeholder="es. 100"
                    />
                  </div>
                  <button
                    onClick={() => handlePointsOperation('add')}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Aggiungi</span>
                  </button>
                  <button
                    onClick={() => handlePointsOperation('redeem')}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl flex items-center space-x-2 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                    <span>Riscatta</span>
                  </button>
                </div>
                
                {/* Transaction History */}
                <div className="mt-6 border-t border-gray-700 pt-4">
                  <h4 className="text-md font-semibold text-white mb-3 flex items-center space-x-2">
                    <span>📊</span>
                    <span>Storico Transazioni</span>
                  </h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {getTransactions()
                      .filter(transaction => transaction.customerId === selectedCustomer.id)
                      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                      .map(transaction => {
                        const date = new Date(transaction.timestamp);
                        const formattedDate = date.toLocaleDateString('it-IT', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        
                        return (
                          <div
                            key={transaction.id}
                            className={`p-3 rounded-lg border ${
                              transaction.type === 'add'
                                ? 'bg-green-900/20 border-green-500/30'
                                : 'bg-red-900/20 border-red-500/30'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <span className={`text-sm font-medium ${
                                    transaction.type === 'add' ? 'text-green-400' : 'text-red-400'
                                  }`}>
                                    {transaction.type === 'add' ? '+ ' : '- '}
                                    {Math.abs(transaction.points)} punti
                                  </span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    transaction.type === 'add'
                                      ? 'bg-green-500/20 text-green-300'
                                      : 'bg-red-500/20 text-red-300'
                                  }`}>
                                    {transaction.type === 'add' ? 'Aggiunta' : 'Riscatto'}
                                  </span>
                                </div>
                                <p className="text-gray-400 text-sm mt-1">
                                  {transaction.description}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-300 text-xs">
                                  {formattedDate}
                                </p>
                                <p className="text-gray-500 text-xs mt-1">
                                  Admin
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    }
                    {getTransactions().filter(transaction => transaction.customerId === selectedCustomer.id).length === 0 && (
                      <div className="text-center py-8">
                        <div className="text-gray-500 text-sm">
                          <span className="text-2xl mb-2 block">📝</span>
                          Nessuna transazione registrata
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Delete Customer Button */}
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <button
                    onClick={() => {
                      if (window.confirm(`Sei sicuro di voler eliminare il cliente ${selectedCustomer.firstName} ${selectedCustomer.lastName}? Questa azione non può essere annullata.`)) {
                        deleteCustomer(selectedCustomer.id);
                        setCustomers(getCustomers());
                        setSelectedCustomer(null);
                        setToast({
                          message: 'Cliente eliminato con successo',
                          type: 'success',
                          isVisible: true
                        });
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl flex items-center justify-center space-x-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    <span>Elimina Cliente</span>
                  </button>
                </div>
              </div>
            )}

            {/* Customer List */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Clienti ({filteredAndSortedCustomers.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredAndSortedCustomers.map(customer => (
                  <div
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`p-4 rounded-xl cursor-pointer transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-blue-600/20 border border-blue-500/50'
                        : 'bg-gray-700/50 hover:bg-gray-700'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-white">
                          {customer.firstName} {customer.lastName}
                        </h4>
                        <p className="text-gray-400 text-sm">
                          {customer.email} • {customer.phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-semibold">
                          {customer.points} punti
                        </div>
                        <div className={`text-sm ${getUserLevel(customer.points).color}`}>
                          {getUserLevel(customer.points).name}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification History */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Storico Notifiche Inviate</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Cerca per titolo, messaggio o destinatario..."
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    className="bg-gray-800 border border-gray-600 rounded-xl py-2 pl-10 pr-4 text-white text-sm w-80"
                  />
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {notificationHistory
                  .filter(history => 
                    historySearchTerm === '' ||
                    history.title.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    history.message.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                    history.recipientNames.some(name => 
                      name.toLowerCase().includes(historySearchTerm.toLowerCase())
                    )
                  )
                  .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
                  .map(history => (
                    <div
                      key={history.id}
                      className="p-4 rounded-xl bg-gray-700/30 border border-gray-600/50"
                    >
                      <div className="flex items-start">
                        <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                          history.type === 'promo' ? 'bg-yellow-400' :
                          history.type === 'offer' ? 'bg-green-400' : 'bg-blue-400'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-semibold text-white">{history.title}</h4>
                              <p className="text-gray-300 text-sm mt-1">{history.message}</p>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-gray-400">
                                {new Date(history.sentAt).toLocaleDateString('it-IT', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div className="text-xs text-blue-400">
                                Tipo: {history.type === 'info' ? 'Informazione' : 
                                      history.type === 'promo' ? 'Promozione' : 'Offerta'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="border-t border-gray-600/50 pt-2 mt-2">
                            <div className="flex justify-between items-center text-xs">
                              <div className="text-gray-400">
                                <span className="font-medium">Inviato da:</span> {history.sentBy}
                              </div>
                              <div className="text-gray-400">
                                <span className="font-medium">Destinatari:</span> {history.recipients.length} clienti
                              </div>
                            </div>
                            
                            {history.recipientNames.length > 0 && (
                              <div className="mt-2">
                                <div className="text-xs text-gray-500 mb-1">Lista destinatari:</div>
                                <div className="text-xs text-gray-400 max-h-20 overflow-y-auto">
                                  {history.recipientNames.slice(0, 10).join(', ')}
                                  {history.recipientNames.length > 10 && (
                                    <span className="text-gray-500"> e altri {history.recipientNames.length - 10}...</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
                
                {notificationHistory.filter(history => 
                  historySearchTerm === '' ||
                  history.title.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                  history.message.toLowerCase().includes(historySearchTerm.toLowerCase()) ||
                  history.recipientNames.some(name => 
                    name.toLowerCase().includes(historySearchTerm.toLowerCase())
                  )
                ).length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    {historySearchTerm ? 'Nessuna notifica trovata per la ricerca corrente' : 'Nessuna notifica inviata ancora'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add Customer Tab */}
        {activeTab === 'add-customer' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Aggiungi Nuovo Cliente</h3>
              <p className="text-gray-300 text-sm mb-6">
                Compila tutti i campi obbligatori per aggiungere un nuovo cliente. Il sistema verificherà automaticamente che email e cellulare non siano già registrati.
              </p>
              
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Nome <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerForm.firstName}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, firstName: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="es. Mario"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Cognome <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerForm.lastName}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, lastName: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="es. Rossi"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="es. mario.rossi@email.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Numero di Cellulare <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">+39</span>
                      <input
                        type="tel"
                        value={customerForm.phone.replace('+39', '')}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setCustomerForm(prev => ({ ...prev, phone: '+39' + value }));
                        }}
                        className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="3331234567"
                        maxLength={10}
                        pattern="[0-9]{10}"
                        required
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Data di Nascita <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={customerForm.birthDate}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, birthDate: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-start">
                    <div className="w-5 h-5 text-blue-400 mt-0.5 mr-3">
                      ℹ️
                    </div>
                    <div>
                      <h4 className="text-blue-300 font-medium mb-1">Informazioni</h4>
                      <ul className="text-blue-200 text-sm space-y-1">
                        <li>• Il cliente inizierà con 0 punti</li>
                        <li>• Email e cellulare devono essere unici nel sistema</li>
                        <li>• Tutti i campi sono obbligatori</li>
                        <li>• Il formato del cellulare deve essere valido (10-15 cifre)</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>Aggiungi Cliente</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerForm({
                        firstName: '',
                        lastName: '',
                        email: '',
                        phone: '',
                        birthDate: ''
                      });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-xl transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Prizes Tab */}
        {activeTab === 'prizes' && (
          <div className="space-y-6">
            {/* Add Prize Form */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Aggiungi Nuovo Premio</h3>
              <form onSubmit={handleAddPrize} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Nome Premio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={prizeForm.name}
                      onChange={(e) => setPrizeForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                      placeholder="es. Sconto 10€"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Punti Richiesti <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={prizeForm.pointsRequired}
                      onChange={(e) => setPrizeForm(prev => ({ ...prev, pointsRequired: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                      placeholder="es. 1000"
                    />
                  </div>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Livello Richiesto
                    </label>
                    <select
                      value={prizeForm.requiredLevel}
                      onChange={(e) => setPrizeForm(prev => ({ ...prev, requiredLevel: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                    >
                      <option value="0">Nessun livello richiesto</option>
                      {LEVEL_CONFIGS.map((level, index) => (
                        <option key={index} value={index + 1}>
                          {level.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Immagine
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePrizeImageUpload}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                    />
                  </div>
                </div>
                
                {prizeImage && (
                  <div className="mt-2">
                    <p className="text-gray-300 text-sm mb-2">Anteprima immagine:</p>
                    <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-600">
                      <img 
                        src={prizeImage} 
                        alt="Anteprima premio" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Descrizione <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={prizeForm.description}
                    onChange={(e) => setPrizeForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                    rows={3}
                    placeholder="Descrizione del premio..."
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl transition-colors"
                >
                  Aggiungi Premio
                </button>
              </form>
            </div>

            {/* Prizes List */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Premi Disponibili</h3>
              <div className="space-y-3">
                {prizes.map(prize => (
                  <div
                    key={prize.id}
                    className={`p-4 rounded-xl ${
                      prize.isActive ? 'bg-gray-700/50' : 'bg-gray-700/20 opacity-60'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      {prize.image && (
                        <div className="mr-3 flex-shrink-0">
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-600">
                            <img 
                              src={prize.image} 
                              alt={prize.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{prize.name}</h4>
                        <p className="text-gray-300 text-sm mt-1">{prize.description}</p>
                        {prize.requiredLevel && prize.requiredLevel > 0 && (
                          <div className="mt-1 inline-block px-2 py-1 rounded-md text-xs" 
                               style={{ backgroundColor: LEVEL_CONFIGS[prize.requiredLevel - 1].bgColor, color: LEVEL_CONFIGS[prize.requiredLevel - 1].color }}>
                            Livello: {LEVEL_CONFIGS[prize.requiredLevel - 1].name}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-semibold">
                          {prize.pointsRequired} punti
                        </div>
                        <div className={`text-xs ${prize.isActive ? 'text-green-400' : 'text-red-400'}`}>
                          {prize.isActive ? 'Attivo' : 'Disattivato'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            {/* Add Notification Form */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Aggiungi Nuova Notifica</h3>
              <form onSubmit={handleAddNotification} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Titolo
                    </label>
                    <input
                      type="text"
                      value={notificationForm.title}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                      placeholder="es. Offerta Speciale"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">
                      Tipo
                    </label>
                    <select
                      value={notificationForm.type}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, type: e.target.value as 'info' | 'promo' | 'offer' }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                    >
                      <option value="info">Informazione</option>
                      <option value="promo">Promozione</option>
                      <option value="offer">Offerta</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Messaggio
                  </label>
                  <textarea
                    value={notificationForm.message}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, message: e.target.value }))}
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-4 text-white"
                    rows={3}
                    placeholder="Messaggio della notifica..."
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-colors"
                >
                  Aggiungi Notifica
                </button>
              </form>
            </div>

            {/* Notifications List */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Notifiche Inviate</h3>
              <div className="space-y-3">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-xl ${
                      notification.isActive ? 'bg-gray-700/50' : 'bg-gray-700/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                        notification.type === 'promo' ? 'bg-yellow-400' :
                        notification.type === 'offer' ? 'bg-green-400' : 'bg-blue-400'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-white">{notification.title}</h4>
                            <p className="text-gray-300 text-sm mt-1">{notification.message}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-400">
                              {new Date(notification.createdAt).toLocaleDateString('it-IT')}
                            </div>
                            <div className={`text-xs ${notification.isActive ? 'text-green-400' : 'text-red-400'}`}>
                              {notification.isActive ? 'Attivo' : 'Disattivato'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <div className="space-y-6">
            {/* Statistics Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Customers */}
              <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-300 text-sm font-medium">Clienti Totali</p>
                    <p className="text-white text-3xl font-bold mt-2">{customers.length}</p>
                  </div>
                  <div className="bg-blue-500/20 p-3 rounded-xl">
                    <Users className="w-8 h-8 text-blue-400" />
                  </div>
                </div>
              </div>

              {/* Average Points */}
              <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 backdrop-blur-sm border border-green-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-300 text-sm font-medium">Media Punti</p>
                    <p className="text-white text-3xl font-bold mt-2">
                      {customers.length > 0 
                        ? Math.round(customers.reduce((sum, customer) => sum + customer.points, 0) / customers.length)
                        : 0
                      }
                    </p>
                  </div>
                  <div className="bg-green-500/20 p-3 rounded-xl">
                    <BarChart className="w-8 h-8 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Prizes Redeemed */}
              <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-300 text-sm font-medium">Premi Riscattati</p>
                    <p className="text-white text-3xl font-bold mt-2">
                      {getTransactions().filter(t => t.type === 'redeem').length}
                    </p>
                  </div>
                  <div className="bg-purple-500/20 p-3 rounded-xl">
                    <Gift className="w-8 h-8 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Notifications Sent */}
              <div className="bg-gradient-to-br from-yellow-600/20 to-yellow-800/20 backdrop-blur-sm border border-yellow-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-300 text-sm font-medium">Notifiche Inviate</p>
                    <p className="text-white text-3xl font-bold mt-2">{notificationHistory.length}</p>
                  </div>
                  <div className="bg-yellow-500/20 p-3 rounded-xl">
                    <Bell className="w-8 h-8 text-yellow-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Registrations Chart */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Registrazioni Ultimi 30 Giorni</h3>
                <div className="h-64">
                  <Line
                    data={{
                      labels: (() => {
                        const labels = [];
                        for (let i = 29; i >= 0; i--) {
                          const date = new Date();
                          date.setDate(date.getDate() - i);
                          labels.push(date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }));
                        }
                        return labels;
                      })(),
                      datasets: [{
                        label: 'Registrazioni',
                        data: (() => {
                          const data = [];
                          for (let i = 29; i >= 0; i--) {
                            const date = new Date();
                            date.setDate(date.getDate() - i);
                            const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                            const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
                            const registrationsOnDay = customers.filter(() => {
                              // Simuliamo una data di registrazione casuale negli ultimi 30 giorni
                              const regDate = new Date();
                              regDate.setDate(regDate.getDate() - Math.floor(Math.random() * 30));
                              return regDate >= dayStart && regDate < dayEnd;
                            }).length;
                            data.push(registrationsOnDay);
                          }
                          return data;
                        })(),
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: 'white'
                          }
                        }
                      },
                      scales: {
                        x: {
                          ticks: {
                            color: 'rgb(156, 163, 175)'
                          },
                          grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                          }
                        },
                        y: {
                          ticks: {
                            color: 'rgb(156, 163, 175)'
                          },
                          grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Points Distribution Chart */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Distribuzione Punti</h3>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: ['0-100', '101-500', '501-1000', '1000+'],
                      datasets: [{
                        label: 'Numero Clienti',
                        data: [
                          customers.filter(c => c.points >= 0 && c.points <= 100).length,
                          customers.filter(c => c.points > 100 && c.points <= 500).length,
                          customers.filter(c => c.points > 500 && c.points <= 1000).length,
                          customers.filter(c => c.points > 1000).length
                        ],
                        backgroundColor: [
                          'rgba(34, 197, 94, 0.8)',
                          'rgba(59, 130, 246, 0.8)',
                          'rgba(168, 85, 247, 0.8)',
                          'rgba(251, 191, 36, 0.8)'
                        ],
                        borderColor: [
                          'rgb(34, 197, 94)',
                          'rgb(59, 130, 246)',
                          'rgb(168, 85, 247)',
                          'rgb(251, 191, 36)'
                        ],
                        borderWidth: 1
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: {
                            color: 'white'
                          }
                        }
                      },
                      scales: {
                        x: {
                          ticks: {
                            color: 'rgb(156, 163, 175)'
                          },
                          grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                          }
                        },
                        y: {
                          ticks: {
                            color: 'rgb(156, 163, 175)'
                          },
                          grid: {
                            color: 'rgba(156, 163, 175, 0.1)'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Additional Statistics */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Statistiche Dettagliate</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="text-gray-300 font-medium">Transazioni</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Punti aggiunti:</span>
                      <span className="text-green-400">
                        {getTransactions().filter(t => t.type === 'add').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Punti riscattati:</span>
                      <span className="text-red-400">
                        {getTransactions().filter(t => t.type === 'redeem').length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Totale transazioni:</span>
                      <span className="text-white font-medium">
                        {getTransactions().length}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-gray-300 font-medium">Premi</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Premi attivi:</span>
                      <span className="text-green-400">
                        {prizes.filter(p => p.isActive).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Premi totali:</span>
                      <span className="text-white font-medium">
                        {prizes.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Punti medi richiesti:</span>
                      <span className="text-blue-400">
                        {prizes.length > 0 
                          ? Math.round(prizes.reduce((sum, prize) => sum + prize.pointsRequired, 0) / prizes.length)
                          : 0
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-gray-300 font-medium">Livelli Clienti</h4>
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map(level => {
                      // Utilizziamo direttamente l'indice per trovare i clienti di quel livello
                      const levelConfig = LEVEL_CONFIGS[level];
                      const customersAtLevel = customers.filter(c => 
                        c.points >= levelConfig.minPoints && c.points <= levelConfig.maxPoints
                      );
                      
                      return (
                        <div key={level} className="flex justify-between text-sm">
                          <span className="text-gray-400">{levelConfig.name}:</span>
                          <span className="text-white font-medium">
                            {customersAtLevel.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Modifica Credenziali Admin</h3>
              <form onSubmit={handleUpdateCredentials} className="space-y-6">
                {/* Campo nascosto per il token CSRF */}
                <input type="hidden" name="csrf_token" value={csrfToken} />
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Password Attuale *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={settingsForm.currentPassword}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Inserisci la password attuale"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                    >
                      {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Nuova Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      value={settingsForm.newEmail}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, newEmail: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="nuova@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Nuova Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={settingsForm.newPassword}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nuova password (min. 6 caratteri)"
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
                    Conferma Nuova Password *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={settingsForm.confirmPassword}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ripeti la nuova password"
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Aggiorna Credenziali
                </button>
              </form>

              <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-300 text-sm">
                  <strong>Attenzione:</strong> Dopo aver modificato le credenziali, dovrai utilizzare la nuova email e password per accedere al pannello admin.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;