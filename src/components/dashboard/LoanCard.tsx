import React from 'react'
import { PencilIcon, TrashIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { LoanData, calculateLoanAnalytics } from '../../utils/loanCalculations'

interface LoanCardProps {
  loan: LoanData
  onEdit: (loan: LoanData) => void
  onDelete: (id: string) => void
}

export const LoanCard: React.FC<LoanCardProps> = ({ loan, onEdit, onDelete }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getLoanTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'home loan':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
      case 'personal loan':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      case 'car loan':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
    }
  }

  // Calculate loan analytics to get paid interest
  const loanAnalytics = calculateLoanAnalytics(loan)

  return (
    <Card hover className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {loan.custom_name || loan.loan_type}
            </h3>
            {loan.custom_name && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {loan.loan_type}
              </p>
            )}
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getLoanTypeColor(loan.loan_type)}`}>
              {loan.loan_type}
            </span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(loan)}
            className="p-2"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(loan.id)}
            className="p-2 text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Principal</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(loan.principal)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Current Outstanding</p>
          <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
            {formatCurrency(loan.outstanding_balance)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Interest Rate</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {loan.interest_rate}%
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">EMI</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {formatCurrency(loan.emi_amount)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tenure</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {loan.tenure_months} months
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Interest Paid (till date)</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(loanAnalytics.paidInterest)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Principal Paid</p>
          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
            {formatCurrency(loan.principal - loan.outstanding_balance)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Interest (till loan tenure)</p>
          <p className="text-lg font-semibold text-red-600 dark:text-red-400">
            {formatCurrency(loanAnalytics.totalInterest)}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Started</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {new Date(loan.start_date).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  )
}