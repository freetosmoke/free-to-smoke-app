import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, User, Mail, Phone, Calendar, Upload, X } from 'lucide-react';
import { Customer, SecurityEventType } from '../types';
import * as firebaseService from '../utils/firebase';
import Toast from './Toast';
import { sanitizeInput, sanitizeObject } from '../utils/security';
import { generateCsrfToken, validateCsrfToken, setupSecurityProtections } from '../utils/security';
import { validatePasswordStrength } from '../utils/auth';
import { logSecurityEvent } from '../utils/securityLogger';

interface RegistrationProps {
  onNavigate: (page: string) => void;
}

const Registration: React.FC<RegistrationProps> = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+39 ',
    birthDate: '',
    profileImage: '',
    password: '',
    confirmPassword: '',
    privacyPolicy: false,
    marketingConsent: false,
    termsAndConditions: false
  });
  
  const [csrfToken, setCsrfToken] = useState<string>("");
  
  // Imposta le protezioni di sicurezza e genera un token CSRF all'avvio
  useEffect(() => {
    // Imposta le protezioni di sicurezza
    setupSecurityProtections();
    
    // Genera un nuovo token CSRF
    const token = generateCsrfToken();
    setCsrfToken(token);
  }, []);
  
  // Stato per tenere traccia dei campi che sono stati "visitati" (blurred)
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  
  // Stato per tenere traccia degli errori in tempo reale
  const [realTimeErrors, setRealTimeErrors] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error', isVisible: boolean}>({
    message: '', type: 'success', isVisible: false
  });

  // Funzione per validare un singolo campo in tempo reale
  const validateField = async (name: string, value: string): Promise<string> => {
    // Sanitizza l'input prima della validazione
    const sanitizedValue = sanitizeInput(value);
    
    switch (name) {
      case 'firstName':
        return !sanitizedValue.trim() ? 'Nome richiesto' : '';
      case 'lastName':
        return !sanitizedValue.trim() ? 'Cognome richiesto' : '';
      case 'email':
        if (!sanitizedValue.trim()) return 'Email richiesta';
        if (!sanitizedValue.includes('@')) return 'Email non valida: deve contenere il simbolo @';
        if (!/\S+@\S+\.\S+/.test(sanitizedValue)) return 'Email non valida';
        try {
          const existingCustomer = await firebaseService.findCustomerByEmail(sanitizedValue);
          if (existingCustomer) return 'Email già registrata';
        } catch (error) {
          console.error('Errore durante la verifica dell\'email:', error);
        }
        return '';
      case 'phone':
        if (sanitizedValue.length <= 4) return 'Numero di cellulare richiesto';
        if (!/^\+39\s?[0-9]{10}$/.test(sanitizedValue)) return 'Numero non valido. Deve contenere il prefisso +39 seguito da 10 cifre';
        try {
          const existingCustomer = await firebaseService.findCustomerByPhone(sanitizedValue);
          if (existingCustomer) return 'Numero già registrato';
        } catch (error) {
          console.error('Errore durante la verifica del numero di telefono:', error);
        }
        return '';
      case 'birthDate': {
        if (!sanitizedValue) return 'Data di nascita richiesta';
        // Verifica che l'utente abbia almeno 18 anni
        const birthDate = new Date(sanitizedValue);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          return 'Devi avere almeno 18 anni per registrarti';
        }
        return '';
      }
      case 'password': {
        if (!sanitizedValue) return 'Password richiesta';
        const passwordValidation = validatePasswordStrength(sanitizedValue);
        if (!passwordValidation.isValid) return passwordValidation.message;
        return '';
      }
      case 'confirmPassword':
        if (!sanitizedValue) return 'Conferma password richiesta';
        if (sanitizedValue !== formData.password) return 'Le password non corrispondono';
        return '';
      default:
        return '';
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Nome richiesto';
    if (!formData.lastName.trim()) newErrors.lastName = 'Cognome richiesto';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email richiesta';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Email non valida: deve contenere il simbolo @';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email non valida';
    } else {
      try {
        const existingCustomer = await firebaseService.findCustomerByEmail(formData.email);
        if (existingCustomer) {
          newErrors.email = 'Email già registrata';
        }
      } catch (error) {
        console.error('Errore durante la verifica dell\'email:', error);
      }
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Numero di cellulare richiesto';
    } else if (!/^\+39\s?[0-9]{10}$/.test(formData.phone)) {
      newErrors.phone = 'Numero non valido. Deve contenere il prefisso +39 seguito da 10 cifre';
    } else {
      try {
        const existingCustomer = await firebaseService.findCustomerByPhone(formData.phone);
        if (existingCustomer) {
          newErrors.phone = 'Numero già registrato';
        }
      } catch (error) {
        console.error('Errore durante la verifica del numero di telefono:', error);
      }
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'Data di nascita richiesta';
    } else {
      // Verifica che l'utente abbia almeno 18 anni
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        newErrors.birthDate = 'Devi avere almeno 18 anni per registrarti';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Verifica il token CSRF
    if (!validateCsrfToken(csrfToken)) {
      setToast({
        message: "Errore di sicurezza. Ricarica la pagina e riprova.",
        type: 'error',
        isVisible: true
      });
      logSecurityEvent(SecurityEventType.CSRF_ATTACK, 'unknown', 'Tentativo di registrazione con token CSRF non valido');
      return;
    }
    
    // Validate privacy checkboxes
    if (!formData.privacyPolicy) {
      setErrors(prev => ({ ...prev, privacyPolicy: 'Devi accettare l\'informativa sulla privacy' }));
    }
    
    if (!formData.termsAndConditions) {
      setErrors(prev => ({ ...prev, termsAndConditions: 'Devi accettare i termini e condizioni' }));
    }
    
    const isValid = await validateForm();
    if (!isValid) {
      setToast({
        message: 'Controlla i campi evidenziati in rosso',
        type: 'error',
        isVisible: true
      });
      return;
    }
    
    try {
      // Sanitizza tutti i dati del form
      const sanitizedFormData = sanitizeObject(formData);
      
      // Create new customer
      const newCustomer: Customer = {
        id: Date.now().toString(),
        firstName: sanitizedFormData.firstName.trim(),
        lastName: sanitizedFormData.lastName.trim(),
        email: sanitizedFormData.email.trim().toLowerCase(),
        phone: sanitizedFormData.phone.trim(),
        birthDate: sanitizedFormData.birthDate,
        points: 0,
        createdAt: new Date().toISOString(),
        marketingConsent: sanitizedFormData.marketingConsent
      };
      
      // Aggiungi profileImage solo se presente
      if (sanitizedFormData.profileImage) {
        newCustomer.profileImage = sanitizedFormData.profileImage;
      }
      
      // Add customer to storage using Firebase
      await firebaseService.addCustomer(newCustomer);
      
      // Registra l'evento di registrazione
      logSecurityEvent(SecurityEventType.REGISTRATION, newCustomer.id, 'Registrazione completata con successo');
      
      // Show success message
      setToast({
        message: 'Registrazione completata con successo!',
        type: 'success',
        isVisible: true
      });
      
      // Navigate to home after a delay
      setTimeout(() => {
        onNavigate('home');
      }, 2000);
    } catch (error) {
      console.error('Errore durante la registrazione:', error);
      setToast({
        message: 'Si è verificato un errore durante la registrazione. Riprova più tardi.',
        type: 'error',
        isVisible: true
      });
      logSecurityEvent(SecurityEventType.REGISTRATION_FAILURE, 'unknown', 'Errore durante la registrazione');
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
      <div className="flex items-center p-4 sticky top-0 z-10 bg-gradient-to-r from-gray-900 to-gray-800 shadow-md">
        <button
          onClick={() => onNavigate('home')}
          className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700/50"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center ml-3">
          <img src="/Logo senza sfondo Free to smoke.png" alt="Free to Smoke Logo" className="h-14 mr-3" />
          <h1 className="text-xl font-semibold text-white">Registrazione</h1>
        </div>
      </div>

      {/* Form */}
      <div className="w-full max-w-md mx-auto px-4 pb-6 pt-2">
        <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo nascosto per il token CSRF */}
        <input type="hidden" name="csrf_token" value={csrfToken} />
          {/* Nome e Cognome - Layout a due colonne su schermi più grandi */}
          <div className="flex flex-col sm:flex-row sm:space-x-3 space-y-4 sm:space-y-0">
            {/* Nome */}
            <div className="flex-1">
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                Nome *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, firstName: value }));
                    validateField('firstName', value).then(error => {
                      setRealTimeErrors(prev => ({ ...prev, firstName: error }));
                    });
                  }}
                  onBlur={() => setTouchedFields(prev => ({ ...prev, firstName: true }))}
                  className={`w-full bg-gray-800 border-2 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
                    errors.firstName || realTimeErrors.firstName ? 'border-red-500' : (touchedFields.firstName && formData.firstName.trim()) ? 'border-green-500' : 'border-gray-600'
                  } [&:not(:placeholder-shown)]:bg-gray-800`}
                  placeholder="Nome"
                  autoComplete="given-name"
                />
              </div>
              {(errors.firstName || realTimeErrors.firstName) && <p className="text-red-400 text-sm mt-1">{errors.firstName || realTimeErrors.firstName}</p>}
            </div>

            {/* Cognome */}
            <div className="flex-1">
              <label className="block text-gray-300 text-sm font-medium mb-1.5">
                Cognome *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFormData(prev => ({ ...prev, lastName: value }));
                    validateField('lastName', value).then(error => {
                      setRealTimeErrors(prev => ({ ...prev, lastName: error }));
                    });
                  }}
                  onBlur={() => setTouchedFields(prev => ({ ...prev, lastName: true }))}
                  className={`w-full bg-gray-800 border-2 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
                    errors.lastName || realTimeErrors.lastName ? 'border-red-500' : (touchedFields.lastName && formData.lastName.trim()) ? 'border-green-500' : 'border-gray-600'
                  } [&:not(:placeholder-shown)]:bg-gray-800`}
                  placeholder="Cognome"
                  autoComplete="family-name"
                />
              </div>
              {(errors.lastName || realTimeErrors.lastName) && <p className="text-red-400 text-sm mt-1">{errors.lastName || realTimeErrors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">
              Email *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={async (e) => {
                  const value = e.target.value;
                  setFormData(prev => ({ ...prev, email: value }));
                  const error = await validateField('email', value);
                  setRealTimeErrors(prev => ({ ...prev, email: error }));
                }}
                onBlur={() => setTouchedFields(prev => ({ ...prev, email: true }))}
                className={`w-full bg-gray-800 border-2 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
                  errors.email || realTimeErrors.email ? 'border-red-500' : (touchedFields.email && formData.email.trim() && formData.email.includes('@')) ? 'border-green-500' : 'border-gray-600'
                } [&:not(:placeholder-shown)]:bg-gray-800`}
                placeholder="esempio@email.com"
                autoComplete="email"
              />
            </div>
            {(errors.email || realTimeErrors.email) && <p className="text-red-400 text-sm mt-1">{errors.email || realTimeErrors.email}</p>}
          </div>

          {/* Cellulare */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">
              Numero di cellulare *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <div className="w-full overflow-visible">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const input = e.target.value;
                    let formattedPhone = '';
                    
                    // Se l'utente tenta di cancellare completamente, mantieni almeno il prefisso
                    if (input === '') {
                      formattedPhone = '+39 ';
                      setFormData(prev => ({ ...prev, phone: formattedPhone }));
                      validateField('phone', formattedPhone).then(error => {
                        setRealTimeErrors(prev => ({ ...prev, phone: error }));
                      });
                      return;
                    }
                    
                    // Se l'utente tenta di modificare o rimuovere il prefisso
                    if (!input.startsWith('+39')) {
                      // Estrai solo le cifre dall'input
                      const digits = input.replace(/\D/g, '');
                      // Limita a 10 cifre
                      const limitedDigits = digits.substring(0, 10);
                      // Formatta con il prefisso
                      formattedPhone = '+39 ' + limitedDigits;
                      setFormData(prev => ({ ...prev, phone: formattedPhone }));
                    } else {
                      // Gestisci normalmente l'input che mantiene il prefisso
                      // Estrai le cifre dopo il prefisso +39
                      const prefixRemoved = input.substring(3); // Rimuovi '+39'
                      const digits = prefixRemoved.replace(/\D/g, '');
                      // Limita a 10 cifre
                      const limitedDigits = digits.substring(0, 10);
                      // Formatta con il prefisso
                      formattedPhone = '+39 ' + limitedDigits;
                      setFormData(prev => ({ ...prev, phone: formattedPhone }));
                    }
                    
                    // Valida il numero di telefono in tempo reale
                    validateField('phone', formattedPhone).then(error => {
                      setRealTimeErrors(prev => ({ ...prev, phone: error }));
                    });
                  }}
                  onBlur={() => setTouchedFields(prev => ({ ...prev, phone: true }))}
                  className={`w-full bg-gray-800 border-2 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium text-lg ${
                    errors.phone || realTimeErrors.phone ? 'border-red-500' : (touchedFields.phone && formData.phone.length > 4) ? 'border-green-500' : 'border-gray-600'
                  } [&:not(:placeholder-shown)]:bg-gray-800`}
                  placeholder="+39 123 456 7890"
                  autoComplete="tel"
                  maxLength={14} // +39 + 10 cifre + eventuali spazi
                />
              </div>
            </div>
            {(errors.phone || realTimeErrors.phone) && <p className="text-red-400 text-sm mt-1">{errors.phone || realTimeErrors.phone}</p>}
          </div>

          {/* Data di nascita */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">
              Data di nascita *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => {
                    const selectedDate = e.target.value;
                    setFormData(prev => ({ ...prev, birthDate: selectedDate }));
                    
                    // Valida la data di nascita in tempo reale
                    validateField('birthDate', selectedDate).then(error => {
                      setRealTimeErrors(prev => ({ ...prev, birthDate: error }));
                    });
                  }}
                min="1920-01-01"
                max={(() => {
                  const date = new Date();
                  date.setFullYear(date.getFullYear() - 18);
                  return date.toISOString().split('T')[0];
                })()}
                onBlur={() => setTouchedFields(prev => ({ ...prev, birthDate: true }))}
                className={`w-full bg-gray-800 border-2 rounded-xl py-3.5 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base font-medium ${
                  errors.birthDate || realTimeErrors.birthDate ? 'border-red-500' : (touchedFields.birthDate && formData.birthDate) ? 'border-green-500' : 'border-gray-600'
                } [&::-webkit-calendar-picker-indicator]:hidden [&:not(:placeholder-shown)]:bg-gray-800`}
                onClick={(e) => e.preventDefault()}
              />
            </div>
            {(errors.birthDate || realTimeErrors.birthDate) && <p className="text-red-400 text-sm mt-1">{errors.birthDate || realTimeErrors.birthDate}</p>}
          </div>

          {/* Immagine Profilo */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">
              Immagine Profilo
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-3 sm:space-y-0">
              {formData.profileImage ? (
                <div className="relative mx-auto sm:mx-0">
                  <img 
                    src={formData.profileImage} 
                    alt="Anteprima immagine profilo" 
                    className="w-28 h-28 rounded-full object-cover border-2 border-blue-500 shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, profileImage: '' }))}
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1.5 text-white hover:bg-red-600 transition-colors shadow-md"
                    aria-label="Rimuovi immagine"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center cursor-pointer hover:bg-gray-600 transition-colors border-2 border-dashed border-gray-500 mx-auto sm:mx-0"
                >
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <p className="text-gray-300 text-sm mb-2">
                  {formData.profileImage ? 'Immagine caricata' : 'Carica un\'immagine per il tuo profilo (opzionale)'}
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors bg-gray-800/50 py-2 px-4 rounded-lg"
                >
                  {formData.profileImage ? 'Cambia immagine' : 'Seleziona immagine'}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  capture="user"
                />
              </div>
            </div>
          </div>

          {/* Privacy Checkboxes */}
          <div className="space-y-3 mt-4">
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.privacyPolicy}
                  onChange={(e) => setFormData({ ...formData, privacyPolicy: e.target.checked })}
                  className="mt-1 mr-2"
                />
                <span className="text-sm text-gray-300">
                  Dichiaro di aver letto e compreso l'<a href="#" className="text-blue-400 hover:underline">informativa sulla privacy</a> e acconsento al trattamento dei miei dati personali per le finalità descritte. <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.privacyPolicy && <p className="text-red-500 text-xs mt-1">{errors.privacyPolicy}</p>}
            </div>
            
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.marketingConsent}
                  onChange={(e) => setFormData({ ...formData, marketingConsent: e.target.checked })}
                  className="mt-1 mr-2"
                />
                <span className="text-sm text-gray-300">
                  Acconsento a ricevere comunicazioni promozionali e newsletter da Free to Smoke.
                </span>
              </label>
            </div>
            
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={formData.termsAndConditions}
                  onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.checked })}
                  className="mt-1 mr-2"
                />
                <span className="text-sm text-gray-300">
                  Accetto i <a href="#" className="text-blue-400 hover:underline">termini e condizioni</a> del servizio. <span className="text-red-500">*</span>
                </span>
              </label>
              {errors.termsAndConditions && <p className="text-red-500 text-xs mt-1">{errors.termsAndConditions}</p>}
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform active:scale-[0.98] mt-8 text-lg shadow-lg fixed sm:relative bottom-4 sm:bottom-auto left-0 right-0 mx-auto max-w-[calc(100%-2rem)] sm:max-w-full"
          >
            Registrati
          </button>
          
          {/* Spacer per il pulsante fisso su mobile */}
          <div className="h-16 sm:h-0"></div>
        </form>
      </div>
    </div>
  );
};

export default Registration;