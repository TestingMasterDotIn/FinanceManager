import React, { useState, useEffect, useCallback, useRef } from 'react'
import { PlusIcon, MinusIcon, CalendarIcon, CurrencyDollarIcon, ClipboardDocumentListIcon, BookmarkIcon } from '@heroicons/react/24/outline'
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
  calculateEMI,
  SimulationResult,
  SavedSimulation
} from '../../utils/loanCalculations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

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

export const LoanSimulator: React.FC<LoanSimulatorProps> = ({ loans }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<'setup' | 'prepayment' | 'rate-change' | 'results' | 'saved' | 'compare'>('setup')
  const [prepayments, setPrepayments] = useState<PrepaymentData[]>([])
  const [rateChanges, setRateChanges] = useState<RateChangeData[]>([])
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([])
  const [isLoadingSaved, setIsLoadingSaved] = useState(false)
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [simulationName, setSimulationName] = useState('')
  const [runSimulationOnSave, setRunSimulationOnSave] = useState(false)
  const [simulationToDelete, setSimulationToDelete] = useState<string | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const tabContentRef = useRef<HTMLDivElement>(null)
  
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
      id: '', // Empty string for temporary simulation
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

    // Auto-switch to results tab and scroll to it
    handleTabClick('results')
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
      loan_id: '', // Empty string for temporary prepayments
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
      loan_id: '', // Empty string for temporary rate changes
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
  
  const loadSavedSimulation = (sim: SavedSimulation) => {
    try {
      // Find loan type, principal, and interest rate from the simulation data
      const loanDetails = {
        loan_type: sim.simulation_name.replace(' Simulation', ''),
        principal: sim.original_schedule && sim.original_schedule.length > 0 
          ? sim.original_schedule[0].balance + sim.original_schedule[0].principal
          : 0,
        interest_rate: sim.original_schedule && sim.original_schedule.length > 0
          ? (sim.original_schedule[0].interest * 12 * 100) / 
            (sim.original_schedule[0].balance + sim.original_schedule[0].principal)
          : 0,
        tenure_months: sim.original_schedule ? sim.original_schedule.length : 0,
        start_date: sim.original_schedule && sim.original_schedule.length > 0
          ? sim.original_schedule[0].date
          : new Date().toISOString().split('T')[0],
        emi_amount: sim.original_schedule && sim.original_schedule.length > 0
          ? sim.original_schedule[0].emi
          : 0
      }
      
      // Set loan form with extracted details
      setLoanForm(loanDetails);
      
      // Set prepayments and rate changes if available
      if (sim.prepayments && Array.isArray(sim.prepayments)) {
        // Generate fresh IDs for the prepayments
        const prepaymentWithNewIds = sim.prepayments.map(p => ({
          ...p,
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        setPrepayments(prepaymentWithNewIds);
      } else {
        setPrepayments([]);
      }
      
      if (sim.rate_changes && Array.isArray(sim.rate_changes)) {
        // Generate fresh IDs for the rate changes
        const rateChangesWithNewIds = sim.rate_changes.map(r => ({
          ...r,
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        }));
        setRateChanges(rateChangesWithNewIds);
      } else {
        setRateChanges([]);
      }
      
      // Run the simulation with the loaded data
      setTimeout(() => {
        runSimulation();
      }, 100);
    } catch (error) {
      console.error('Error loading saved simulation:', error);
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

  const tabs = [
    { id: 'setup', label: 'Loan Setup', icon: ClipboardDocumentListIcon },
    { id: 'prepayment', label: 'Prepayments', icon: CurrencyDollarIcon },
    { id: 'rate-change', label: 'Rate Changes', icon: CalendarIcon },
    { id: 'results', label: 'Results', icon: PlusIcon },
    { id: 'saved', label: 'Saved', icon: BookmarkIcon }
  ]

  const handleSaveSimulation = async (runSimulationFirst = false) => {
    // Store the runSimulationFirst flag for later use
    setRunSimulationOnSave(runSimulationFirst)
    
    // Set default simulation name
    setSimulationName(`${loanForm.loan_type} Simulation`)
    
    // Open the name modal
    setIsNameModalOpen(true)
  }
  
  const saveSimulationWithName = async () => {
    setIsSaving(true)
    setSaveStatus('idle')
    setIsNameModalOpen(false)

    if (!user) {
      setIsSaving(false)
      return
    }

    // If we need to run the simulation first and we don't have simulation results yet
    if (runSimulationOnSave && !simulation) {
      // Run the simulation if we have all required loan details
      if (loanForm.principal && loanForm.interest_rate && loanForm.tenure_months) {
        runSimulation();
      }
      setIsSaving(false)
      return;
    }

    try {
      // If we have simulation results, use them; otherwise create a minimal record
      const simulationData = simulation ? {
        original_schedule: simulation.originalSchedule,
        new_schedule: simulation.newSchedule,
        interest_saved: simulation.interestSaved,
        months_saved: simulation.monthsSaved,
        new_debt_free_date: simulation.newDebtFreeDate,
        new_emi: simulation.newEMI,
      } : {
        // If saving without running simulation, we don't have these values yet
        original_schedule: [],
        new_schedule: [],
        interest_saved: 0,
        months_saved: 0,
        new_debt_free_date: "",
        new_emi: loanForm.emi_amount,
      };

      // Save simulation to Supabase with custom name
      const { error } = await supabase
        .from('saved_simulations')
        .insert([
          {
            user_id: user.id,
            loan_id: null, // Use null instead of 'temp-simulation' for ad-hoc simulations
            simulation_name: simulationName || `${loanForm.loan_type} Simulation`,
            description: `${formatCurrency(loanForm.principal)} at ${loanForm.interest_rate}% for ${loanForm.tenure_months} months with ${prepayments.length} prepayments and ${rateChanges.length} rate changes`,
            ...simulationData,
            prepayments: prepayments,
            rate_changes: rateChanges,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])

      if (error) throw error

      setSaveStatus('success')
      // Load saved simulations if on saved tab
      if (activeTab === 'saved') {
        loadSavedSimulations();
      }
      
      // If we saved from Rate Changes tab, auto-run the simulation and switch to results
      if (!simulation && runSimulationOnSave) {
        // Use handleTabClick to ensure scrolling to the results tab
        runSimulation();
      }
      
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving simulation:', error)
      setSaveStatus('error')
    } finally {
      setIsSaving(false)
    }
  }
  
  const loadSavedSimulations = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoadingSaved(true);
      
      const { data, error } = await supabase
        .from('saved_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        setSavedSimulations(data as unknown as SavedSimulation[]);
      }
    } catch (error) {
      console.error('Error loading saved simulations:', error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [user]);
  
  // Function to handle simulation deletion
  
  const deleteSimulation = async () => {
    if (!user || !simulationToDelete) {
      setIsDeleteModalOpen(false);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('saved_simulations')
        .delete()
        .eq('id', simulationToDelete)
        .eq('user_id', user.id); // Ensure users can only delete their own simulations
        
      if (error) throw error;
      
      // Update the list of saved simulations after deletion
      setSavedSimulations(prev => prev.filter(sim => sim.id !== simulationToDelete));
      
      // Show success message for deletion
      setSaveStatus('success');
      
      // Create a temporary notification that displays the deletion success
      const simulationCard = document.getElementById(`simulation-${simulationToDelete}`);
      if (simulationCard) {
        const notification = document.createElement('div');
        notification.className = 'p-3 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded text-sm text-center';
        notification.textContent = 'Simulation deleted successfully!';
        simulationCard.parentNode?.insertBefore(notification, simulationCard);
        
        // Remove the notification after 3 seconds
        setTimeout(() => {
          notification.remove();
        }, 3000);
      }
      
      setTimeout(() => setSaveStatus('idle'), 3000);
      
    } catch (error) {
      console.error('Error deleting simulation:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsDeleteModalOpen(false);
      setSimulationToDelete(null);
    }
  };

  // Load saved simulations when tab changes to 'saved'
  useEffect(() => {
    if (activeTab === 'saved' && user) {
      loadSavedSimulations();
    }
  }, [activeTab, user, loadSavedSimulations]);

  const handleTabClick = (tabId: 'setup' | 'prepayment' | 'rate-change' | 'results' | 'saved' | 'compare') => {
    setActiveTab(tabId);
    
    // Wait for tab content to render before scrolling
    setTimeout(() => {
      if (tabContentRef.current) {
        // Get the position of the element relative to the viewport
        const rect = tabContentRef.current.getBoundingClientRect();
        
        // Calculate the scroll position, accounting for any fixed header
        // Use smaller offset on mobile devices
        const headerOffset = window.innerWidth < 768 ? 60 : 80;
        const scrollTop = window.pageYOffset + rect.top - headerOffset;
        
        // Scroll to the position
        window.scrollTo({
          top: scrollTop,
          behavior: 'smooth'
        });
        
        // Add a subtle highlight animation
        const highlightEl = document.createElement('div');
        highlightEl.style.position = 'absolute';
        highlightEl.style.top = '0';
        highlightEl.style.left = '0';
        highlightEl.style.right = '0';
        highlightEl.style.bottom = '0';
        highlightEl.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'; // Light blue highlight
        highlightEl.style.pointerEvents = 'none';
        highlightEl.style.zIndex = '5';
        highlightEl.style.borderRadius = '0.5rem';
        highlightEl.style.transition = 'opacity 0.8s ease-out';
        
        const currentContent = tabContentRef.current;
        currentContent.style.position = 'relative';
        currentContent.appendChild(highlightEl);
        
        // Fade out the highlight after a moment
        setTimeout(() => {
          highlightEl.style.opacity = '0';
          setTimeout(() => {
            if (currentContent.contains(highlightEl)) {
              currentContent.removeChild(highlightEl);
            }
          }, 800);
        }, 300);
      }
    }, 150);
  };

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

      {/* Simulation Name Modal */}
      <Modal
        isOpen={isNameModalOpen}
        onClose={() => setIsNameModalOpen(false)}
        title="Name Your Simulation"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Give your simulation a name so you can easily identify it later.
          </p>
          <Input
            label="Simulation Name"
            value={simulationName}
            onChange={(e) => setSimulationName(e.target.value)}
            placeholder="e.g., Home Loan with Extra Payments"
            required
          />
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              onClick={() => setIsNameModalOpen(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={saveSimulationWithName}
              disabled={!simulationName.trim()}
            >
              Save Simulation
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Simulation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-300">
            Are you sure you want to delete this simulation? This action cannot be undone.
          </p>
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              onClick={() => setIsDeleteModalOpen(false)}
              variant="outline"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={deleteSimulation}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Simulation
            </Button>
          </div>
        </div>
      </Modal>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id as 'setup' | 'prepayment' | 'rate-change' | 'results' | 'saved' | 'compare')}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              disabled={(tab.id === 'results' && !simulation) || (tab.id === 'saved' && !user)}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
              {tab.id === 'saved' && savedSimulations.length > 0 && (
                <span className="ml-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 text-xs rounded-full px-2 py-0.5">
                  {savedSimulations.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div ref={tabContentRef}>
      {activeTab === 'setup' && (
        <div className="space-y-6" ref={tabContentRef}>
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
        <div className="space-y-4" ref={tabContentRef}>
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
          
          {/* Next Steps Actions */}
          <Card className="bg-gray-50 dark:bg-gray-800/50 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Continue Setup
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add rate changes or run your simulation to see the results
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={() => handleTabClick('rate-change')}
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <CalendarIcon className="h-4 w-4" />
                  Add Rate Changes
                </Button>
                {user && loanForm.principal > 0 && (
                  <Button 
                    onClick={() => handleSaveSimulation(true)}
                    variant="outline"
                    disabled={isSaving || !loanForm.principal}
                    className="flex items-center gap-1"
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save & Continue'}
                  </Button>
                )}
                <Button 
                  onClick={runSimulation}
                  disabled={!loanForm.principal}
                  className="flex items-center gap-1"
                >
                  Run Simulation
                </Button>
              </div>
            </div>
            
            {saveStatus === 'success' && (
              <div className="mt-4 p-2 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded text-sm text-center">
                Simulation saved successfully!
              </div>
            )}
            
            {saveStatus === 'error' && (
              <div className="mt-4 p-2 bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200 rounded text-sm text-center">
                Error saving simulation. Please try again.
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'rate-change' && (
        <div className="space-y-4" ref={tabContentRef}>
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
          
          {/* Run Simulation & Save Actions */}
          <Card className="bg-gray-50 dark:bg-gray-800/50 mt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Ready to See Results?
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Run the simulation to see the impact of your prepayments and rate changes
                </p>
              </div>
              <div className="flex items-center gap-3">
                {loanForm.principal > 0 && user && (
                  <Button 
                    onClick={() => handleSaveSimulation(true)}
                    variant="outline"
                    disabled={isSaving || !loanForm.principal}
                    className="flex items-center gap-1"
                  >
                    <BookmarkIcon className="h-4 w-4" />
                    {isSaving ? 'Saving...' : 'Save & Continue'}
                  </Button>
                )}
                <Button 
                  onClick={runSimulation}
                  disabled={!loanForm.principal}
                  className="flex items-center gap-1"
                >
                  Run Simulation
                </Button>
              </div>
            </div>
            
            {saveStatus === 'success' && (
              <div className="mt-4 p-2 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded text-sm text-center">
                Simulation saved successfully!
              </div>
            )}
            
            {saveStatus === 'error' && (
              <div className="mt-4 p-2 bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200 rounded text-sm text-center">
                Error saving simulation. Please try again.
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="space-y-6" ref={tabContentRef}>
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Saved Simulations
            </h3>
            
            {isLoadingSaved && (
              <div className="p-4 text-center">
                <p className="text-gray-600 dark:text-gray-400">Loading saved simulations...</p>
              </div>
            )}
            
            {!isLoadingSaved && savedSimulations.length === 0 && (
              <div className="p-4 text-center border border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                <p className="text-gray-600 dark:text-gray-400">No saved simulations yet.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Run a simulation and click "Save Simulation" to save it for future reference.
                </p>
              </div>
            )}
            
            {saveStatus === 'success' && (
              <div className="mb-4 p-2 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded text-sm text-center">
                Operation completed successfully!
              </div>
            )}
            
            {saveStatus === 'error' && (
              <div className="mb-4 p-2 bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200 rounded text-sm text-center">
                Error performing operation. Please try again.
              </div>
            )}
            
            {!isLoadingSaved && savedSimulations.length > 0 && (
              <div className="space-y-4">
                {savedSimulations.map((sim) => (
                  <div 
                    key={sim.id}
                    id={`simulation-${sim.id}`}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex justify-between items-start">
                      <div className="w-full">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {sim.simulation_name}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {sim.description || 'No description'}
                          </p>
                        </div>
                        
                        {/* Results Summary */}
                        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Interest Saved</p>
                            <p className="text-green-600 dark:text-green-400 font-medium">
                              {formatCurrency(sim.interest_saved)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Months Saved</p>
                            <p className="text-blue-600 dark:text-blue-400 font-medium">
                              {sim.months_saved}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">New Debt-Free Date</p>
                            <p className="text-purple-600 dark:text-purple-400 font-medium">
                              {formatDate(sim.new_debt_free_date)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                            <p className="text-gray-600 dark:text-gray-400 text-xs">
                              {new Date(sim.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        
                        {/* Prepayments Section */}
                        {sim.prepayments && sim.prepayments.length > 0 && (
                          <div className="mt-4">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Prepayments ({sim.prepayments.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {sim.prepayments.map((prepayment, index) => (
                                <div key={index} className="inline-flex items-center gap-1.5 text-xs py-1 px-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">
                                  <span>{formatCurrency(prepayment.amount)}</span>
                                  <span>•</span>
                                  <span>{formatDate(prepayment.prepayment_date)}</span>
                                  {prepayment.prepayment_type === 'recurring' && prepayment.frequency && (
                                    <>
                                      <span>•</span>
                                      <span>{prepayment.frequency}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Rate Changes Section */}
                        {sim.rate_changes && sim.rate_changes.length > 0 && (
                          <div className="mt-3">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Rate Changes ({sim.rate_changes.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {sim.rate_changes.map((rateChange, index) => (
                                <div key={index} className="inline-flex items-center gap-1.5 text-xs py-1 px-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                                  <span>{rateChange.new_rate}%</span>
                                  <span>•</span>
                                  <span>{formatDate(rateChange.effective_date)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        <div className="mt-4 flex justify-end space-x-2">
                          <Button 
                            onClick={() => {
                              setSimulationToDelete(sim.id);
                              setIsDeleteModalOpen(true);
                            }}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <MinusIcon className="h-4 w-4" />
                            Delete
                          </Button>
                          <Button 
                            onClick={() => loadSavedSimulation(sim)}
                            size="sm"
                            className="flex items-center gap-1"
                          >
                            <PlusIcon className="h-4 w-4" />
                            Run Simulation
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
      
      {activeTab === 'results' && simulation && (
        <div className="space-y-6" ref={tabContentRef}>
          {/* Simulation Results */}
          <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Simulation Results
              </h3>
              {user && (
                <Button 
                  onClick={() => handleSaveSimulation(false)}
                  disabled={isSaving}
                  className="flex items-center gap-1"
                >
                  <BookmarkIcon className="h-4 w-4" />
                  {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved!' : 'Save Simulation'}
                </Button>
              )}
            </div>
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
            
            {saveStatus === 'success' && (
              <div className="mt-4 p-2 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-200 rounded text-sm text-center">
                Simulation saved successfully!
              </div>
            )}
            
            {saveStatus === 'error' && (
              <div className="mt-4 p-2 bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200 rounded text-sm text-center">
                Error saving simulation. Please try again.
              </div>
            )}
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

      {activeTab === 'saved' && (
        <div className="space-y-6">
          {/* Saved Simulations List */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Saved Simulations
            </h3>
            <div className="space-y-4">
              {/* Map through saved simulations and display them */}
              {user && (
                <div>
                  {/* Fetch and display saved simulations for the user */}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
      </div>
    </div>
  )
}
