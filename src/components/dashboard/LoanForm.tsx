import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { LoanData, calculateEMI } from '../../utils/loanCalculations'

interface LoanFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (loan: Omit<LoanData, 'id' | 'user_id'>) => void
  loan?: LoanData
}

export const LoanForm: React.FC<LoanFormProps> = ({ isOpen, onClose, onSubmit, loan }) => {
  const [formData, setFormData] = useState({
    loan_type: '',
    principal: '',
    interest_rate: '',
    tenure_months: '',
    start_date: '',
    emi_amount: 0
  })

  const loanTypes = [
    { value: 'Home Loan', label: 'Home Loan' },
    { value: 'Personal Loan', label: 'Personal Loan' },
    { value: 'Car Loan', label: 'Car Loan' },
    { value: 'Education Loan', label: 'Education Loan' },
    { value: 'Business Loan', label: 'Business Loan' },
    { value: 'Other', label: 'Other' }
  ]

  useEffect(() => {
    if (loan) {
      setFormData({
        loan_type: loan.loan_type,
        principal: loan.principal.toString(),
        interest_rate: loan.interest_rate.toString(),
        tenure_months: loan.tenure_months.toString(),
        start_date: loan.start_date,
        emi_amount: loan.emi_amount
      })
    } else {
      setFormData({
        loan_type: '',
        principal: '',
        interest_rate: '',
        tenure_months: '',
        start_date: '',
        emi_amount: 0
      })
    }
  }, [loan])

  useEffect(() => {
    if (formData.principal && formData.interest_rate && formData.tenure_months) {
      const principal = parseFloat(formData.principal)
      const rate = parseFloat(formData.interest_rate)
      const tenure = parseInt(formData.tenure_months)
      
      if (principal > 0 && rate > 0 && tenure > 0) {
        const emi = calculateEMI(principal, rate, tenure)
        setFormData(prev => ({ ...prev, emi_amount: emi }))
      }
    }
  }, [formData.principal, formData.interest_rate, formData.tenure_months])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      loan_type: formData.loan_type,
      principal: parseFloat(formData.principal),
      interest_rate: parseFloat(formData.interest_rate),
      tenure_months: parseInt(formData.tenure_months),
      start_date: formData.start_date,
      emi_amount: formData.emi_amount
    })
    onClose()
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={loan ? 'Edit Loan' : 'Add New Loan'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Select
            label="Loan Type"
            value={formData.loan_type}
            onChange={(e) => setFormData(prev => ({ ...prev, loan_type: e.target.value }))}
            options={loanTypes}
            required
          />
          
          <Input
            label="Principal Amount (₹)"
            type="number"
            value={formData.principal}
            onChange={(e) => setFormData(prev => ({ ...prev, principal: e.target.value }))}
            required
            min={1}
            step={1}
          />
          
          <Input
            label="Interest Rate (%)"
            type="number"
            value={formData.interest_rate}
            onChange={(e) => setFormData(prev => ({ ...prev, interest_rate: e.target.value }))}
            required
            min={0.1}
            max={30}
            step={0.01}
          />
          
          <Input
            label="Tenure (Months)"
            type="number"
            value={formData.tenure_months}
            onChange={(e) => setFormData(prev => ({ ...prev, tenure_months: e.target.value }))}
            required
            min={1}
            max={360}
            step={1}
          />
          
          <Input
            label="Start Date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
            required
          />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Calculated EMI
            </label>
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <span className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {formatCurrency(formData.emi_amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">
            {loan ? 'Update Loan' : 'Add Loan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}