import React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  shadow?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

const variantStyles = {
  default: 'bg-gray-800/50 border border-gray-700',
  primary: 'bg-blue-800/40 border border-blue-500/30',
  success: 'bg-green-800/40 border border-green-500/30',
  warning: 'bg-yellow-800/40 border border-yellow-500/30',
  error: 'bg-red-800/40 border border-red-500/30',
};

export const Card: React.FC<CardProps> = ({
  children,
  shadow = true,
  variant = 'default',
  className,
  ...props
}) => (
  <div
    className={clsx(
      'rounded-2xl p-6',
      variantStyles[variant],
      shadow && 'shadow-lg shadow-black/10',
      className
    )}
    {...props}
  >
    {children}
  </div>
);
