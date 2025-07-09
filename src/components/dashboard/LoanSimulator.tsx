import React, { useState, useEffect, useCallback } from 'react'
import { PlusIcon, MinusIcon, CalendarIcon, CurrencyDollarIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { 
  LoanData, 
  PrepaymentData, 
  RateChangeData, 
  generateEMISchedule, 
  calculateSavings,
  calculateEMI,
  EMIScheduleItem
} from '../../utils/loanCalculations'

interface LoanSimulatorProps {
  loans: LoanData[]
}

interface SimulationLoanData {
  loan_type: string
  principal: number
  interest_rate: number
  tenure_months: number
  start_date: string
  emi_amount: number
}

interface SimulationResult {
  originalSchedule: EMIScheduleItem[]
  newSchedule: EMIScheduleItem[]
  interestSaved: number
  monthsSaved: number
  newDebtFreeDate: string
  newEMI?: number
}

export const LoanSimulator: React.FC<LoanSimulatorProps> = ({ loans }) => {
  const [activeTab, setActiveTab] = useState<'setup' | 'prepayment' | 'rate-change' | 'results'>('setup')
  const [prepayments, setPrepayments] = useState<PrepaymentData[]>([])
  const [rateChanges, setRateChanges] = useState<RateChangeData[]>([])
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)

  // Loan setup form state
  const [loanForm, setLoanForm] = useState<SimulationLoanData>({
    loan_type: '',
    principal: 0,
    interest_rate: 0,
    tenure_months: 0,
    start_date: new Date().toISOString().split('T')[0],
    emi_amount: 0
  })

  // Prepayment form state
  const [prepaymentForm, setPrepaymentForm] = useState({
    amount: '',
    date: '',
    type: 'one_time' as 'one_time' | 'recurring',
    frequency: 'monthly' as 'monthly' | 'yearly' | 'custom'
  })

  // Rate change form state
  const [rateChangeForm, setRateChangeForm] = useState({
    newRate: '',
    effectiveDate: ''
  })

  // Auto-calculate EMI when loan details change
  useEffect(() => {
    if (loanForm.principal > 0 && loanForm.interest_rate > 0 && loanForm.tenure_months > 0) {
      const calculatedEMI = calculateEMI(loanForm.principal, loanForm.interest_rate, loanForm.tenure_months)
      setLoanForm(prev => ({ ...prev, emi_amount: calculatedEMI }))
    }
  }, [loanForm.principal, loanForm.interest_rate, loanForm.tenure_months])

  const runSimulation = useCallback(() => {
    if (!loanForm.principal || !loanForm.interest_rate || !loanForm.tenure_months) return

    const tempLoan: LoanData = {
      id: 'temp-simulation',
      ...loanForm
    }

    const originalSchedule = generateEMISchedule(tempLoan)
    const newSchedule = generateEMISchedule(tempLoan, prepayments, rateChanges)
    
    const savings = calculateSavings(originalSchedule, newSchedule)
    
    // Calculate new EMI if there are rate changes
    let newEMI = loanForm.emi_amount
    if (rateChanges.length > 0) {
      newEMI = newSchedule.length > 0 ? newSchedule[0].emi : loanForm.emi_amount
    }

    setSimulation({
      originalSchedule,
      newSchedule,
      interestSaved: savings.interestSaved,
      monthsSaved: savings.monthsSaved,
      newDebtFreeDate: savings.debtFreeDate,
      newEMI
    })

    // Auto-switch to results tab
    setActiveTab('results')
  }, [loanForm, prepayments, rateChanges])

  const handlePrefillFromLoan = (loan: LoanData) => {
    setLoanForm({
      loan_type: loan.loan_type,
      principal: loan.principal,
      interest_rate: loan.interest_rate,
      tenure_months: loan.tenure_months,
      start_date: loan.start_date,
      emi_amount: loan.emi_amount
    })
    // Clear existing simulations
    setPrepayments([])
    setRateChanges([])
    setSimulation(null)
  }

  const handleAddPrepayment = () => {
    if (!prepaymentForm.amount || !prepaymentForm.date) return

    const newPrepayment: PrepaymentData = {
      id: `temp-${Date.now()}`,
      loan_id: 'temp-simulation',
      amount: parseFloat(prepaymentForm.amount),
      prepayment_date: prepaymentForm.date,
      prepayment_type: prepaymentForm.type,
      frequency: prepaymentForm.type === 'recurring' ? prepaymentForm.frequency : undefined
    }

    setPrepayments(prev => [...prev, newPrepayment])
    setPrepaymentForm({
      amount: '',
      date: '',
      type: 'one_time',
      frequency: 'monthly'
    })
  }

  const handleAddRateChange = () => {
    if (!rateChangeForm.newRate || !rateChangeForm.effectiveDate) return

    const newRateChange: RateChangeData = {
      id: `temp-${Date.now()}`,
      loan_id: 'temp-simulation',
      new_rate: parseFloat(rateChangeForm.newRate),
      effective_date: rateChangeForm.effectiveDate
    }

    setRateChanges(prev => [...prev, newRateChange])
    setRateChangeForm({
      newRate: '',
      effectiveDate: ''
    })
  }

  const handleRemovePrepayment = (id: string) => {
    setPrepayments(prev => prev.filter(p => p.id !== id))
  }

  const handleRemoveRateChange = (id: string) => {
    setRateChanges(prev => prev.filter(r => r.id !== id))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const tabs = [
    { id: 'setup', label: 'Loan Setup', icon: ClipboardDocumentListIcon },
    { id: 'prepayment', label: 'Prepayments', icon: CurrencyDollarIcon },
    { id: 'rate-change', label: 'Rate Changes', icon: CalendarIcon },
    { id: 'results', label: 'Results', icon: PlusIcon }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Loan Simulator
        </h2>
        <Button onClick={runSimulation} disabled={!loanForm.principal}>
          Run Simulation
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'setup' | 'prepayment' | 'rate-change' | 'results')}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'setup' && (
        <div className="space-y-6">
          {/* Prefill Options */}
          {loans.length > 0 && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Start - Use Existing Loan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loans.map((loan) => (
                  <div
                    key={loan.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                    onClick={() => handlePrefillFromLoan(loan)}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white">{loan.loan_type}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(loan.principal)} at {loan.interest_rate}%
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      EMI: {formatCurrency(loan.emi_amount)}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Manual Loan Setup */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Loan Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Loan Type"
                value={loanForm.loan_type}
                onChange={(e) => setLoanForm(prev => ({ ...prev, loan_type: e.target.value }))}
                placeholder="e.g., Home Loan, Personal Loan"
              />
              <Input
                type="number"
                label="Principal Amount"
                value={loanForm.principal || ''}
                onChange={(e) => setLoanForm(prev => ({ ...prev, principal: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter loan amount"
              />
              <Input
                type="number"
                label="Interest Rate (%)"
                value={loanForm.interest_rate || ''}
                onChange={(e) => setLoanForm(prev => ({ ...prev, interest_rate: parseFloat(e.target.value) || 0 }))}
                placeholder="Enter interest rate"
              />
              <Input
                type="number"
                label="Tenure (Months)"
                value={loanForm.tenure_months || ''}
                onChange={(e) => setLoanForm(prev => ({ ...prev, tenure_months: parseInt(e.target.value) || 0 }))}
                placeholder="Enter tenure in months"
              />
              <Input
                type="date"
                label="Start Date"
                value={loanForm.start_date}
                onChange={(e) => setLoanForm(prev => ({ ...prev, start_date: e.target.value }))}
              />
              <Input
                type="number"
                label="EMI Amount (Auto-calculated)"
                value={loanForm.emi_amount || ''}
                onChange={() => {}} // No-op for readOnly field
                readOnly
                className="bg-gray-50 dark:bg-gray-800"
              />
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'prepayment' && (
        <div className="space-y-4">
          {/* Add Prepayment Form */}
          <Card>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Prepayment
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Amount"
                value={prepaymentForm.amount}
                onChange={(e) => setPrepaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter prepayment amount"
              />
              <Input
                type="date"
                label="Date"
                value={prepaymentForm.date}
                onChange={(e) => setPrepaymentForm(prev => ({ ...prev, date: e.target.value }))}
              />
              <Select
                label="Type"
                value={prepaymentForm.type}
                onChange={(e) => setPrepaymentForm(prev => ({ ...prev, type: e.target.value as 'one_time' | 'recurring' }))}
                options={[
                  { value: 'one_time', label: 'One-time' },
                  { value: 'recurring', label: 'Recurring' }
                ]}
              />
              {prepaymentForm.type === 'recurring' && (
                <Select
                  label="Frequency"
                  value={prepaymentForm.frequency}
                  onChange={(e) => setPrepaymentForm(prev => ({ ...prev, frequency: e.target.value as 'monthly' | 'yearly' | 'custom' }))}
                  options={[
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'yearly', label: 'Yearly' },
                    { value: 'custom', label: 'Custom' }
                  ]}
                />
              )}
            </div>
            <div className="mt-4">
              <Button onClick={handleAddPrepayment}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Prepayment
              </Button>
            </div>
          </Card>

          {/* Existing Prepayments */}
          {prepayments.length > 0 && (
            <Card>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Added Prepayments
              </h4>
              <div className="space-y-3">
                {prepayments.map((prepayment) => (
                  <div key={prepayment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(prepayment.amount)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDate(prepayment.prepayment_date)} • {prepayment.prepayment_type}
                          {prepayment.frequency && ` (${prepayment.frequency})`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePrepayment(prepayment.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'rate-change' && (
        <div className="space-y-4">
          {/* Add Rate Change Form */}
          <Card>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Add Interest Rate Change
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="New Interest Rate (%)"
                value={rateChangeForm.newRate}
                onChange={(e) => setRateChangeForm(prev => ({ ...prev, newRate: e.target.value }))}
                placeholder="Enter new interest rate"
              />
              <Input
                type="date"
                label="Effective Date"
                value={rateChangeForm.effectiveDate}
                onChange={(e) => setRateChangeForm(prev => ({ ...prev, effectiveDate: e.target.value }))}
              />
            </div>
            <div className="mt-4">
              <Button onClick={handleAddRateChange}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Rate Change
              </Button>
            </div>
          </Card>

          {/* Existing Rate Changes */}
          {rateChanges.length > 0 && (
            <Card>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Added Rate Changes
              </h4>
              <div className="space-y-3">
                {rateChanges.map((rateChange) => (
                  <div key={rateChange.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CalendarIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {rateChange.new_rate}%
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Effective from {formatDate(rateChange.effective_date)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRateChange(rateChange.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {activeTab === 'results' && simulation && (
        <div className="space-y-6">
          {/* Simulation Results */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
              Simulation Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(simulation.interestSaved)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Interest Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {simulation.monthsSaved}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Months Saved</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {formatDate(simulation.newDebtFreeDate)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">New Debt-Free Date</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(simulation.newEMI || loanForm.emi_amount)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current EMI</p>
              </div>
            </div>
          </Card>

          {/* Schedule Comparison */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              EMI Schedule Comparison
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Original Schedule Summary */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Original Schedule Summary
                </h4>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Months:</span>
                    <span className="font-medium">{simulation.originalSchedule.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Interest:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      {formatCurrency(simulation.originalSchedule.reduce((sum, item) => sum + item.interest, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Debt-Free Date:</span>
                    <span className="font-medium">
                      {simulation.originalSchedule.length > 0 ? 
                        formatDate(simulation.originalSchedule[simulation.originalSchedule.length - 1].date) : 
                        'N/A'
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* New Schedule Summary */}
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                  Optimized Schedule Summary
                </h4>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Months:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{simulation.newSchedule.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Total Interest:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(simulation.newSchedule.reduce((sum, item) => sum + item.interest, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Debt-Free Date:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatDate(simulation.newDebtFreeDate)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Schedule Table */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                Detailed Schedule (First 12 months)
              </h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        EMI
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Principal
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Interest
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Prepayment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {simulation.newSchedule.slice(0, 12).map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {item.month}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.emi)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                          {formatCurrency(item.principal)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                          {formatCurrency(item.interest)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(item.balance)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                          {item.prepayment ? formatCurrency(item.prepayment) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {simulation.newSchedule.length > 12 && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                  Showing first 12 months of {simulation.newSchedule.length} total months
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
