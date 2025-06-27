import React from 'react';

export const Loader: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={
      'inline-block w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin ' +
      (className || '')
    }
    aria-label="Caricamento"
  />
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <span
    className={
      'block bg-gray-700/50 rounded animate-pulse ' +
      (className || '')
    }
    aria-hidden="true"
  />
);
