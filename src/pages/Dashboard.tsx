import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  PlusIcon, 
  ChartBarIcon, 
  SparklesIcon, 
  CalculatorIcon, 
  CurrencyRupeeIcon,
  BanknotesIcon,
  DocumentTextIcon,
  UserIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
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
import { LendingBorrowing } from '../components/dashboard/LendingBorrowing'
import { PersonalExpenses } from '../components/dashboard/PersonalExpenses'
import { LoanData, FixedExpense, UserEarnings, LentMoney, BorrowedMoney, calculateLendingBorrowingStats, calculateLoanAnalytics } from '../utils/loanCalculations'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [loans, setLoans] = useState<LoanData[]>([])
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([])
  const [earnings, setEarnings] = useState<UserEarnings | null>(null)
  const [lentMoney, setLentMoney] = useState<LentMoney[]>([])
  const [borrowedMoney, setBorrowedMoney] = useState<BorrowedMoney[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<LoanData | undefined>()
  const [showBreakdownModal, setShowBreakdownModal] = useState(false)
  const [showEMIBreakdownModal, setShowEMIBreakdownModal] = useState(false)
  const [showInterestBreakdownModal, setShowInterestBreakdownModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'loans' | 'expenses' | 'dashboard' | 'ai' | 'simulator' | 'credit' | 'investments' | 'goals' | 'tax' | 'lending-borrowing' | 'personal-expenses'>('loans')

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

  const fetchLentMoney = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('lent_money')
        .select('*')
        .eq('user_id', user.id)
        .order('lent_date', { ascending: false })

      if (error) throw error
      setLentMoney(data || [])
    } catch (error) {
      console.error('Error fetching lent money:', error)
    }
  }, [user])

  const fetchBorrowedMoney = useCallback(async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('borrowed_money')
        .select('*')
        .eq('user_id', user.id)
        .order('borrowed_date', { ascending: false })

      if (error) throw error
      setBorrowedMoney(data || [])
    } catch (error) {
      console.error('Error fetching borrowed money:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchLoans()
      fetchEarnings()
      fetchLentMoney()
      fetchBorrowedMoney()
    }
  }, [user, fetchLoans, fetchEarnings, fetchLentMoney, fetchBorrowedMoney])

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

  // Calculate summary metrics
  const calculateTotalOutstandingWithInterest = () => {
    const loanBreakdowns: Array<{
      name: string
      currentOutstanding: number
      remainingInterest: number
      total: number
    }> = []

    // Calculate current outstanding principal + remaining total interest
    const loanOutstandingWithInterest = loans.reduce((sum, loan) => {
      // Current outstanding principal
      const currentOutstanding = loan.outstanding_balance || 0
      
      // Use calculateLoanAnalytics to get accurate paid and total interest
      const loanAnalytics = calculateLoanAnalytics(loan)
      
      // Remaining total interest = Total interest - Interest paid till date
      const remainingTotalInterest = Math.max(0, loanAnalytics.totalInterest - loanAnalytics.paidInterest)
      
      const loanTotal = currentOutstanding + remainingTotalInterest

      // Store breakdown for this loan
      loanBreakdowns.push({
        name: loan.custom_name || loan.loan_type,
        currentOutstanding,
        remainingInterest: remainingTotalInterest,
        total: loanTotal
      })
      
      return sum + loanTotal
    }, 0)
    
    // Add borrowed money outstanding balance
    const borrowedBreakdowns: Array<{
      name: string
      amount: number
    }> = []

    const totalBorrowedOutstanding = borrowedMoney
      .filter(loan => !loan.is_paid)
      .reduce((sum, loan) => {
        borrowedBreakdowns.push({
          name: `Borrowed from ${loan.lender_name}`,
          amount: loan.outstanding_balance
        })
        return sum + loan.outstanding_balance
      }, 0)
    
    return {
      total: loanOutstandingWithInterest + totalBorrowedOutstanding,
      loanBreakdowns,
      borrowedBreakdowns,
      totalBorrowedOutstanding
    }
  }

  const outstandingCalculation = calculateTotalOutstandingWithInterest()
  const totalOutstanding = outstandingCalculation.total
  
  // Calculate total EMI including borrowed money interest
  const loanEMI = loans.reduce((sum, loan) => sum + loan.emi_amount, 0)
  const borrowedMoneyInterest = borrowedMoney
    .filter(loan => !loan.is_paid)
    .reduce((sum, loan) => {
      // Calculate monthly interest for borrowed money (simple interest calculation)
      const monthlyInterest = (loan.outstanding_balance * loan.interest_rate) / 100 / 12
      return sum + monthlyInterest
    }, 0)
  const totalEMI = loanEMI + borrowedMoneyInterest
  
  const avgInterestRate = loans.length > 0 
    ? loans.reduce((sum, loan) => sum + loan.interest_rate, 0) / loans.length 
    : 0

  // Calculate L&B stats for the Monthly Earnings card
  const lendingBorrowingStats = calculateLendingBorrowingStats(lentMoney, borrowedMoney)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const tabs = [
    { id: 'loans', label: 'My Loans', icon: PlusIcon },
    { id: 'expenses', label: 'Fixed Expenses', icon: CurrencyRupeeIcon },
    { id: 'personal-expenses', label: 'Personal Expenses', icon: UserIcon },
    { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
    { id: 'simulator', label: 'Loan Simulator', icon: CalculatorIcon },
    { id: 'lending-borrowing', label: 'L&B', icon: BanknotesIcon },
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
              Welcome To FinanceManager!
            </h1>
            {/* <p className="text-gray-600 dark:text-gray-400">
              Here's your loan portfolio overview
            </p> */}
          </div>

          {/* Summary Cards */}
          {(loans.length > 0 || borrowedMoney.some(loan => !loan.is_paid)) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Total Outstanding Debt With Interest
                  </h3>
                  <button
                    onClick={() => setShowBreakdownModal(true)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="View detailed breakdown"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {formatCurrency(totalOutstanding)}
                </p>
              </Card>
              <Card>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Monthly EMI + Interest
                  </h3>
                  <button
                    onClick={() => setShowEMIBreakdownModal(true)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="View EMI breakdown"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(totalEMI)}
                </p>
              </Card>
              <Card>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Average Interest Rate
                  </h3>
                  <button
                    onClick={() => setShowInterestBreakdownModal(true)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                    title="View interest rate breakdown"
                  >
                    <EyeIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {avgInterestRate.toFixed(2)}%
                </p>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'loans' | 'expenses' | 'dashboard' | 'ai' | 'simulator' | 'credit' | 'investments' | 'goals' | 'tax' | 'lending-borrowing' | 'personal-expenses')}
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

          {activeTab === 'personal-expenses' && (
            <div className="space-y-6">
              <PersonalExpenses />
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
                  lendingBorrowingStats={lendingBorrowingStats}
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

          {activeTab === 'lending-borrowing' && (
            <div className="space-y-6">
              <LendingBorrowing />
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

      {/* Breakdown Modal */}
      <Modal
        isOpen={showBreakdownModal}
        onClose={() => setShowBreakdownModal(false)}
        title="Total Outstanding Debt Breakdown"
      >
        <div className="space-y-6">
          {/* Loan Breakdowns */}
          {outstandingCalculation.loanBreakdowns.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Loans Breakdown
              </h4>
              <div className="space-y-3">
                {outstandingCalculation.loanBreakdowns.map((loan, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                      {loan.name}
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Current Outstanding:</span>
                        <div className="font-medium text-blue-600 dark:text-blue-400">
                          {formatCurrency(loan.currentOutstanding)}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Remaining Interest:</span>
                        <div className="font-medium text-orange-600 dark:text-orange-400">
                          {formatCurrency(loan.remainingInterest)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400 text-sm">Subtotal:</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(loan.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Borrowed Money Breakdown */}
          {outstandingCalculation.borrowedBreakdowns.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Borrowed Money
              </h4>
              <div className="space-y-3">
                {outstandingCalculation.borrowedBreakdowns.map((borrowed, index) => (
                  <div key={index} className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {borrowed.name}
                      </span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(borrowed.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Total Summary */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Total Outstanding Debt:
              </span>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(outstandingCalculation.total)}
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* EMI Breakdown Modal */}
      <Modal
        isOpen={showEMIBreakdownModal}
        onClose={() => setShowEMIBreakdownModal(false)}
        title="Monthly EMI Breakdown"
      >
        <div className="space-y-6">
          {/* Individual Loan EMIs */}
          {loans.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Loan EMIs
              </h4>
              <div className="space-y-3">
                {loans.map((loan, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {loan.custom_name || loan.loan_type}
                      </span>
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(loan.emi_amount)}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Interest Rate: {loan.interest_rate}% | Tenure: {loan.tenure_months} months
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal (Loans):</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(loanEMI)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Borrowed Money Interest */}
          {borrowedMoney.filter(loan => !loan.is_paid).length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Borrowed Money Interest (Monthly)
              </h4>
              <div className="space-y-3">
                {borrowedMoney
                  .filter(loan => !loan.is_paid)
                  .map((loan, index) => {
                    const monthlyInterest = (loan.outstanding_balance * loan.interest_rate) / 100 / 12
                    return (
                      <div key={index} className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Interest on loan from {loan.lender_name}
                          </span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(monthlyInterest)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Outstanding: {formatCurrency(loan.outstanding_balance)} | Rate: {loan.interest_rate}%
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div className="pt-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal (Borrowed Interest):</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {formatCurrency(borrowedMoneyInterest)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Total Summary */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Total Monthly Payment:
              </span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(totalEMI)}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {loans.length > 0 && `${loans.length} loan${loans.length > 1 ? 's' : ''}`}
              {loans.length > 0 && borrowedMoney.filter(loan => !loan.is_paid).length > 0 && ' + '}
              {borrowedMoney.filter(loan => !loan.is_paid).length > 0 && 
                `${borrowedMoney.filter(loan => !loan.is_paid).length} borrowed amount${borrowedMoney.filter(loan => !loan.is_paid).length > 1 ? 's' : ''}`}
            </div>
          </div>
        </div>
      </Modal>

      {/* Interest Rate Breakdown Modal */}
      <Modal
        isOpen={showInterestBreakdownModal}
        onClose={() => setShowInterestBreakdownModal(false)}
        title="Interest Rate Breakdown"
      >
        <div className="space-y-6">
          {/* Individual Loan Interest Rates */}
          {loans.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Individual Loan Interest Rates
              </h4>
              <div className="space-y-3">
                {loans.map((loan, index) => {
                  const loanAnalytics = calculateLoanAnalytics(loan)
                  return (
                    <div key={index} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {loan.custom_name || loan.loan_type}
                        </span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {loan.interest_rate}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Principal:</span>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(loan.principal)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Total Interest:</span>
                          <div className="font-medium text-red-600 dark:text-red-400">
                            {formatCurrency(loanAnalytics.totalInterest)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weighted Average Calculation */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              How Average Interest Rate is Calculated
            </h5>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Simple Average: Sum of all interest rates ÷ Number of loans
            </p>
            <div className="mt-2 text-sm">
              <span className="text-blue-600 dark:text-blue-400">
                ({loans.map(loan => `${loan.interest_rate}%`).join(' + ')}) ÷ {loans.length} = {avgInterestRate.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Total Summary */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xl font-semibold text-gray-900 dark:text-white">
                Average Interest Rate:
              </span>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {avgInterestRate.toFixed(2)}%
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Range: {Math.min(...loans.map(l => l.interest_rate)).toFixed(2)}% - {Math.max(...loans.map(l => l.interest_rate)).toFixed(2)}%
            </div>
          </div>
        </div>
      </Modal>

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