import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { PlusIcon, ChartBarIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { LoanCard } from '../components/dashboard/LoanCard'
import { LoanForm } from '../components/dashboard/LoanForm'
import { AnalyticsChart } from '../components/dashboard/AnalyticsChart'
import { AIAssistant } from '../components/dashboard/AIAssistant'
import { LoanData } from '../utils/loanCalculations'

export const Dashboard: React.FC = () => {
  const { user } = useAuth()
  const [loans, setLoans] = useState<LoanData[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<LoanData | undefined>()
  const [activeTab, setActiveTab] = useState<'loans' | 'analytics' | 'ai'>('loans')

  useEffect(() => {
    if (user) {
      fetchLoans()
    }
  }, [user])

  const fetchLoans = async () => {
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
  }

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const totalPrincipal = loans.reduce((sum, loan) => sum + loan.principal, 0)
  const totalEMI = loans.reduce((sum, loan) => sum + loan.emi_amount, 0)
  const avgInterestRate = loans.length > 0 
    ? loans.reduce((sum, loan) => sum + loan.interest_rate, 0) / loans.length 
    : 0

  const tabs = [
    { id: 'loans', label: 'My Loans', icon: PlusIcon },
    { id: 'analytics', label: 'Analytics', icon: ChartBarIcon },
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
              Welcome back!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Here's your loan portfolio overview
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-8">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
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
                <Button onClick={() => setIsFormOpen(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loans.map((loan) => (
                    <LoanCard
                      key={loan.id}
                      loan={loan}
                      onEdit={setEditingLoan}
                      onDelete={handleDeleteLoan}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Analytics Dashboard
              </h2>
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
                <AnalyticsChart loans={loans} />
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                AI Debt Optimization
              </h2>
              <AIAssistant loans={loans} />
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