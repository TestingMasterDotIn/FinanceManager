import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChartBarIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface Investment {
  id?: string
  user_id: string
  investment_type: 'SIP' | 'Mutual Fund' | 'Stocks' | 'FD' | 'PPF' | 'ELSS' | 'Bonds'
  investment_name: string
  amount_invested: number
  current_value: number
  monthly_sip?: number
  maturity_date?: string
  interest_rate?: number
  created_at?: string
}

export const InvestmentPortfolio: React.FC = () => {
  const { user } = useAuth()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newInvestment, setNewInvestment] = useState<Omit<Investment, 'id' | 'user_id' | 'created_at'>>({
    investment_type: 'SIP',
    investment_name: '',
    amount_invested: 0,
    current_value: 0,
    monthly_sip: 0,
    interest_rate: 0
  })

  useEffect(() => {
    if (user) {
      fetchInvestments()
    }
  }, [user])

  const fetchInvestments = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvestments(data || [])
    } catch (error) {
      console.error('Error fetching investments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddInvestment = async () => {
    if (!user || !newInvestment.investment_name) return

    try {
      const { data, error } = await supabase
        .from('investments')
        .insert([{
          ...newInvestment,
          user_id: user.id
        }])
        .select()

      if (error) throw error
      if (data) {
        setInvestments(prev => [data[0], ...prev])
        setNewInvestment({
          investment_type: 'SIP',
          investment_name: '',
          amount_invested: 0,
          current_value: 0,
          monthly_sip: 0,
          interest_rate: 0
        })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding investment:', error)
    }
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount_invested, 0)
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0)
  const totalGainLoss = totalCurrentValue - totalInvested
  const returnPercentage = totalInvested > 0 ? ((totalGainLoss / totalInvested) * 100) : 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const generateMockInvestments = () => {
    const mockInvestments: Investment[] = [
      {
        user_id: user?.id || '',
        investment_type: 'SIP',
        investment_name: 'HDFC Top 200 Fund',
        amount_invested: 50000,
        current_value: 55000,
        monthly_sip: 5000,
        created_at: new Date().toISOString()
      },
      {
        user_id: user?.id || '',
        investment_type: 'PPF',
        investment_name: 'Public Provident Fund',
        amount_invested: 150000,
        current_value: 165000,
        interest_rate: 7.1,
        created_at: new Date().toISOString()
      },
      {
        user_id: user?.id || '',
        investment_type: 'ELSS',
        investment_name: 'Axis Long Term Equity',
        amount_invested: 80000,
        current_value: 92000,
        created_at: new Date().toISOString()
      }
    ]
    setInvestments(mockInvestments)
    setLoading(false)
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Investment Portfolio
          </h3>
        </div>
        <Button size="sm" onClick={() => investments.length === 0 ? generateMockInvestments() : setShowAddForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {investments.length === 0 ? 'Add Sample Data' : 'Add Investment'}
        </Button>
      </div>

      {investments.length > 0 ? (
        <div className="space-y-4">
          {/* Portfolio Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-sm text-blue-600 dark:text-blue-400">Total Invested</div>
              <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                {formatCurrency(totalInvested)}
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-sm text-green-600 dark:text-green-400">Current Value</div>
              <div className="text-xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(totalCurrentValue)}
              </div>
            </div>
            <div className={`p-4 rounded-lg ${totalGainLoss >= 0 
              ? 'bg-green-50 dark:bg-green-900/20' 
              : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <div className={`text-sm flex items-center ${totalGainLoss >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
              }`}>
                {totalGainLoss >= 0 ? <ArrowUpIcon className="h-4 w-4 mr-1" /> : <ArrowDownIcon className="h-4 w-4 mr-1" />}
                Gain/Loss
              </div>
              <div className={`text-xl font-bold ${totalGainLoss >= 0 
                ? 'text-green-900 dark:text-green-100' 
                : 'text-red-900 dark:text-red-100'
              }`}>
                {formatCurrency(Math.abs(totalGainLoss))} ({returnPercentage.toFixed(2)}%)
              </div>
            </div>
          </div>

          {/* Investment List */}
          <div className="space-y-3">
            {investments.map((investment, index) => {
              const gainLoss = investment.current_value - investment.amount_invested
              const gainLossPercent = (gainLoss / investment.amount_invested) * 100
              
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {investment.investment_name}
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {investment.investment_type}
                        {investment.monthly_sip && ` • SIP: ${formatCurrency(investment.monthly_sip)}/month`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(investment.current_value)}
                      </div>
                      <div className={`text-sm ${gainLoss >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                      }`}>
                        {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)} ({gainLossPercent.toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <ChartBarIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Build Your Investment Portfolio
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Track your investments, SIPs, and calculate overall returns
          </p>
        </div>
      )}

      {/* Add Investment Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 p-4 border-t border-gray-200 dark:border-gray-700"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Add New Investment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Investment Type"
              value={newInvestment.investment_type}
              onChange={(e) => setNewInvestment(prev => ({ ...prev, investment_type: e.target.value as Investment['investment_type'] }))}
              options={[
                { value: 'SIP', label: 'SIP' },
                { value: 'Mutual Fund', label: 'Mutual Fund' },
                { value: 'Stocks', label: 'Stocks' },
                { value: 'FD', label: 'Fixed Deposit' },
                { value: 'PPF', label: 'PPF' },
                { value: 'ELSS', label: 'ELSS' },
                { value: 'Bonds', label: 'Bonds' }
              ]}
            />
            <Input
              label="Investment Name"
              placeholder="e.g., HDFC Top 200 Fund"
              value={newInvestment.investment_name}
              onChange={(e) => setNewInvestment(prev => ({ ...prev, investment_name: e.target.value }))}
            />
            <Input
              type="number"
              label="Amount Invested (₹)"
              placeholder="50000"
              value={newInvestment.amount_invested || ''}
              onChange={(e) => setNewInvestment(prev => ({ ...prev, amount_invested: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              type="number"
              label="Current Value (₹)"
              placeholder="55000"
              value={newInvestment.current_value || ''}
              onChange={(e) => setNewInvestment(prev => ({ ...prev, current_value: parseFloat(e.target.value) || 0 }))}
            />
            {newInvestment.investment_type === 'SIP' && (
              <Input
                type="number"
                label="Monthly SIP (₹)"
                placeholder="5000"
                value={newInvestment.monthly_sip || ''}
                onChange={(e) => setNewInvestment(prev => ({ ...prev, monthly_sip: parseFloat(e.target.value) || 0 }))}
              />
            )}
          </div>
          <div className="flex space-x-2 mt-4">
            <Button onClick={handleAddInvestment}>Add Investment</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}
    </Card>
  )
}
