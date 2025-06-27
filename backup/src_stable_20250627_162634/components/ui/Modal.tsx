import React, { useEffect } from 'react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({ open, onClose, title, children, className }) => {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        className={clsx(
          'bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 relative animate-slide-up',
          className
        )}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white focus:outline-none"
          aria-label="Chiudi"
        >
          ×
        </button>
        {title && <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>}
        {children}
      </div>
      <div className="fixed inset-0" onClick={onClose} />
    </div>
  );
};
