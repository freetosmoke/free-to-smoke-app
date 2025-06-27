import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select: React.FC<SelectProps> = ({ label, error, options, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-gray-300 text-sm font-medium mb-1.5">{label}</label>}
    <select
      className={`w-full bg-gray-800 border-2 rounded-xl py-3.5 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${error ? 'border-red-500' : 'border-gray-600'} ${className}`}
      {...props}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
  </div>
);

export default Select;
