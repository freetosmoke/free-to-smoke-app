import React, { useState, useEffect } from 'react';
import DebugPanel from './DebugPanel';
import { debugSystem, useDebug } from '../utils/debugSystem';

interface DebugButtonProps {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showInProduction?: boolean;
}

const DebugButton: React.FC<DebugButtonProps> = ({ 
  position = 'bottom-right',
  showInProduction = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [isBlinking, setIsBlinking] = useState(false);
  const debug = useDebug('DebugButton');

  // Non mostrare in produzione a meno che non sia esplicitamente richiesto
  const shouldShow = process.env.NODE_ENV === 'development' || showInProduction;

  useEffect(() => {
    // Monitora gli errori per far lampeggiare il pulsante
    const handleError = () => {
      setErrorCount(prev => prev + 1);
      setIsBlinking(true);
      
      // Ferma il lampeggio dopo 3 secondi
      setTimeout(() => setIsBlinking(false), 3000);
    };

    debugSystem.onError(handleError);
    
    // Aggiorna il conteggio errori periodicamente
    const updateErrorCount = () => {
      const stats = debugSystem.getLogStats();
      setErrorCount(stats.byLevel['error'] || 0);
    };

    const interval = setInterval(updateErrorCount, 5000);
    updateErrorCount();

    return () => {
      clearInterval(interval);
    };
  }, []);

  const getPositionClasses = () => {
    const positions = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    };
    return positions[position];
  };

  const handleToggle = () => {
    debug.info('Debug panel toggled', { wasOpen: isOpen });
    setIsOpen(!isOpen);
    setIsBlinking(false); // Ferma il lampeggio quando si apre il panel
  };

  if (!shouldShow) return null;

  return (
    <>
      {/* Pulsante Debug */}
      <div className={`fixed ${getPositionClasses()} z-40`}>
        <button
          onClick={handleToggle}
          className={`
            relative w-14 h-14 bg-gray-800 hover:bg-gray-700 text-white rounded-full 
            shadow-lg transition-all duration-200 flex items-center justify-center
            ${isBlinking ? 'animate-pulse bg-red-600 hover:bg-red-500' : ''}
          `}
          title="Apri Debug Panel"
        >
          {/* Icona Debug */}
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" 
            />
          </svg>
          
          {/* Badge conteggio errori */}
          {errorCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
              {errorCount > 99 ? '99+' : errorCount}
            </div>
          )}
        </button>
      </div>

      {/* Panel Debug */}
      <DebugPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default DebugButton;