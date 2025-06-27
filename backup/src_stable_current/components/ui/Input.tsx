import React from 'react';
import clsx from 'clsx';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  className,
  wrapperClassName,
  ...props
}) => (
  <div className={clsx('w-full', wrapperClassName)}>
    {label && (
      <label className="block text-gray-300 text-sm font-medium mb-2">{label}</label>
    )}
    <div className="relative">
      {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{leftIcon}</span>}
      <input
        className={clsx(
          'w-full bg-gray-800 border border-gray-600 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition',
          error && 'border-red-500 focus:ring-red-500',
          leftIcon && 'pl-11',
          rightIcon && 'pr-11',
          className
        )}
        {...props}
      />
      {rightIcon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{rightIcon}</span>}
    </div>
    {helper && !error && <div className="text-xs text-gray-400 mt-1">{helper}</div>}
    {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
  </div>
);
