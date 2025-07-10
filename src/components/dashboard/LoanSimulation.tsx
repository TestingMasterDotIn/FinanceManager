import React, { useState, useEffect, useCallback } from 'react'
import { PlusIcon, MinusIcon, CalendarIcon, CurrencyDollarIcon, BookmarkIcon, EyeIcon } from '@heroicons/react/24/outline'
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
  SimulationResult,
  SavedSimulation
} from '../../utils/loanCalculations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface LoanSimulationProps {
  loan: LoanData
  isOpen: boolean
  onClose: () => void
}

export const LoanSimulation: React.FC<LoanSimulationProps> = ({ loan, isOpen, onClose }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'prepayment' | 'rate-change' | 'save-simulation' | 'saved' | 'compare'>('save-simulation')
  const [prepayments, setPrepayments] = useState<PrepaymentData[]>([])
  const [rateChanges, setRateChanges] = useState<RateChangeData[]>([])
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([])
  const [selectedSimulations, setSelectedSimulations] = useState<SavedSimulation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // We no longer need showSaveForm since we have a dedicated tab
  const [saveForm, setSaveForm] = useState({
    name: '',
    description: ''
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

  const runSimulation = useCallback((prepaymentData: PrepaymentData[], rateChangeData: RateChangeData[]) => {
    console.log('Running simulation with:', { prepaymentData, rateChangeData, loan })
    setIsLoading(true)
    
    // Simulate a brief loading time to provide visual feedback
    setTimeout(() => {
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

      const simulationResult = {
        originalSchedule,
        newSchedule,
        interestSaved: savings.interestSaved,
        monthsSaved: savings.monthsSaved,
        newDebtFreeDate: savings.debtFreeDate,
        newEMI
      }
      
      console.log('Simulation result:', simulationResult)
      console.log('Setting simulation state')
      setSimulation(simulationResult)
      setIsLoading(false)
    }, 300) // Short delay to provide feedback
  }, [loan])

  useEffect(() => {
    const fetchSimulationData = async () => {
      try {
        // Always generate a basic simulation first
        runSimulation([], [])
        
        // Then try to fetch existing data
        // Fetch existing prepayments
        const { data: prepaymentData, error: prepaymentError } = await supabase
          .from('prepayments')
          .select('*')
          .eq('loan_id', loan.id)
          .order('prepayment_date', { ascending: true })

        if (prepaymentError) {
          console.warn('Could not fetch prepayments:', prepaymentError)
        }

        // Fetch existing rate changes
        const { data: rateChangeData, error: rateChangeError } = await supabase
          .from('rate_changes')
          .select('*')
          .eq('loan_id', loan.id)
          .order('effective_date', { ascending: true })

        if (rateChangeError) {
          console.warn('Could not fetch rate changes:', rateChangeError)
        }

        // Fetch saved simulations
        const { data: savedSimulationData, error: savedSimulationError } = await supabase
          .from('saved_simulations')
          .select('*')
          .eq('loan_id', loan.id)
          .order('created_at', { ascending: false })

        if (savedSimulationError) {
          console.warn('Could not fetch saved simulations:', savedSimulationError)
        }

        setPrepayments(prepaymentData || [])
        setRateChanges(rateChangeData || [])
        setSavedSimulations(savedSimulationData || [])
        
        // Re-run simulation with fetched data
        if ((prepaymentData && prepaymentData.length > 0) || (rateChangeData && rateChangeData.length > 0)) {
          runSimulation(prepaymentData || [], rateChangeData || [])
        }
      } catch (error) {
        console.error('Error fetching simulation data:', error)
        // Always ensure we have a basic simulation
        runSimulation([], [])
      }
    }

    if (isOpen && loan) {
      fetchSimulationData()
    }
  }, [isOpen, loan, runSimulation])

  // Ensure we always run a basic simulation when the modal opens
  useEffect(() => {
    if (isOpen && loan && !simulation) {
      runSimulation([], [])
    }
  }, [isOpen, loan, simulation, runSimulation])

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

  const handleSaveSimulation = async () => {
    if (!saveForm.name.trim()) {
      alert('Please enter a simulation name.')
      return
    }

    // If no simulation has been run yet, run one with current data
    let currentSimulation = simulation
    if (!currentSimulation) {
      console.log('No simulation found, running one with current data before saving')
      const originalSchedule = generateEMISchedule(loan)
      const newSchedule = generateEMISchedule(loan, prepayments, rateChanges)
      const savings = calculateSavings(originalSchedule, newSchedule)
      
      let newEMI = loan.emi_amount
      if (rateChanges.length > 0) {
        newEMI = newSchedule.length > 0 ? newSchedule[0].emi : loan.emi_amount
      }

      currentSimulation = {
        originalSchedule,
        newSchedule,
        interestSaved: savings.interestSaved,
        monthsSaved: savings.monthsSaved,
        newDebtFreeDate: savings.debtFreeDate,
        newEMI
      }
      
      // Update the state for display
      setSimulation(currentSimulation)
    }

    setIsLoading(true)
    try {
      const savedSimulation = {
        user_id: user?.id || '',
        loan_id: loan.id,
        simulation_name: saveForm.name.trim(),
        description: saveForm.description.trim() || null,
        original_schedule: currentSimulation.originalSchedule,
        new_schedule: currentSimulation.newSchedule,
        interest_saved: currentSimulation.interestSaved,
        months_saved: currentSimulation.monthsSaved,
        new_debt_free_date: currentSimulation.newDebtFreeDate,
        new_emi: currentSimulation.newEMI,
        prepayments: prepayments,
        rate_changes: rateChanges
      }

      console.log('Attempting to save simulation:', savedSimulation)

      const { data, error } = await supabase
        .from('saved_simulations')
        .insert([savedSimulation])
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      console.log('Simulation saved successfully:', data)
      setSavedSimulations(prev => [data[0], ...prev])
      setSaveForm({ name: '', description: '' })
      // Switch to the saved tab to show the newly added simulation
      setActiveTab('saved')
      
      alert('Simulation saved successfully!')
    } catch (error) {
      console.error('Error saving simulation:', error)
      
      // Check if it's a table doesn't exist error
      if (error instanceof Error && error.message && error.message.includes('saved_simulations')) {
        alert('The saved simulations feature is not yet set up in the database. Please run the database migrations first.')
      } else {
        alert('Error saving simulation. Please try again. Check the console for more details.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSavedSimulation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_simulations')
        .delete()
        .eq('id', id)

      if (error) throw error

      setSavedSimulations(prev => prev.filter(sim => sim.id !== id))
      setSelectedSimulations(prev => prev.filter(sim => sim.id !== id))
    } catch (error) {
      console.error('Error deleting simulation:', error)
      alert('Error deleting simulation. Please try again.')
    }
  }

  const handleSelectSimulationForComparison = (simulation: SavedSimulation) => {
    if (selectedSimulations.find(sim => sim.id === simulation.id)) {
      setSelectedSimulations(prev => prev.filter(sim => sim.id !== simulation.id))
    } else if (selectedSimulations.length < 2) {
      setSelectedSimulations(prev => [...prev, simulation])
    } else {
      alert('You can only compare up to 2 simulations at a time.')
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
            <button
              onClick={() => setActiveTab('save-simulation')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'save-simulation'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                  : 'border-transparent text-green-600 hover:text-green-700 hover:border-green-500 dark:text-green-400 dark:hover:text-green-300'
              }`}
            >
              <BookmarkIcon className="h-5 w-5 mr-1 inline" />
              SAVE SIMULATION
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'saved'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Saved Simulations
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compare'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <EyeIcon className="h-4 w-4 mr-1 inline" />
              Compare ({selectedSimulations.length})
            </button>
          </nav>
        </div>

        {/* Simulation Controls - Only on prepayment and rate-change tabs */}
        {(activeTab === 'prepayment' || activeTab === 'rate-change') && (
          <div className="flex justify-between items-center">
            <Button
              onClick={() => runSimulation(prepayments, rateChanges)}
              variant="outline"
              disabled={isLoading}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400"
            >
              {isLoading ? 'Calculating...' : '🔄 Run Simulation'}
            </Button>
            {simulation && (
              <p className="text-sm text-green-600 dark:text-green-400">
                Simulation updated! You can save it in the "Save Simulation" tab.
              </p>
            )}
          </div>
        )}

        {/* Save Form has been moved to the save-simulation tab */}

        {/* Simulation Results - Show on prepayment and rate-change tabs */}
        {simulation && (activeTab === 'prepayment' || activeTab === 'rate-change') && (
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

        {activeTab === 'save-simulation' && (
          <div className="space-y-6">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border-2 border-green-500 shadow-md">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-green-700 dark:text-green-300 flex items-center">
                  <BookmarkIcon className="h-7 w-7 mr-2" />
                  Save Your Simulation
                </h2>
                {simulation && (
                  <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-green-900 dark:text-green-300">
                    Simulation Ready to Save
                  </span>
                )}
              </div>
              <p className="text-green-600 dark:text-green-400 mt-2">
                Save your current simulation configuration for future reference and comparison.
              </p>
            </div>
            
            {/* Save Simulation Form */}
            <Card className="border-2 border-green-200 dark:border-green-800 shadow-lg">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Name Your Simulation
              </h3>
              <div className="space-y-5">
                <Input
                  label="Simulation Name"
                  value={saveForm.name}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter a descriptive name (e.g., 'Extra 10k prepayment')"
                  required
                  className="border-green-200 focus:border-green-500 focus:ring-green-500"
                />
                <Input
                  label="Description (Optional)"
                  value={saveForm.description}
                  onChange={(e) => setSaveForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add notes about this scenario (e.g., 'Prepayment in month 6')"
                  className="border-green-200 focus:border-green-500 focus:ring-green-500"
                />
                <div className="flex flex-col sm:flex-row items-center gap-3 mt-6">
                  <Button
                    onClick={handleSaveSimulation}
                    disabled={!saveForm.name.trim() || isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
                  >
                    <BookmarkIcon className="h-5 w-5 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Simulation Now'}
                  </Button>
                  <Button
                    onClick={() => runSimulation(prepayments, rateChanges)}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800 w-full sm:w-auto"
                  >
                    🔄 Run Simulation First
                  </Button>
                </div>
              </div>
            </Card>

            {/* Display current simulation results */}
            {simulation && (
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Current Simulation Results
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
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Saved Simulations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {savedSimulations.length} simulation(s) saved
              </p>
            </div>
            
            {savedSimulations.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <BookmarkIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No saved simulations
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Create a simulation and save it to view it here
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-3">
                {savedSimulations.map((savedSimulation) => (
                  <Card key={savedSimulation.id} className="hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {savedSimulation.simulation_name}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(savedSimulation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {savedSimulation.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            {savedSimulation.description}
                          </p>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(savedSimulation.interest_saved)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Interest Saved</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                              {savedSimulation.months_saved}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Months Saved</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {formatDate(savedSimulation.new_debt_free_date)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">New Debt-Free Date</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                              {formatCurrency(savedSimulation.new_emi || 0)}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">EMI</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span>
                            {savedSimulation.prepayments?.length || 0} Prepayments
                          </span>
                          <span>
                            {savedSimulation.rate_changes?.length || 0} Rate Changes
                          </span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Load the saved simulation data into the current state
                            if (savedSimulation.prepayments) setPrepayments(savedSimulation.prepayments);
                            if (savedSimulation.rate_changes) setRateChanges(savedSimulation.rate_changes);
                            
                            // Run the simulation with the saved data
                            runSimulation(
                              savedSimulation.prepayments || [],
                              savedSimulation.rate_changes || []
                            );
                          }}
                          className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-800"
                        >
                          🔄 Run
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectSimulationForComparison(savedSimulation)}
                          className={`${
                            selectedSimulations.find(sim => sim.id === savedSimulation.id)
                              ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                              : ''
                          }`}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          {selectedSimulations.find(sim => sim.id === savedSimulation.id) ? 'Selected' : 'Compare'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSavedSimulation(savedSimulation.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <MinusIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Compare Simulations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedSimulations.length}/2 simulations selected
              </p>
            </div>

            {selectedSimulations.length === 0 ? (
              <Card>
                <div className="text-center py-8">
                  <EyeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No simulations selected
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    Go to the "Saved Simulations" tab and select up to 2 simulations to compare
                  </p>
                </div>
              </Card>
            ) : selectedSimulations.length === 1 ? (
              <Card>
                <div className="text-center py-8">
                  <EyeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Select one more simulation
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    You've selected "{selectedSimulations[0].simulation_name}". Select one more to compare.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Comparison Header */}
                <div className="grid grid-cols-2 gap-6">
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      {selectedSimulations[0].simulation_name}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {selectedSimulations[0].description || 'No description'}
                    </p>
                  </Card>
                  <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <h4 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                      {selectedSimulations[1].simulation_name}
                    </h4>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {selectedSimulations[1].description || 'No description'}
                    </p>
                  </Card>
                </div>

                {/* Comparison Table */}
                <Card>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Comparison Results
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left py-2 px-4 font-medium text-gray-900 dark:text-white">Metric</th>
                          <th className="text-left py-2 px-4 font-medium text-blue-900 dark:text-blue-100">
                            {selectedSimulations[0].simulation_name}
                          </th>
                          <th className="text-left py-2 px-4 font-medium text-green-900 dark:text-green-100">
                            {selectedSimulations[1].simulation_name}
                          </th>
                          <th className="text-left py-2 px-4 font-medium text-purple-900 dark:text-purple-100">Difference</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">Interest Saved</td>
                          <td className="py-2 px-4 text-blue-600 dark:text-blue-400">
                            {formatCurrency(selectedSimulations[0].interest_saved)}
                          </td>
                          <td className="py-2 px-4 text-green-600 dark:text-green-400">
                            {formatCurrency(selectedSimulations[1].interest_saved)}
                          </td>
                          <td className="py-2 px-4 text-purple-600 dark:text-purple-400">
                            {formatCurrency(Math.abs(selectedSimulations[1].interest_saved - selectedSimulations[0].interest_saved))}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">Months Saved</td>
                          <td className="py-2 px-4 text-blue-600 dark:text-blue-400">
                            {selectedSimulations[0].months_saved}
                          </td>
                          <td className="py-2 px-4 text-green-600 dark:text-green-400">
                            {selectedSimulations[1].months_saved}
                          </td>
                          <td className="py-2 px-4 text-purple-600 dark:text-purple-400">
                            {Math.abs(selectedSimulations[1].months_saved - selectedSimulations[0].months_saved)}
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">New Debt-Free Date</td>
                          <td className="py-2 px-4 text-blue-600 dark:text-blue-400">
                            {formatDate(selectedSimulations[0].new_debt_free_date)}
                          </td>
                          <td className="py-2 px-4 text-green-600 dark:text-green-400">
                            {formatDate(selectedSimulations[1].new_debt_free_date)}
                          </td>
                          <td className="py-2 px-4 text-purple-600 dark:text-purple-400">
                            {Math.abs(
                              Math.ceil((new Date(selectedSimulations[1].new_debt_free_date).getTime() - 
                                        new Date(selectedSimulations[0].new_debt_free_date).getTime()) / (1000 * 60 * 60 * 24))
                            )} days
                          </td>
                        </tr>
                        <tr>
                          <td className="py-2 px-4 font-medium text-gray-900 dark:text-white">EMI</td>
                          <td className="py-2 px-4 text-blue-600 dark:text-blue-400">
                            {formatCurrency(selectedSimulations[0].new_emi || 0)}
                          </td>
                          <td className="py-2 px-4 text-green-600 dark:text-green-400">
                            {formatCurrency(selectedSimulations[1].new_emi || 0)}
                          </td>
                          <td className="py-2 px-4 text-purple-600 dark:text-purple-400">
                            {formatCurrency(Math.abs((selectedSimulations[1].new_emi || 0) - (selectedSimulations[0].new_emi || 0)))}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
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
