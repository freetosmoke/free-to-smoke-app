import React from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const baseStyles =
  'inline-flex items-center justify-center font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary:
    'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-400',
  success:
    'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  warning:
    'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400',
  error:
    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost:
    'bg-transparent text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-blue-400',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-5 py-2.5',
  lg: 'text-lg px-7 py-3',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}) => (
  <button
    className={clsx(
      baseStyles,
      variantStyles[variant],
      sizeStyles[size],
      className
    )}
    disabled={disabled || loading}
    {...props}
  >
    {loading ? (
      <span className="animate-spin mr-2 w-4 h-4 border-2 border-t-transparent border-white rounded-full" />
    ) : (
      leftIcon && <span className="mr-2">{leftIcon}</span>
    )}
    <span>{children}</span>
    {rightIcon && <span className="ml-2">{rightIcon}</span>}
  </button>
);
