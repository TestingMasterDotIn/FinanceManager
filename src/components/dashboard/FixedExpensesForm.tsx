import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  PlusIcon, 
  TrashIcon, 
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CurrencyRupeeIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { FixedExpense } from '../../utils/loanCalculations'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'

interface FixedExpensesFormProps {
  onExpensesChange: (expenses: FixedExpense[]) => void
}

export const FixedExpensesForm: React.FC<FixedExpensesFormProps> = ({ onExpensesChange }) => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<FixedExpense[]>([])
  const [newExpense, setNewExpense] = useState({ name: '', amount: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingExpense, setEditingExpense] = useState({ name: '', amount: '' })
  const [isLoading, setIsLoading] = useState(false)

  const fetchExpenses = useCallback(async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
      onExpensesChange(data || [])
    } catch (error) {
      console.error('Error fetching fixed expenses:', error)
    }
  }, [user, onExpensesChange])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const handleAddExpense = async () => {
    if (!user || !newExpense.name.trim() || !newExpense.amount.trim()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .insert([{
          user_id: user.id,
          expense_name: newExpense.name.trim(),
          amount: parseFloat(newExpense.amount),
          category: 'other'
        }])
        .select()

      if (error) throw error
      if (data) {
        const updatedExpenses = [data[0], ...expenses]
        setExpenses(updatedExpenses)
        onExpensesChange(updatedExpenses)
        setNewExpense({ name: '', amount: '' })
      }
    } catch (error) {
      console.error('Error adding expense:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditExpense = async (id: string) => {
    if (!editingExpense.name.trim() || !editingExpense.amount.trim()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('fixed_expenses')
        .update({
          expense_name: editingExpense.name.trim(),
          amount: parseFloat(editingExpense.amount)
        })
        .eq('id', id)
        .select()

      if (error) throw error
      if (data) {
        const updatedExpenses = expenses.map(exp => 
          exp.id === id ? data[0] : exp
        )
        setExpenses(updatedExpenses)
        onExpensesChange(updatedExpenses)
        setEditingId(null)
        setEditingExpense({ name: '', amount: '' })
      }
    } catch (error) {
      console.error('Error updating expense:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('fixed_expenses')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      const updatedExpenses = expenses.filter(exp => exp.id !== id)
      setExpenses(updatedExpenses)
      onExpensesChange(updatedExpenses)
    } catch (error) {
      console.error('Error deleting expense:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const startEdit = (expense: FixedExpense) => {
    setEditingId(expense.id || '')
    setEditingExpense({
      name: expense.expense_name,
      amount: expense.amount.toString()
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingExpense({ name: '', amount: '' })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  return (
    <Card>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
          <CurrencyRupeeIcon className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Fixed Monthly Expenses
        </h3>
      </div>

      {/* Add New Expense Form */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4">Add New Expense</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Expense name (e.g., Rent, Petrol)"
            value={newExpense.name}
            onChange={(e) => setNewExpense(prev => ({ ...prev, name: e.target.value }))}
          />
          <Input
            type="number"
            placeholder="Amount (₹)"
            value={newExpense.amount}
            onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
          />
          <Button 
            onClick={handleAddExpense}
            disabled={!newExpense.name.trim() || !newExpense.amount.trim() || isLoading}
            className="w-full md:w-auto"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <div className="text-center py-8">
          <CurrencyRupeeIcon className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No fixed expenses added yet
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Add your monthly fixed expenses like rent, utilities, loan EMIs, etc.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {expenses.map((expense) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                {editingId === expense.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editingExpense.name}
                      onChange={(e) => setEditingExpense(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Expense name"
                      className="text-sm"
                    />
                    <Input
                      type="number"
                      value={editingExpense.amount}
                      onChange={(e) => setEditingExpense(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="Amount"
                      className="text-sm"
                    />
                    <div className="flex space-x-2 justify-center">
                      <Button
                        size="sm"
                        onClick={() => handleEditExpense(expense.id!)}
                        disabled={isLoading}
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEdit}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-center">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm leading-tight">
                        {expense.expense_name}
                      </h4>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400 mt-1">
                        {formatCurrency(expense.amount)}
                      </p>
                    </div>
                    <div className="flex space-x-2 justify-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(expense)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteExpense(expense.id!)}
                        disabled={isLoading}
                        className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Total Summary */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Total Monthly Fixed Expenses:
              </span>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(totalExpenses)}
              </span>
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
