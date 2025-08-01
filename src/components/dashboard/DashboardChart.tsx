import React, { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import { PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { LoanData, calculateLoanAnalytics, calculateCombinedAnalytics, calculateRemainingTenure, UserEarnings, FixedExpense } from '../../utils/loanCalculations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface DashboardChartProps {
  loans: LoanData[]
  fixedExpenses?: FixedExpense[]
  userEarnings: UserEarnings | null
  lendingBorrowingStats?: {
    totalLentInterestEarned: number
  }
  onEarningsUpdate: (earnings: UserEarnings) => void
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']

export const DashboardChart: React.FC<DashboardChartProps> = ({ 
  loans, 
  fixedExpenses = [],
  userEarnings,
  lendingBorrowingStats,
  onEarningsUpdate
}) => {
  const { user } = useAuth()
  const [isEditingEarnings, setIsEditingEarnings] = useState(false)
  const [newSalary, setNewSalary] = useState('')
  const [includeInterestEarnings, setIncludeInterestEarnings] = useState(false)

  const updateEarnings = async () => {
    if (!user || !newSalary) return

    try {
      const interestEarnings = includeInterestEarnings ? (lendingBorrowingStats?.totalLentInterestEarned || 0) : 0
      const totalMonthlyEarnings = parseFloat(newSalary) + interestEarnings

      // Simple update approach - check if record exists first
      const { data: existingRecord } = await supabase
        .from('user_earnings')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      let result
      if (existingRecord) {
        // Record exists, update it
        result = await supabase
          .from('user_earnings')
          .update({ 
            monthly_earnings: totalMonthlyEarnings,
            salary: parseFloat(newSalary),
            include_interest_earnings: includeInterestEarnings
          })
          .eq('user_id', user.id)
          .select()
          .single()
      } else {
        // Record doesn't exist, insert new one
        result = await supabase
          .from('user_earnings')
          .insert({
            user_id: user.id,
            monthly_earnings: totalMonthlyEarnings,
            salary: parseFloat(newSalary),
            include_interest_earnings: includeInterestEarnings
          })
          .select()
          .single()
      }

      if (result.error) {
        throw result.error
      }

      // Update local state
      const newEarningsData = {
        monthly_earnings: totalMonthlyEarnings,
        salary: parseFloat(newSalary),
        include_interest_earnings: includeInterestEarnings,
        user_id: user.id
      }
      onEarningsUpdate(newEarningsData)
      setIsEditingEarnings(false)
      setNewSalary('')
    } catch (error) {
      console.error('Error updating earnings:', error)
      // Show user-friendly error message
      alert('Failed to update earnings. Please try again.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Calculate analytics for all loans
  const combinedAnalytics = calculateCombinedAnalytics(loans)
  const loanAnalytics = loans.map(calculateLoanAnalytics)

  // Calculate totals
  const totalEMI = loans.reduce((sum, loan) => sum + loan.emi_amount, 0)
  const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
  const monthlyIncome = userEarnings?.monthly_earnings || 0
  const totalMonthlyCommitments = totalEMI + totalFixedExpenses
  const remainingIncome = monthlyIncome - totalMonthlyCommitments

  // Income vs Expenses breakdown data
  const incomeBreakdownData = [
    {
      name: 'Loan EMIs',
      value: totalEMI,
      color: '#EF4444',
      percentage: monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0
    },
    {
      name: 'Fixed Expenses',
      value: totalFixedExpenses,
      color: '#F59E0B',
      percentage: monthlyIncome > 0 ? (totalFixedExpenses / monthlyIncome) * 100 : 0
    },
    {
      name: 'Available Income',
      value: Math.max(0, remainingIncome),
      color: '#10B981',
      percentage: monthlyIncome > 0 ? Math.max(0, (remainingIncome / monthlyIncome) * 100) : 0
    }
  ]

  // Monthly cash flow comparison data
  const cashFlowData = [
    {
      category: 'Monthly Income',
      amount: monthlyIncome,
      color: '#10B981'
    },
    {
      category: 'Loan EMIs',
      amount: totalEMI,
      color: '#EF4444'
    },
    {
      category: 'Fixed Expenses',
      amount: totalFixedExpenses,
      color: '#F59E0B'
    },
    {
      category: 'Remaining',
      amount: Math.max(0, remainingIncome),
      color: '#3B82F6'
    }
  ]

  // Pie chart data for loan distribution (using outstanding balance)
  const pieData = loans.map((loan, index) => ({
    name: loan.custom_name || loan.loan_type,
    value: loan.outstanding_balance, // Use outstanding balance instead of principal
    color: COLORS[index % COLORS.length]
  }))

  // Principal vs Interest data for each loan
  const principalInterestData = loanAnalytics.map((analytics, index) => ({
    name: analytics.loanType,
    principal: analytics.paidPrincipal,
    interest: analytics.paidInterest,
    remainingPrincipal: analytics.remainingPrincipal,
    totalInterest: analytics.totalInterest,
    remainingTenure: calculateRemainingTenure(loans[index]), // Add remaining tenure
    color: COLORS[index % COLORS.length]
  }))

  // Combined principal vs interest pie chart
  const combinedPieData = [
    {
      name: 'Paid Principal',
      value: combinedAnalytics.totalPaidPrincipal,
      color: '#10B981'
    },
    {
      name: 'Paid Interest',
      value: combinedAnalytics.totalPaidInterest,
      color: '#EF4444'
    },
    {
      name: 'Remaining Principal',
      value: combinedAnalytics.totalRemainingPrincipal,
      color: '#6B7280'
    }
  ]

  // Line chart data for EMI over time
  const lineData = loans.map((loan) => ({
    name: loan.custom_name || loan.loan_type,
    emi: loan.emi_amount,
    principal: loan.outstanding_balance, // Use outstanding balance for current view
    totalPrincipal: loan.principal, // Keep original for reference
    rate: loan.interest_rate
  }))

  return (
    <div className="space-y-8">
      {/* Earnings Section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Monthly Earnings
          </h3>
          {!isEditingEarnings && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditingEarnings(true)
                setNewSalary(userEarnings?.salary?.toString() || userEarnings?.monthly_earnings?.toString() || '')
                setIncludeInterestEarnings(userEarnings?.include_interest_earnings || false)
              }}
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              {userEarnings ? 'Edit' : 'Add'}
            </Button>
          )}
        </div>
        
        {isEditingEarnings ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Base Salary
              </label>
              <Input
                type="number"
                placeholder="Enter base salary"
                value={newSalary}
                onChange={(e) => setNewSalary(e.target.value)}
                className="flex-1"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeInterest"
                checked={includeInterestEarnings}
                onChange={(e) => setIncludeInterestEarnings(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500"
              />
                                  <label htmlFor="includeInterest" className="text-sm text-gray-700 dark:text-gray-300">
                      Include Monthly L&B Interest ({formatCurrency(lendingBorrowingStats?.totalLentInterestEarned || 0)}/month)
                    </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button size="sm" onClick={updateEarnings}>
                <CheckIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingEarnings(false)
                  setNewSalary('')
                  setIncludeInterestEarnings(false)
                }}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="space-y-1">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {userEarnings ? formatCurrency(userEarnings.monthly_earnings) : 'Not set'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Monthly Income</p>
                
                {userEarnings?.salary && (
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    <div>Base Salary: {formatCurrency(userEarnings.salary)}</div>
                    {userEarnings.include_interest_earnings && (
                      <div>+ Monthly L&B Interest: {formatCurrency((userEarnings.monthly_earnings || 0) - userEarnings.salary)}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            {userEarnings && (
              <>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(combinedAnalytics.totalMonthlyEMI)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total EMI</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {formatPercentage((combinedAnalytics.totalMonthlyEMI / userEarnings.monthly_earnings) * 100)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">EMI vs Earnings</p>
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      {/* Loan Portfolio Summary */}
      {loans.length > 0 && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Loan Portfolio Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(combinedAnalytics.totalRemainingPrincipal)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(combinedAnalytics.totalPaidPrincipal)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Principal Paid</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(combinedAnalytics.totalPaidInterest)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Interest Paid</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {formatPercentage((combinedAnalytics.totalPaidPrincipal / combinedAnalytics.totalPrincipal) * 100)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completion %</p>
            </div>
          </div>
        </Card>
      )}

      {/* Financial Overview Dashboard */}
      {monthlyIncome > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Income vs Expenses Breakdown */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Monthly Income Breakdown
            </h3>
            <div className="mb-6">
              <div className="grid grid-cols-3 gap-4 text-center mb-4">
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(monthlyIncome)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Income</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatCurrency(totalMonthlyCommitments)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Commitments</p>
                </div>
                <div>
                  <p className={`text-2xl font-bold ${remainingIncome >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatCurrency(remainingIncome)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {remainingIncome >= 0 ? 'Available' : 'Shortfall'}
                  </p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={incomeBreakdownData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {incomeBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [formatCurrency(value as number), 'Amount']}
                  labelFormatter={(label) => `${label}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Cash Flow Comparison */}
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Monthly Cash Flow Analysis
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cashFlowData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
                <YAxis dataKey="category" type="category" width={100} />
                <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
                <Bar dataKey="amount">
                  {cashFlowData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Detailed Expense Breakdown */}
      {/* {(totalEMI > 0 || totalFixedExpenses > 0) && (
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Expense Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseBreakdownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={100}
                fontSize={12}
              />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => [formatCurrency(value as number), 'Amount']} />
              <Bar dataKey="amount">
                {expenseBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )} */}

      {/* Combined Principal vs Interest Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Overall Principal vs Interest Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(combinedAnalytics.totalPaidPrincipal)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid Principal</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-red-600 dark:text-red-400">
                {formatCurrency(combinedAnalytics.totalPaidInterest)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid Interest</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={combinedPieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {combinedPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Principal vs Interest by Loan
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={principalInterestData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Bar dataKey="principal" stackId="a" fill="#10B981" name="Paid Principal" />
              <Bar dataKey="interest" stackId="a" fill="#EF4444" name="Paid Interest" />
              <Bar dataKey="remainingPrincipal" stackId="a" fill="#6B7280" name="Remaining Principal" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Individual Loan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loanAnalytics.map((analytics) => (
          <Card key={analytics.loanId}>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {analytics.loanType}
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid Principal:</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {formatCurrency(analytics.paidPrincipal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid Interest:</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  {formatCurrency(analytics.paidInterest)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Remaining:</span>
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  {formatCurrency(analytics.remainingPrincipal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Total Interest:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  {formatCurrency(analytics.totalInterest)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Progress:</span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {formatPercentage((analytics.paidPrincipal / analytics.totalPrincipal) * 100)}
                  </span>
                </div>
                <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${(analytics.paidPrincipal / analytics.totalPrincipal) * 100}%`
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Original Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Loan Distribution by Principal
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            EMI Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="emi"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  )
}