import React from 'react'

interface InputProps {
  label?: string
  type?: string
  value: string | number
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  className?: string
  min?: number
  max?: number
  step?: number
}

export const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required,
  className = '',
  min,
  max,
  step
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        step={step}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
      />
    </div>
  )
}