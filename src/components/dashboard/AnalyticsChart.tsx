import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Card } from '../ui/Card'
import { LoanData } from '../../utils/loanCalculations'

interface AnalyticsChartProps {
  loans: LoanData[]
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899']

export const AnalyticsChart: React.FC<AnalyticsChartProps> = ({ loans }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Pie chart data for loan distribution
  const pieData = loans.map((loan, index) => ({
    name: loan.loan_type,
    value: loan.principal,
    color: COLORS[index % COLORS.length]
  }))

  // Line chart data for EMI over time
  const lineData = loans.map((loan, index) => ({
    name: loan.loan_type,
    emi: loan.emi_amount,
    principal: loan.principal,
    rate: loan.interest_rate
  }))

  return (
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
              label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
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
  )
}