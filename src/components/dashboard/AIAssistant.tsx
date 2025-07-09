import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { SparklesIcon, DocumentTextIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { LoanData, generateAIPrompt } from '../../utils/loanCalculations'

interface AIAssistantProps {
  loans: LoanData[]
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ loans }) => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [extraAmount, setExtraAmount] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')

  const handleGeneratePrompt = () => {
    const prompt = generateAIPrompt(loans, parseFloat(extraAmount) || 0)
    setGeneratedPrompt(prompt)
    setIsModalOpen(true)
  }

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(generatedPrompt)
  }

  const handleExportPrompt = () => {
    const blob = new Blob([generatedPrompt], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'loan-optimization-prompt.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loans.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <SparklesIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            AI Assistant Ready
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Add some loans to get AI-powered optimization suggestions
          </p>
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
            AI Debt Optimization Assistant
          </h3>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Get personalized recommendations for optimizing your debt repayment strategy. Enter any extra amount you can pay monthly for better suggestions.
        </p>

        <div className="space-y-4">
          <Input
            label="Extra Monthly Payment (₹)"
            type="number"
            value={extraAmount}
            onChange={(e) => setExtraAmount(e.target.value)}
            placeholder="Enter extra amount you can pay"
            min={0}
            step={100}
          />

          <Button onClick={handleGeneratePrompt} className="w-full">
            <SparklesIcon className="h-5 w-5 mr-2" />
            Generate AI Optimization Prompt
          </Button>
        </div>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
            How it works:
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
            <li>• Analyzes your current loan portfolio</li>
            <li>• Generates a detailed prompt for AI assistants</li>
            <li>• Includes loan details, rates, and payment capacity</li>
            <li>• Copy and paste into ChatGPT or similar AI tools</li>
          </ul>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="AI Optimization Prompt"
        size="xl"
      >
        <div className="space-y-6">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-3">
              Generated Prompt for AI Assistant:
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
              <li>1. Copy the prompt above</li>
              <li>2. Open ChatGPT, Claude, or your preferred AI assistant</li>
              <li>3. Paste the prompt and get personalized recommendations</li>
              <li>4. Implement the suggested strategies in your loan management</li>
            </ol>
          </div>
        </div>
      </Modal>
    </>
  )
}