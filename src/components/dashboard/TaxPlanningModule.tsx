import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { CalculatorIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'

interface TaxCalculation {
  grossIncome: number
  standardDeduction: number
  section80C: number
  section80D: number
  otherDeductions: number
  taxableIncome: number
  incomeTax: number
  cess: number
  totalTax: number
  takeHome: number
}

export const TaxPlanningModule: React.FC = () => {
  const [income, setIncome] = useState('')
  const [regime, setRegime] = useState<'old' | 'new'>('new')
  const [deductions, setDeductions] = useState({
    section80C: '',
    section80D: '',
    homeLoanInterest: '',
    otherDeductions: ''
  })
  const [calculation, setCalculation] = useState<TaxCalculation | null>(null)

  // New Tax Regime Slabs (FY 2023-24)
  const newTaxSlabs = [
    { min: 0, max: 300000, rate: 0 },
    { min: 300000, max: 600000, rate: 5 },
    { min: 600000, max: 900000, rate: 10 },
    { min: 900000, max: 1200000, rate: 15 },
    { min: 1200000, max: 1500000, rate: 20 },
    { min: 1500000, max: Infinity, rate: 30 }
  ]

  // Old Tax Regime Slabs
  const oldTaxSlabs = [
    { min: 0, max: 250000, rate: 0 },
    { min: 250000, max: 500000, rate: 5 },
    { min: 500000, max: 1000000, rate: 20 },
    { min: 1000000, max: Infinity, rate: 30 }
  ]

  const calculateTax = (taxableIncome: number, slabs: typeof newTaxSlabs) => {
    let tax = 0
    for (const slab of slabs) {
      if (taxableIncome > slab.min) {
        const taxableInThisSlab = Math.min(taxableIncome - slab.min, slab.max - slab.min)
        tax += (taxableInThisSlab * slab.rate) / 100
      }
    }
    return tax
  }

  const handleCalculate = () => {
    const grossIncome = parseFloat(income) || 0
    const standardDeduction = regime === 'new' ? 50000 : 50000
    
    let totalDeductions = standardDeduction
    
    if (regime === 'old') {
      totalDeductions += Math.min(parseFloat(deductions.section80C) || 0, 150000)
      totalDeductions += Math.min(parseFloat(deductions.section80D) || 0, 25000)
      totalDeductions += parseFloat(deductions.homeLoanInterest) || 0
      totalDeductions += parseFloat(deductions.otherDeductions) || 0
    }

    const taxableIncome = Math.max(grossIncome - totalDeductions, 0)
    const slabs = regime === 'new' ? newTaxSlabs : oldTaxSlabs
    const incomeTax = calculateTax(taxableIncome, slabs)
    const cess = incomeTax * 0.04 // 4% Health & Education Cess
    const totalTax = incomeTax + cess
    const takeHome = grossIncome - totalTax

    setCalculation({
      grossIncome,
      standardDeduction,
      section80C: regime === 'old' ? Math.min(parseFloat(deductions.section80C) || 0, 150000) : 0,
      section80D: regime === 'old' ? Math.min(parseFloat(deductions.section80D) || 0, 25000) : 0,
      otherDeductions: regime === 'old' ? (parseFloat(deductions.homeLoanInterest) || 0) + (parseFloat(deductions.otherDeductions) || 0) : 0,
      taxableIncome,
      incomeTax,
      cess,
      totalTax,
      takeHome
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const taxSavingInvestments = [
    { name: 'ELSS Mutual Funds', limit: '₹1.5L', returns: '12-15% p.a.', lockIn: '3 years' },
    { name: 'PPF', limit: '₹1.5L', returns: '7.1% p.a.', lockIn: '15 years' },
    { name: 'Life Insurance Premium', limit: '₹1.5L', returns: 'Variable', lockIn: 'Policy term' },
    { name: 'NSC', limit: '₹1.5L', returns: '6.8% p.a.', lockIn: '5 years' },
    { name: 'ULIP', limit: '₹1.5L', returns: '8-12% p.a.', lockIn: '5 years' },
    { name: 'Home Loan Principal', limit: '₹1.5L', returns: 'Tax benefit', lockIn: 'Loan tenure' }
  ]

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center space-x-2 mb-6">
          <CalculatorIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tax Calculator
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <div>
              <Select
                label="Tax Regime"
                value={regime}
                onChange={(e) => setRegime(e.target.value as 'old' | 'new')}
                options={[
                  { value: 'new', label: 'New Tax Regime (Higher exemption, No deductions)' },
                  { value: 'old', label: 'Old Tax Regime (Lower exemption, With deductions)' }
                ]}
              />
            </div>

            <Input
              type="number"
              label="Annual Gross Income (₹)"
              placeholder="1200000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />

            {regime === 'old' && (
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">Deductions</h4>
                <Input
                  type="number"
                  label="Section 80C (Max ₹1.5L)"
                  placeholder="150000"
                  value={deductions.section80C}
                  onChange={(e) => setDeductions(prev => ({ ...prev, section80C: e.target.value }))}
                />
                <Input
                  type="number"
                  label="Section 80D - Health Insurance (Max ₹25K)"
                  placeholder="25000"
                  value={deductions.section80D}
                  onChange={(e) => setDeductions(prev => ({ ...prev, section80D: e.target.value }))}
                />
                <Input
                  type="number"
                  label="Home Loan Interest (Max ₹2L)"
                  placeholder="200000"
                  value={deductions.homeLoanInterest}
                  onChange={(e) => setDeductions(prev => ({ ...prev, homeLoanInterest: e.target.value }))}
                />
                <Input
                  type="number"
                  label="Other Deductions"
                  placeholder="50000"
                  value={deductions.otherDeductions}
                  onChange={(e) => setDeductions(prev => ({ ...prev, otherDeductions: e.target.value }))}
                />
              </div>
            )}

            <Button onClick={handleCalculate} className="w-full">
              Calculate Tax
            </Button>
          </div>

          {/* Results Section */}
          <div>
            {calculation && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6 rounded-lg"
              >
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Tax Calculation</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Gross Income:</span>
                    <span className="font-semibold">{formatCurrency(calculation.grossIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Standard Deduction:</span>
                    <span className="text-green-600">-{formatCurrency(calculation.standardDeduction)}</span>
                  </div>
                  {regime === 'old' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Section 80C:</span>
                        <span className="text-green-600">-{formatCurrency(calculation.section80C)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Section 80D:</span>
                        <span className="text-green-600">-{formatCurrency(calculation.section80D)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Other Deductions:</span>
                        <span className="text-green-600">-{formatCurrency(calculation.otherDeductions)}</span>
                      </div>
                    </>
                  )}
                  <hr className="border-gray-200 dark:border-gray-600" />
                  <div className="flex justify-between font-semibold">
                    <span>Taxable Income:</span>
                    <span>{formatCurrency(calculation.taxableIncome)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Income Tax:</span>
                    <span className="text-red-600">{formatCurrency(calculation.incomeTax)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Health & Education Cess (4%):</span>
                    <span className="text-red-600">{formatCurrency(calculation.cess)}</span>
                  </div>
                  <hr className="border-gray-200 dark:border-gray-600" />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Tax:</span>
                    <span className="text-red-600">{formatCurrency(calculation.totalTax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Take Home:</span>
                    <span className="text-green-600">{formatCurrency(calculation.takeHome)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </Card>

      {/* Tax Saving Investments */}
      <Card>
        <div className="flex items-center space-x-2 mb-6">
          <DocumentTextIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tax Saving Investment Options (Section 80C)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {taxSavingInvestments.map((investment, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
            >
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {investment.name}
              </h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Limit:</span>
                  <span className="font-medium">{investment.limit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Returns:</span>
                  <span className="font-medium text-green-600">{investment.returns}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Lock-in:</span>
                  <span className="font-medium">{investment.lockIn}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Pro Tips for Tax Savings
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Start investing early in the financial year to spread the burden</li>
            <li>• ELSS funds offer the shortest lock-in period with good returns</li>
            <li>• PPF provides tax-free returns and is completely safe</li>
            <li>• Home loan principal repayment also qualifies for 80C deduction</li>
            <li>• Health insurance premiums save tax under Section 80D</li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
