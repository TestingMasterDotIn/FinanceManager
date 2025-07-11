import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  SparklesIcon, 
  DocumentTextIcon, 
  ClipboardDocumentIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { SavedSimulation } from '../../utils/loanCalculations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

export const AIAssistant: React.FC = () => {
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulation[]>([])
  const [selectedSimulations, setSelectedSimulations] = useState<string[]>([])
  const [isLoadingSimulations, setIsLoadingSimulations] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Load saved simulations
  const loadSavedSimulations = useCallback(async () => {
    if (!user) return
    
    setIsLoadingSimulations(true)
    try {
      const { data, error } = await supabase
        .from('saved_simulations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedSimulations(data as SavedSimulation[])
    } catch (error) {
      console.error('Error loading saved simulations:', error)
    } finally {
      setIsLoadingSimulations(false)
    }
  }, [user])

  useEffect(() => {
    loadSavedSimulations()
  }, [loadSavedSimulations])

  // Handle simulation selection
  const handleSimulationToggle = (simulationId: string) => {
    setSelectedSimulations(prev => 
      prev.includes(simulationId)
        ? prev.filter(id => id !== simulationId)
        : [...prev, simulationId]
    )
  }

  // Generate AI comparison prompt
  const generateComparisonPrompt = () => {
    const selectedSims = savedSimulations.filter(sim => 
      selectedSimulations.includes(sim.id)
    )

    if (selectedSims.length < 2) return ''

    const promptHeader = `
# Loan Simulation Comparison & Recommendation Request

Hello! I need your expert financial advice to compare multiple loan repayment strategies and determine the best approach for my situation.

## Background
I have analyzed different loan repayment scenarios and saved ${selectedSims.length} simulations. Please help me understand which strategy would be most beneficial for my financial goals.

## Simulations to Compare:

`

    const simulationDetails = selectedSims.map((sim, index) => {
      const originalTotalInterest = sim.original_schedule.reduce((sum, item) => sum + item.interest, 0)
      const newTotalInterest = sim.new_schedule.reduce((sum, item) => sum + item.interest, 0)
      const totalPrincipal = sim.original_schedule[0]?.balance || 0
      
      return `
### Simulation ${index + 1}: "${sim.simulation_name}"
- **Description:** ${sim.description || 'Standard repayment strategy'}
- **Total Loan Amount:** ₹${totalPrincipal.toLocaleString('en-IN')}
- **Original Total Interest:** ₹${originalTotalInterest.toLocaleString('en-IN')}
- **New Total Interest:** ₹${newTotalInterest.toLocaleString('en-IN')}
- **Interest Saved:** ₹${sim.interest_saved.toLocaleString('en-IN')}
- **Time Saved:** ${sim.months_saved} months
- **Original Completion:** ${sim.original_schedule[sim.original_schedule.length - 1]?.date || 'N/A'}
- **New Completion:** ${sim.new_debt_free_date}
${sim.new_emi ? `- **New EMI:** ₹${sim.new_emi.toLocaleString('en-IN')}` : ''}

**Strategy Details:**
${sim.prepayments && sim.prepayments.length > 0 ? `
- Prepayments: ${sim.prepayments.map(p => `₹${p.amount.toLocaleString('en-IN')} on ${p.prepayment_date}`).join(', ')}
` : ''}
${sim.rate_changes && sim.rate_changes.length > 0 ? `
- Rate Changes: ${sim.rate_changes.map(r => `${r.new_rate}% from ${r.effective_date}`).join(', ')}
` : ''}
`
    }).join('\n')

    const promptFooter = `

## What I Need From You:

1. **Detailed Comparison:** Compare each simulation's financial impact, including:
   - Total interest savings
   - Time to debt freedom
   - Cash flow implications
   - Risk factors

2. **Best Strategy Recommendation:** Which simulation would you recommend and why?

3. **Optimization Suggestions:** Are there any improvements or hybrid approaches I should consider?

4. **Risk Assessment:** What are the potential risks or downsides of each approach?

5. **Implementation Advice:** Practical steps to implement the recommended strategy.

## Additional Context:
- I'm looking for the most financially optimal approach
- Please consider both short-term cash flow and long-term savings
- Risk tolerance: Moderate (please mention if any strategy involves higher risk)

Please provide a comprehensive analysis with clear reasoning for your recommendations. Thank you!
`

    return promptHeader + simulationDetails + promptFooter
  }

  const handleGeneratePrompt = async () => {
    if (selectedSimulations.length < 2) return
    
    setIsGenerating(true)
    try {
      const prompt = generateComparisonPrompt()
      setGeneratedPrompt(prompt)
      setIsModalOpen(true)
    } catch (error) {
      console.error('Error generating prompt:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt)
  }

  const handleExportPrompt = () => {
    const blob = new Blob([generatedPrompt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loan-simulations-comparison.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short'
    })
  }

  if (savedSimulations.length === 0 && !isLoadingSimulations) {
    return (
      <Card>
        <div className="text-center py-8">
          <SparklesIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            AI Simulation Comparison
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No saved simulations found. Create and save some loan simulations first to compare them with AI assistance.
          </p>
          <div className="text-sm text-blue-600 dark:text-blue-400">
            💡 Go to the "Loan Simulator" tab to create simulations
          </div>
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
            <SparklesIcon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI Simulation Comparison
          </h3>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Select at least 2 saved simulations to get AI-powered comparison and recommendations for the best repayment strategy.
        </p>

        {isLoadingSimulations ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading saved simulations...</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto">
              {savedSimulations.map((simulation) => (
                <motion.div
                  key={simulation.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    selectedSimulations.includes(simulation.id)
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-400'
                  }`}
                  onClick={() => handleSimulationToggle(simulation.id)}
                >
                  <div className="flex items-center space-x-2 mb-3">
                    {selectedSimulations.includes(simulation.id) ? (
                      <CheckCircleIcon className="h-5 w-5 text-purple-600 flex-shrink-0" />
                    ) : (
                      <div className="h-5 w-5 border-2 border-gray-300 dark:border-gray-600 rounded-full flex-shrink-0" />
                    )}
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {simulation.simulation_name}
                    </h4>
                  </div>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Interest Saved:</span>
                      <div className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(simulation.interest_saved)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Time Saved:</span>
                      <div className="font-medium text-blue-600 dark:text-blue-400">
                        {simulation.months_saved} months
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Completion:</span>
                      <div className="font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(simulation.new_debt_free_date)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Created:</span>
                      <div className="font-medium text-gray-700 dark:text-gray-300">
                        {formatDate(simulation.created_at)}
                      </div>
                    </div>
                  </div>
                  
                  {simulation.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                      {simulation.description}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedSimulations.length} of {savedSimulations.length} simulations selected
                {selectedSimulations.length < 2 && (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">
                    (Select at least 2 to compare)
                  </span>
                )}
              </div>
              
              {selectedSimulations.length >= 2 && (
                <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Ready to compare
                </div>
              )}
            </div>

            <Button 
              onClick={handleGeneratePrompt} 
              disabled={selectedSimulations.length < 2 || isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Generating Comparison...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Generate AI Comparison ({selectedSimulations.length} selected)
                </>
              )}
            </Button>
          </>
        )}

        <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <h4 className="font-medium text-purple-900 dark:text-purple-300 mb-2">
            How AI Comparison Works:
          </h4>
          <ul className="text-sm text-purple-800 dark:text-purple-400 space-y-1">
            <li>• Select 2 or more saved loan simulations</li>
            <li>• AI analyzes interest savings, timeline, and cash flow</li>
            <li>• Get personalized recommendations for the best strategy</li>
            <li>• Receive implementation advice and risk assessment</li>
          </ul>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="AI Simulation Comparison Prompt"
        size="xl"
      >
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Generated Comparison Prompt for AI Assistant:
            </h4>
            <div className="bg-white dark:bg-gray-800 rounded border p-4 max-h-64 overflow-y-auto">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {generatedPrompt}
              </pre>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={handleCopyPrompt} className="flex-1">
              <ClipboardDocumentIcon className="h-5 w-5 mr-2" />
              Copy to Clipboard
            </Button>
            <Button onClick={handleExportPrompt} variant="outline" className="flex-1">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              Export as Text File
            </Button>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <h4 className="font-medium text-amber-900 dark:text-amber-300 mb-2">
              Next Steps:
            </h4>
            <ol className="text-sm text-amber-800 dark:text-amber-400 space-y-1">
              <li>1. Copy the detailed comparison prompt above</li>
              <li>2. Open ChatGPT, Claude, or your preferred AI assistant</li>
              <li>3. Paste the prompt to get comprehensive analysis</li>
              <li>4. Follow the AI recommendations for optimal loan strategy</li>
            </ol>
          </div>
        </div>
      </Modal>
    </>
  )
}