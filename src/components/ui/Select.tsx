import React from 'react'

interface SelectProps {
  label?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string; label: string }[]
  className?: string
  required?: boolean
}

export const Select: React.FC<SelectProps> = ({
  label,
  value,
  onChange,
  options,
  className = '',
  required
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white transition-colors"
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}