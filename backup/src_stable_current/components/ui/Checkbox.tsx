import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  error?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, error, className = '', ...props }) => (
  <label className={`flex items-start gap-2 cursor-pointer select-none ${className}`}>
    <input
      type="checkbox"
      className="mt-1 accent-blue-600 w-5 h-5 rounded border-gray-400 focus:ring-2 focus:ring-blue-500 transition-all"
      {...props}
    />
    {label && <span className="text-sm text-gray-300">{label}</span>}
    {error && <span className="text-xs text-red-500 ml-2">{error}</span>}
  </label>
);

export default Checkbox;
