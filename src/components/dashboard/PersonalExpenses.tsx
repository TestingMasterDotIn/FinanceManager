import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  UserIcon,
  CurrencyRupeeIcon,
  CalendarIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  DocumentIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface PersonalExpense {
  id: string
  user_id: string
  person_name: string
  person_photo_url?: string | null
  amount: number
  expense_date: string
  category: 'grocery' | 'medicine' | 'monthly_maintenance' | 'others'
  custom_category?: string | null
  description?: string | null
  payment_screenshot_url?: string | null
  created_at: string
  updated_at: string
}

const PREDEFINED_CATEGORIES = [
  { value: 'grocery', label: 'Grocery' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'monthly_maintenance', label: 'Monthly Maintenance' },
  { value: 'others', label: 'Others' }
]

export const PersonalExpenses: React.FC = () => {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<PersonalExpense[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<PersonalExpense | null>(null)
  const [viewingExpense, setViewingExpense] = useState<PersonalExpense | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    person_name: '',
    person_photo_url: '',
    amount: '',
    expense_date: '',
    category: 'grocery' as PersonalExpense['category'],
    custom_category: '',
    description: '',
    payment_screenshot_url: ''
  })

  // Filter state
  const [filters, setFilters] = useState({
    person_name: '',
    category: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: ''
  })

  const resetForm = () => {
    setFormData({
      person_name: '',
      person_photo_url: '',
      amount: '',
      expense_date: '',
      category: 'grocery',
      custom_category: '',
      description: '',
      payment_screenshot_url: ''
    })
  }

  const resetFilters = () => {
    setFilters({
      person_name: '',
      category: '',
      start_date: '',
      end_date: '',
      min_amount: '',
      max_amount: ''
    })
  }

  const fetchExpenses = useCallback(async () => {
    if (!user) return
    
    try {
      let query = supabase
        .from('personal_expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })

      // Apply filters
      if (filters.person_name) {
        query = query.ilike('person_name', `%${filters.person_name}%`)
      }
      if (filters.category) {
        query = query.eq('category', filters.category)
      }
      if (filters.start_date) {
        query = query.gte('expense_date', filters.start_date)
      }
      if (filters.end_date) {
        query = query.lte('expense_date', filters.end_date)
      }
      if (filters.min_amount) {
        query = query.gte('amount', parseFloat(filters.min_amount))
      }
      if (filters.max_amount) {
        query = query.lte('amount', parseFloat(filters.max_amount))
      }

      const { data, error } = await query

      if (error) throw error
      setExpenses(data || [])
    } catch (error) {
      console.error('Error fetching expenses:', error)
    }
  }, [user, filters])

  useEffect(() => {
    if (user) {
      fetchExpenses().finally(() => setLoading(false))
    }
  }, [user, fetchExpenses])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const expenseData = {
        user_id: user.id,
        person_name: formData.person_name,
        person_photo_url: formData.person_photo_url || null,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        category: formData.category,
        custom_category: formData.category === 'others' ? formData.custom_category : null,
        description: formData.description || null,
        payment_screenshot_url: formData.payment_screenshot_url || null
      }

      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from('personal_expenses')
          .update(expenseData)
          .eq('id', editingExpense.id)

        if (error) throw error
        
        setExpenses(prev => prev.map(expense => 
          expense.id === editingExpense.id ? { ...expense, ...expenseData } : expense
        ))
      } else {
        // Create new expense
        const { data, error } = await supabase
          .from('personal_expenses')
          .insert([expenseData])
          .select()
          .single()

        if (error) throw error
        setExpenses(prev => [data, ...prev])
      }

      setIsFormOpen(false)
      setEditingExpense(null)
      resetForm()
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Failed to save expense. Please try again.')
    }
  }

  const handleEdit = (expense: PersonalExpense) => {
    setEditingExpense(expense)
    setFormData({
      person_name: expense.person_name,
      person_photo_url: expense.person_photo_url || '',
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      category: expense.category,
      custom_category: expense.custom_category || '',
      description: expense.description || '',
      payment_screenshot_url: expense.payment_screenshot_url || ''
    })
    setIsFormOpen(true)
  }

  const handleDelete = async (expense: PersonalExpense) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return

    try {
      const { error } = await supabase
        .from('personal_expenses')
        .delete()
        .eq('id', expense.id)

      if (error) throw error
      
      setExpenses(prev => prev.filter(e => e.id !== expense.id))
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Failed to delete expense. Please try again.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getCategoryDisplay = (expense: PersonalExpense) => {
    if (expense.category === 'others' && expense.custom_category) {
      return expense.custom_category
    }
    return PREDEFINED_CATEGORIES.find(cat => cat.value === expense.category)?.label || expense.category
  }

  const getStats = () => {
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    
    const thisMonthExpenses = expenses
      .filter(expense => {
        const expenseDate = new Date(expense.expense_date)
        return expenseDate.getMonth() === currentMonth && expenseDate.getFullYear() === currentYear
      })
      .reduce((sum, expense) => sum + expense.amount, 0)

    const categoryBreakdown = expenses.reduce((acc, expense) => {
      const category = getCategoryDisplay(expense)
      acc[category] = (acc[category] || 0) + expense.amount
      return acc
    }, {} as Record<string, number>)

    const topCategory = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)[0]

    return {
      totalExpenses,
      thisMonthExpenses,
      expenseCount: expenses.length,
      topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null
    }
  }

  const stats = getStats()

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-4">
          <div className="flex items-center">
            <CurrencyRupeeIcon className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.thisMonthExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TagIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-purple-600">{stats.expenseCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TagIcon className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600">Top Category</p>
              <p className="text-lg font-bold text-orange-600">
                {stats.topCategory ? stats.topCategory.name : 'None'}
              </p>
              {stats.topCategory && (
                <p className="text-sm text-gray-500">{formatCurrency(stats.topCategory.amount)}</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Header with Add and Filter Buttons */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Personal Expenses</h3>
          <p className="text-gray-600 dark:text-gray-300">Track expenses spent on friends and family members</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center space-x-2"
            title="Filter Expenses"
          >
            <FunnelIcon className="h-4 w-4" />
            <span>Filter</span>
          </Button>
          <Button 
            onClick={() => {
              resetForm()
              setEditingExpense(null)
              setIsFormOpen(true)
            }}
            className="flex items-center space-x-2"
            title="Add New Expense Record"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Expenses List */}
      {expenses.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <CurrencyRupeeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No expenses recorded yet</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-4">Start tracking expenses spent on your friends and family</p>
            <Button onClick={() => setIsFormOpen(true)} title="Add your first expense record">Add First Expense</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {expenses.map((expense) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-4 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      {expense.person_photo_url ? (
                        <img
                          src={expense.person_photo_url}
                          alt={expense.person_name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-gray-200 rounded-full flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-gray-500" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        {expense.person_name}
                        {expense.payment_screenshot_url && (
                          <DocumentIcon className="h-4 w-4 ml-2 text-green-600" title="Payment screenshot available" />
                        )}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Amount:</span> {formatCurrency(expense.amount)}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {new Date(expense.expense_date).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">Category:</span> {getCategoryDisplay(expense)}
                        </div>
                        {expense.description && (
                          <div className="col-span-2 md:col-span-1">
                            <span className="font-medium">Description:</span> {expense.description.length > 30 ? expense.description.substring(0, 30) + '...' : expense.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewingExpense(expense)
                        setIsViewModalOpen(true)
                      }}
                      title="View Expense Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(expense)}
                      title="Edit Expense"
                    >
                      <PencilIcon className="h-4 w-4"/>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(expense)}
                      className="text-red-600 hover:bg-red-50"
                      title="Delete Expense"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false)
          setEditingExpense(null)
          resetForm()
        }}
        title={editingExpense ? 'Edit Expense' : 'Add New Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Person Name *
              </label>
              <Input
                type="text"
                value={formData.person_name}
                onChange={(e) => setFormData({...formData, person_name: e.target.value})}
                placeholder="Enter person's name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Amount *
              </label>
              <Input
                type="number"
                step={0.01}
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expense Date *
              </label>
              <Input
                type="date"
                value={formData.expense_date}
                onChange={(e) => setFormData({...formData, expense_date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value as PersonalExpense['category']})}
                options={PREDEFINED_CATEGORIES}
                required
              />
            </div>

            {formData.category === 'others' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Category *
                </label>
                <Input
                  type="text"
                  value={formData.custom_category}
                  onChange={(e) => setFormData({...formData, custom_category: e.target.value})}
                  placeholder="Enter custom category"
                  required
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Any additional notes about this expense..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Person Photo URL
                </label>
                <Input
                  type="url"
                  value={formData.person_photo_url}
                  onChange={(e) => setFormData({...formData, person_photo_url: e.target.value})}
                  placeholder="https://example.com/photo.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">Photo of the person this expense was for</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Screenshot URL
                </label>
                <Input
                  type="url"
                  value={formData.payment_screenshot_url}
                  onChange={(e) => setFormData({...formData, payment_screenshot_url: e.target.value})}
                  placeholder="https://example.com/payment-screenshot.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">Screenshot of payment/transaction receipt</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFormOpen(false)
                setEditingExpense(null)
                resetForm()
              }}
              className="flex-1"
              title="Cancel and close form"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              title={editingExpense ? 'Update expense record' : 'Add new expense record'}
            >
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setViewingExpense(null)
        }}
        title="Expense Details"
      >
        {viewingExpense && (
          <div className="space-y-4">
            <div className="flex items-center space-x-4 mb-6">
              {viewingExpense.person_photo_url ? (
                <img
                  src={viewingExpense.person_photo_url}
                  alt={viewingExpense.person_name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{viewingExpense.person_name}</h3>
                <p className="text-gray-600 dark:text-gray-300">Expense Details</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Amount</h4>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(viewingExpense.amount)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Date</h4>
                <p className="text-gray-600 dark:text-gray-300">{new Date(viewingExpense.expense_date).toLocaleDateString()}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Category</h4>
                <p className="text-gray-600 dark:text-gray-300">{getCategoryDisplay(viewingExpense)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Created</h4>
                <p className="text-gray-600 dark:text-gray-300">{new Date(viewingExpense.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {viewingExpense.description && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Description</h4>
                <p className="text-gray-600 dark:text-gray-300">{viewingExpense.description}</p>
              </div>
            )}

            {viewingExpense.payment_screenshot_url && (
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Payment Screenshot</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <img
                    src={viewingExpense.payment_screenshot_url}
                    alt="Payment Screenshot"
                    className="max-w-full h-auto rounded-md shadow-sm border"
                    style={{ maxHeight: '300px' }}
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    <a 
                      href={viewingExpense.payment_screenshot_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      View full size
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Filter Modal */}
      <Modal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Expenses"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Person Name</label>
              <Input
                type="text"
                value={filters.person_name}
                onChange={(e) => setFilters({...filters, person_name: e.target.value})}
                placeholder="Search by person name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <Select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                options={[
                  { value: '', label: 'All Categories' },
                  ...PREDEFINED_CATEGORIES
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <Input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters({...filters, start_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <Input
                type="date"
                value={filters.end_date}
                onChange={(e) => setFilters({...filters, end_date: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
              <Input
                type="number"
                step={0.01}
                value={filters.min_amount}
                onChange={(e) => setFilters({...filters, min_amount: e.target.value})}
                placeholder="Minimum amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
              <Input
                type="number"
                step={0.01}
                value={filters.max_amount}
                onChange={(e) => setFilters({...filters, max_amount: e.target.value})}
                placeholder="Maximum amount"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetFilters()
                setIsFilterOpen(false)
              }}
              className="flex-1"
              title="Clear all filters"
            >
              Clear Filters
            </Button>
            <Button 
              onClick={() => {
                fetchExpenses()
                setIsFilterOpen(false)
              }}
              className="flex-1"
              title="Apply filters to expense list"
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
