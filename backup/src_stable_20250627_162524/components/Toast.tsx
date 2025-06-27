import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, XCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  const iconMap = {
    success: <CheckCircle className="w-5 h-5 text-green-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-400" />
  };

  const bgColorMap = {
    success: 'bg-green-900/20 border-green-500/30',
    error: 'bg-red-900/20 border-red-500/30',
    warning: 'bg-yellow-900/20 border-yellow-500/30'
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div className={`flex items-center p-4 rounded-lg border backdrop-blur-sm ${bgColorMap[type]} min-w-80`}>
        {iconMap[type]}
        <span className="ml-3 text-white flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-3 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;