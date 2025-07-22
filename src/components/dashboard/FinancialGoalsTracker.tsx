import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  AcademicCapIcon, 
  HomeIcon, 
  TruckIcon, 
  GiftIcon,
  CalendarIcon,
  TrophyIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface FinancialGoal {
  id?: string
  user_id: string
  goal_name: string
  goal_type: 'house' | 'car' | 'education' | 'retirement' | 'vacation' | 'emergency' | 'other'
  target_amount: number
  current_amount: number
  target_date: string
  monthly_contribution: number
  priority: 'high' | 'medium' | 'low'
  created_at?: string
}

const goalIcons = {
  house: HomeIcon,
  car: TruckIcon,
  education: AcademicCapIcon,
  retirement: TrophyIcon,
  vacation: GiftIcon,
  emergency: CalendarIcon,
  other: TrophyIcon
}

const goalColors = {
  house: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  car: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  education: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  retirement: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  vacation: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  emergency: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  other: 'bg-gray-50 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400'
}

export const FinancialGoalsTracker: React.FC = () => {
  const { user } = useAuth()
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newGoal, setNewGoal] = useState<Omit<FinancialGoal, 'id' | 'user_id' | 'created_at'>>({
    goal_name: '',
    goal_type: 'house',
    target_amount: 0,
    current_amount: 0,
    target_date: '',
    monthly_contribution: 0,
    priority: 'medium'
  })

  useEffect(() => {
    if (user) {
      fetchGoals()
    }
  }, [user])

  const fetchGoals = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true })

      if (error) throw error
      setGoals(data || [])
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddGoal = async () => {
    if (!user || !newGoal.goal_name) return

    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .insert([{
          ...newGoal,
          user_id: user.id
        }])
        .select()

      if (error) throw error
      if (data) {
        setGoals(prev => [...prev, data[0]])
        setNewGoal({
          goal_name: '',
          goal_type: 'house',
          target_amount: 0,
          current_amount: 0,
          target_date: '',
          monthly_contribution: 0,
          priority: 'medium'
        })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding goal:', error)
    }
  }

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }

  const calculateMonthsToGoal = (current: number, target: number, monthly: number) => {
    if (monthly <= 0) return Infinity
    return Math.ceil((target - current) / monthly)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const generateSampleGoals = () => {
    const sampleGoals: FinancialGoal[] = [
      {
        user_id: user?.id || '',
        goal_name: 'Dream Home',
        goal_type: 'house',
        target_amount: 5000000,
        current_amount: 800000,
        target_date: '2027-12-31',
        monthly_contribution: 50000,
        priority: 'high',
        created_at: new Date().toISOString()
      },
      {
        user_id: user?.id || '',
        goal_name: 'Emergency Fund',
        goal_type: 'emergency',
        target_amount: 500000,
        current_amount: 200000,
        target_date: '2025-12-31',
        monthly_contribution: 25000,
        priority: 'high',
        created_at: new Date().toISOString()
      },
      {
        user_id: user?.id || '',
        goal_name: 'New Car',
        goal_type: 'car',
        target_amount: 1200000,
        current_amount: 300000,
        target_date: '2026-06-30',
        monthly_contribution: 30000,
        priority: 'medium',
        created_at: new Date().toISOString()
      }
    ]
    setGoals(sampleGoals)
    setLoading(false)
  }

  if (loading) {
    return (
      <Card>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <TrophyIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Financial Goals
          </h3>
        </div>
        <Button size="sm" onClick={() => goals.length === 0 ? generateSampleGoals() : setShowAddForm(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          {goals.length === 0 ? 'Add Sample Goals' : 'Add Goal'}
        </Button>
      </div>

      {goals.length > 0 ? (
        <div className="space-y-4">
          {goals.map((goal, index) => {
            const IconComponent = goalIcons[goal.goal_type]
            const progress = calculateProgress(goal.current_amount, goal.target_amount)
            const monthsToGoal = calculateMonthsToGoal(goal.current_amount, goal.target_amount, goal.monthly_contribution)
            const targetDate = new Date(goal.target_date)
            const isOverdue = targetDate < new Date() && progress < 100
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${
                  goal.priority === 'high' ? 'border-red-500' :
                  goal.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'
                } bg-gray-50 dark:bg-gray-800`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${goalColors[goal.goal_type]}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {goal.goal_name}
                      </h4>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Target: {targetDate.toLocaleDateString()}
                        {isOverdue && <span className="text-red-500 ml-2">• Overdue</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {formatCurrency(goal.current_amount)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      of {formatCurrency(goal.target_amount)}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <span>{progress.toFixed(1)}% Complete</span>
                    <span>
                      {monthsToGoal === Infinity ? 'Add contributions' : `${monthsToGoal} months to go`}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full transition-all duration-500 ${
                        progress >= 100 ? 'bg-green-500' :
                        progress >= 75 ? 'bg-blue-500' :
                        progress >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {goal.monthly_contribution > 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Monthly contribution: {formatCurrency(goal.monthly_contribution)}
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <TrophyIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Set Your Financial Goals
          </h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Track progress towards your dreams and stay motivated
          </p>
        </div>
      )}

      {/* Add Goal Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-6 p-4 border-t border-gray-200 dark:border-gray-700"
        >
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Add New Goal</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Goal Name"
              placeholder="e.g., Dream Home"
              value={newGoal.goal_name}
              onChange={(e) => setNewGoal(prev => ({ ...prev, goal_name: e.target.value }))}
            />
            <Select
              label="Goal Type"
              value={newGoal.goal_type}
              onChange={(e) => setNewGoal(prev => ({ ...prev, goal_type: e.target.value as FinancialGoal['goal_type'] }))}
              options={[
                { value: 'house', label: '🏠 House' },
                { value: 'car', label: '🚗 Car' },
                { value: 'education', label: '🎓 Education' },
                { value: 'retirement', label: '🏆 Retirement' },
                { value: 'vacation', label: '✈️ Vacation' },
                { value: 'emergency', label: '🆘 Emergency Fund' },
                { value: 'other', label: '🎯 Other' }
              ]}
            />
            <Input
              type="number"
              label="Target Amount (₹)"
              placeholder="1000000"
              value={newGoal.target_amount || ''}
              onChange={(e) => setNewGoal(prev => ({ ...prev, target_amount: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              type="number"
              label="Current Amount (₹)"
              placeholder="100000"
              value={newGoal.current_amount || ''}
              onChange={(e) => setNewGoal(prev => ({ ...prev, current_amount: parseFloat(e.target.value) || 0 }))}
            />
            <Input
              type="date"
              label="Target Date"
              value={newGoal.target_date}
              onChange={(e) => setNewGoal(prev => ({ ...prev, target_date: e.target.value }))}
            />
            <Input
              type="number"
              label="Monthly Contribution (₹)"
              placeholder="10000"
              value={newGoal.monthly_contribution || ''}
              onChange={(e) => setNewGoal(prev => ({ ...prev, monthly_contribution: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Priority"
              value={newGoal.priority}
              onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value as FinancialGoal['priority'] }))}
              options={[
                { value: 'high', label: '🔴 High' },
                { value: 'medium', label: '🟡 Medium' },
                { value: 'low', label: '🟢 Low' }
              ]}
            />
          </div>
          <div className="flex space-x-2 mt-4">
            <Button onClick={handleAddGoal}>Add Goal</Button>
            <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}
    </Card>
  )
}
