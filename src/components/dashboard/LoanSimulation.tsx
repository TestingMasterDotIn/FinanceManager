import React, { useState, useEffect, useCallback } from 'react'
import { PlusIcon, MinusIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { 
  LoanData, 
  PrepaymentData, 
  RateChangeData, 
  generateEMISchedule, 
  calculateSavings,
  EMIScheduleItem
} from '../../utils/loanCalculations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface LoanSimulationProps {
  loan: LoanData
  isOpen: boolean
  onClose: () => void
}

interface SimulationResult {
  originalSchedule: EMIScheduleItem[]
  newSchedule: EMIScheduleItem[]
  interestSaved: number
  monthsSaved: number
  newDebtFreeDate: string
  newEMI?: number
}

export const LoanSimulation: React.FC<LoanSimulationProps> = ({ loan, isOpen, onClose }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'prepayment' | 'rate-change'>('prepayment')
  const [prepayments, setPrepayments] = useState<PrepaymentData[]>([])
  const [rateChanges, setRateChanges] = useState<RateChangeData[]>([])
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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

  const runSimulation = useCallback((prepaymentData: PrepaymentData[], rateChangeData: RateChangeData[]) => {
    const originalSchedule = generateEMISchedule(loan)
    const newSchedule = generateEMISchedule(loan, prepaymentData, rateChangeData)
    
    const savings = calculateSavings(originalSchedule, newSchedule)
    
    // Calculate new EMI if there are rate changes
    let newEMI = loan.emi_amount
    if (rateChangeData.length > 0) {
      // EMI recalculation would happen in the generateEMISchedule function
      // For display purposes, we'll show the original EMI unless there's a rate change
      newEMI = newSchedule.length > 0 ? newSchedule[0].emi : loan.emi_amount
    }

    setSimulation({
      originalSchedule,
      newSchedule,
      interestSaved: savings.interestSaved,
      monthsSaved: savings.monthsSaved,
      newDebtFreeDate: savings.debtFreeDate,
      newEMI
    })
  }, [loan])

  useEffect(() => {
    const fetchSimulationData = async () => {
      try {
        // Fetch existing prepayments
        const { data: prepaymentData, error: prepaymentError } = await supabase
          .from('prepayments')
          .select('*')
          .eq('loan_id', loan.id)
          .order('prepayment_date', { ascending: true })

        if (prepaymentError) throw prepaymentError

        // Fetch existing rate changes
        const { data: rateChangeData, error: rateChangeError } = await supabase
          .from('rate_changes')
          .select('*')
          .eq('loan_id', loan.id)
          .order('effective_date', { ascending: true })

        if (rateChangeError) throw rateChangeError

        setPrepayments(prepaymentData || [])
        setRateChanges(rateChangeData || [])
        
        // Calculate initial simulation
        runSimulation(prepaymentData || [], rateChangeData || [])
      } catch (error) {
        console.error('Error fetching simulation data:', error)
      }
    }

    if (isOpen && loan) {
      fetchSimulationData()
    }
  }, [isOpen, loan, runSimulation])

  const handleAddPrepayment = async () => {
    if (!prepaymentForm.amount || !prepaymentForm.date) return

    setIsLoading(true)
    try {
      const newPrepayment = {
        loan_id: loan.id,
        user_id: user?.id || '',
        amount: parseFloat(prepaymentForm.amount),
        prepayment_date: prepaymentForm.date,
        prepayment_type: prepaymentForm.type,
        frequency: prepaymentForm.type === 'recurring' ? prepaymentForm.frequency : undefined
      }

      const { data, error } = await supabase
        .from('prepayments')
        .insert([newPrepayment])
        .select()

      if (error) throw error

      const updatedPrepayments = [...prepayments, data[0]]
      setPrepayments(updatedPrepayments)
      runSimulation(updatedPrepayments, rateChanges)

      setPrepaymentForm({
        amount: '',
        date: '',
        type: 'one_time',
        frequency: 'monthly'
      })
    } catch (error) {
      console.error('Error adding prepayment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddRateChange = async () => {
    if (!rateChangeForm.newRate || !rateChangeForm.effectiveDate) return

    setIsLoading(true)
    try {
      const newRateChange = {
        loan_id: loan.id,
        user_id: user?.id || '',
        new_rate: parseFloat(rateChangeForm.newRate),
        effective_date: rateChangeForm.effectiveDate
      }

      const { data, error } = await supabase
        .from('rate_changes')
        .insert([newRateChange])
        .select()

      if (error) throw error

      const updatedRateChanges = [...rateChanges, data[0]]
      setRateChanges(updatedRateChanges)
      runSimulation(prepayments, updatedRateChanges)

      setRateChangeForm({
        newRate: '',
        effectiveDate: ''
      })
    } catch (error) {
      console.error('Error adding rate change:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemovePrepayment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prepayments')
        .delete()
        .eq('id', id)

      if (error) throw error

      const updatedPrepayments = prepayments.filter(p => p.id !== id)
      setPrepayments(updatedPrepayments)
      runSimulation(updatedPrepayments, rateChanges)
    } catch (error) {
      console.error('Error removing prepayment:', error)
    }
  }

  const handleRemoveRateChange = async (id: string) => {
    try {
      const { error } = await supabase
        .from('rate_changes')
        .delete()
        .eq('id', id)

      if (error) throw error

      const updatedRateChanges = rateChanges.filter(r => r.id !== id)
      setRateChanges(updatedRateChanges)
      runSimulation(prepayments, updatedRateChanges)
    } catch (error) {
      console.error('Error removing rate change:', error)
    }
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

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={`Loan Simulation - ${loan.loan_type}`}
      size="xl"
      allowMaximize={true}
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('prepayment')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'prepayment'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Prepayments
            </button>
            <button
              onClick={() => setActiveTab('rate-change')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'rate-change'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Rate Changes
            </button>
          </nav>
        </div>

        {/* Simulation Results */}
        {simulation && (
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
                  {formatCurrency(simulation.newEMI || loan.emi_amount)}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Current EMI</p>
              </div>
            </div>
          </Card>
        )}

        {/* Tab Content */}
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
                <Button onClick={handleAddPrepayment} disabled={isLoading}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Prepayment
                </Button>
              </div>
            </Card>

            {/* Existing Prepayments */}
            {prepayments.length > 0 && (
              <Card>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Existing Prepayments
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
                <Button onClick={handleAddRateChange} disabled={isLoading}>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Rate Change
                </Button>
              </div>
            </Card>

            {/* Existing Rate Changes */}
            {rateChanges.length > 0 && (
              <Card>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Existing Rate Changes
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

        {/* EMI Schedule Table (only show when maximized or when there's simulation data) */}
        {simulation && (
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
        )}
      </div>
    </Modal>
  )
}
