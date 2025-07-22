import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  PlusIcon, 
  ChartBarIcon, 
  SparklesIcon, 
  CalculatorIcon, 
  CurrencyRupeeIcon,
  CreditCardIcon,
  BanknotesIcon,
  TrophyIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { LoanCard } from '../components/dashboard/LoanCard'
import { LoanForm } from '../components/dashboard/LoanForm'
import { DashboardChart } from '../components/dashboard/DashboardChart'
import { AIAssistant } from '../components/dashboard/AIAssistant'
import { LoanSimulator } from '../components/dashboard/LoanSimulator'
import { FixedExpensesForm } from '../components/dashboard/FixedExpensesForm'
import { ExportDropdown } from '../components/dashboard/ExportDropdown'
import { CreditScoreMonitor } from '../components/dashboard/CreditScoreMonitor'
import { InvestmentPortfolio } from '../components/dashboard/InvestmentPortfolio'
import { FinancialGoalsTracker } from '../components/dashboard/FinancialGoalsTracker'
import { TaxPlanningModule } from '../components/dashboard/TaxPlanningModule'
import { LoanData, FixedExpense, UserEarnings } from '../utils/loanCalculations'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [loans, setLoans] = useState<LoanData[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [earnings, setEarnings] = useState<UserEarnings | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<LoanData | undefined>()
  const [activeTab, setActiveTab] = useState<'loans' | 'expenses' | 'dashboard' | 'ai' | 'simulator' | 'credit' | 'investments' | 'goals' | 'tax'>('loans')

  const fetchLoans = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setLoans(data || [])
    } catch (error) {
      console.error('Error fetching loans:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const fetchEarnings = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('user_earnings')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setEarnings(data || null)
    } catch (error) {
      console.error('Error fetching earnings:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchLoans()
      fetchEarnings()
    }
  }, [user, fetchLoans, fetchEarnings])

  const handleAddLoan = async (loanData: Omit<LoanData, 'id' | 'user_id'>) => {
    try {
      const { data, error } = await supabase
        .from('loans')
        .insert([{
          ...loanData,
          user_id: user?.id
        }])
        .select()

      if (error) throw error
      if (data) {
        setLoans(prev => [data[0], ...prev])
      }
    } catch (error) {
      console.error('Error adding loan:', error)
    }
  }

  const handleEditLoan = async (loanData: Omit<LoanData, 'id' | 'user_id'>) => {
    if (!editingLoan) return

    try {
      const { data, error } = await supabase
        .from('loans')
        .update(loanData)
        .eq('id', editingLoan.id)
        .select()

      if (error) throw error
      if (data) {
        setLoans(prev => prev.map(loan => 
          loan.id === editingLoan.id ? data[0] : loan
        ))
      }
      setEditingLoan(undefined)
    } catch (error) {
      console.error('Error updating loan:', error)
    }
  }

  const handleEditClick = (loan: LoanData) => {
    setEditingLoan(loan)
    setIsFormOpen(true)
  }

  const handleDeleteLoan = async (id: string) => {
    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', id)

      if (error) throw error
      setLoans(prev => prev.filter(loan => loan.id !== id))
    } catch (error) {
      console.error('Error deleting loan:', error)
    }
  }

  const tabs = [
    { id: 'loans', label: 'My Loans', icon: PlusIcon },
    { id: 'expenses', label: 'Fixed Expenses', icon: CurrencyRupeeIcon },
    { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { id: 'simulator', label: 'Loan Simulator', icon: CalculatorIcon },
    // { id: 'credit', label: 'Credit Score', icon: CreditCardIcon },
    // { id: 'investments', label: 'Investments', icon: BanknotesIcon },
    // { id: 'goals', label: 'Financial Goals', icon: TrophyIcon },
    { id: 'tax', label: 'Tax Planning', icon: DocumentTextIcon },
    { id: 'ai', label: 'AI Assistant', icon: SparklesIcon }
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Welcome To LoanMaster!
            </h1>
            {/* <p className="text-gray-600 dark:text-gray-400">
              Here's your loan portfolio overview
            </p> */}
          </div>

          {/* Summary Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Total Outstanding
              </h3>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(totalPrincipal)}
              </p>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Monthly EMI
              </h3>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalEMI)}
              </p>
            </Card>
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Average Interest Rate
              </h3>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {avgInterestRate.toFixed(2)}%
              </p>
            </Card>
          </div> */}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'loans' | 'expenses' | 'dashboard' | 'ai' | 'simulator' | 'credit' | 'investments' | 'goals' | 'tax')}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
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
          {activeTab === 'loans' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Your Loans
                </h2>
                <Button onClick={() => setIsFormOpen(true)} className="flex items-center whitespace-nowrap">
                  <PlusIcon className="h-5 w-5 mr-2 flex-shrink-0" />
                  Add New Loan
                </Button>
              </div>

              {loans.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <PlusIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No loans added yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Start by adding your first loan to track payments and get optimization suggestions
                    </p>
                    <Button onClick={() => setIsFormOpen(true)}>
                      Add Your First Loan
                    </Button>
                  </div>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {loans.map((loan) => (
                      <LoanCard
                        key={loan.id}
                        loan={loan}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteLoan}
                      />
                    ))}
                  </div>
                  <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3">
                      <CalculatorIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      <div>
                        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                          Want to run loan simulations?
                        </h4>
                        <p className="text-blue-700 dark:text-blue-300">
                          Use the <strong>Loan Simulator</strong> tab to test prepayment scenarios, interest rate changes, and see how much you can save!
                        </p>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {activeTab === 'expenses' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Fixed Monthly Expenses
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Track your monthly fixed expenses like rent, utilities, subscriptions, and other regular payments. This helps you understand your monthly financial commitments alongside your loan EMIs.
              </p>
              <FixedExpensesForm onExpensesChange={setFixedExpenses} />
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Financial Dashboard
                </h2>
                {loans.length > 0 && (
                  <ExportDropdown 
                    loans={loans} 
                    fixedExpenses={fixedExpenses} 
                    earnings={earnings}
                  />
                )}
              </div>
              {loans.length === 0 ? (
                <Card>
                  <div className="text-center py-12">
                    <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No data to analyze
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Add some loans to see beautiful charts and analytics
                    </p>
                  </div>
                </Card>
              ) : (
                <DashboardChart 
                  loans={loans} 
                  fixedExpenses={fixedExpenses}
                  userEarnings={earnings}
                  onEarningsUpdate={setEarnings}
                />
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Debt Optimization
              </h2>
              <AIAssistant />
            </div>
          )}

          {activeTab === 'simulator' && (
            <div className="space-y-6">
              <LoanSimulator loans={loans} />
            </div>
          )}

          {activeTab === 'credit' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Credit Score Monitoring
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Track your credit score, understand the factors affecting it, and get recommendations to improve your creditworthiness.
              </p>
              <CreditScoreMonitor />
            </div>
          )}

          {activeTab === 'investments' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Investment Portfolio
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Manage your investment portfolio, track returns, and optimize your SIPs for better financial growth.
              </p>
              <InvestmentPortfolio />
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Financial Goals Tracker
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Set and track your financial goals, monitor progress, and get personalized recommendations to achieve them faster.
              </p>
              <FinancialGoalsTracker />
            </div>
          )}

          {activeTab === 'tax' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tax Planning & Optimization
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Calculate your tax liability, optimize deductions, and get personalized tax-saving investment recommendations.
              </p>
              <TaxPlanningModule />
            </div>
          )}
        </motion.div>
      </div>

      <LoanForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingLoan(undefined)
        }}
        onSubmit={editingLoan ? handleEditLoan : handleAddLoan}
        loan={editingLoan}
      />
    </div>
  )
}