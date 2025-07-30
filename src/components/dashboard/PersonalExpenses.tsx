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
  DocumentIcon,
  ChevronDownIcon,
  ChevronUpIcon
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
  person_type: 'family_member' | 'event'
  person_photo_url?: string | null
  amount: number
  expense_date: string
  category: 'grocery' | 'medicine' | 'monthly_maintenance' | 'others' | 'custom'
  custom_category?: string | null
  description?: string | null
  payment_screenshot_url?: string | null
  created_at: string
  updated_at: string
}

interface CustomCategory {
  id: string
  user_id: string
  category_name: string
  description?: string | null
  color: string
  created_at: string
  updated_at: string
}

interface ManagedMemberEvent {
  id: string
  user_id: string
  name: string
  type: 'family_member' | 'event'
  photo_url?: string | null
  description?: string | null
  created_at: string
  updated_at: string
}

const PREDEFINED_CATEGORIES = [
  { value: 'grocery', label: 'Grocery' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'travel', label: 'Travel' },
  { value: 'monthly_maintenance', label: 'Monthly Maintenance' },
  { value: 'Misc', label: 'Miscellaneous' },
  { value: 'custom', label: 'Custom Category' },
  { value: 'others', label: 'Others' }
]

const PERSON_TYPES = [
  { value: 'family_member', label: 'Family Member' },
  { value: 'event', label: 'Event' }
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
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([])
  const [managedMembers, setManagedMembers] = useState<ManagedMemberEvent[]>([])
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null)
  const [editingMember, setEditingMember] = useState<ManagedMemberEvent | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  // Form state
  const [formData, setFormData] = useState({
    person_name: '',
    person_type: 'family_member' as PersonalExpense['person_type'],
    person_photo_url: '',
    amount: '',
    expense_date: '',
    category: 'grocery' as string, // Changed to string to allow custom category names
    custom_category: '',
    selected_custom_category: '',
    description: '',
    payment_screenshot_url: '',
    selected_member_id: ''
  })

  // Category form state
  const [categoryFormData, setCategoryFormData] = useState({
    category_name: '',
    description: '',
    color: '#3B82F6'
  })

  // Member form state
  const [memberFormData, setMemberFormData] = useState({
    name: '',
    type: 'family_member' as 'family_member' | 'event',
    photo_url: '',
    description: ''
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
      person_type: 'family_member',
      person_photo_url: '',
      amount: '',
      expense_date: '',
      category: 'grocery',
      custom_category: '',
      selected_custom_category: '',
      description: '',
      payment_screenshot_url: '',
      selected_member_id: ''
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
        query = query.eq('person_name', filters.person_name)
      }
      if (filters.category) {
        // Check if it's a custom category
        const isCustomCategory = customCategories.some(cat => cat.category_name === filters.category)
        if (isCustomCategory) {
          query = query.eq('category', 'custom').eq('custom_category', filters.category)
        } else {
          query = query.eq('category', filters.category)
        }
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
  }, [user, filters, customCategories])

  const fetchCustomCategories = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('custom_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('category_name')

      if (error) throw error
      setCustomCategories(data || [])
    } catch (error) {
      console.error('Error fetching custom categories:', error)
    }
  }, [user])

  const fetchManagedMembers = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('managed_members_events')
        .select('*')
        .eq('user_id', user.id)
        .order('name')

      if (error) throw error
      setManagedMembers(data || [])
    } catch (error) {
      console.error('Error fetching managed members:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchExpenses().finally(() => setLoading(false))
      fetchCustomCategories()
      fetchManagedMembers()
    }
  }, [user, fetchExpenses, fetchCustomCategories, fetchManagedMembers])

  const getGroupedExpenses = () => {
    const grouped = expenses.reduce((groups, expense) => {
      const key = expense.person_name
      if (!groups[key]) {
        groups[key] = {
          person_name: expense.person_name,
          person_type: expense.person_type || 'family_member',
          person_photo_url: expense.person_photo_url,
          expenses: [],
          total_amount: 0
        }
      }
      groups[key].expenses.push(expense)
      groups[key].total_amount += expense.amount
      return groups
    }, {} as Record<string, {
      person_name: string
      person_type: 'family_member' | 'event'
      person_photo_url?: string | null
      expenses: PersonalExpense[]
      total_amount: number
    }>)

    // Sort expenses within each group by date (newest first) and then sort groups by total amount
    const groupedArray = Object.values(grouped).map(group => ({
      ...group,
      expenses: group.expenses.sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
    }))

    return groupedArray.sort((a, b) => b.total_amount - a.total_amount)
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const categoryData = {
        user_id: user.id,
        category_name: categoryFormData.category_name,
        description: categoryFormData.description || null,
        color: categoryFormData.color
      }

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('custom_categories')
          .update(categoryData)
          .eq('id', editingCategory.id)

        if (error) throw error
        
        setCustomCategories(prev => prev.map(cat => 
          cat.id === editingCategory.id ? { ...cat, ...categoryData } : cat
        ))
      } else {
        // Create new category
        const { data, error } = await supabase
          .from('custom_categories')
          .insert([categoryData])
          .select()
          .single()

        if (error) throw error
        setCustomCategories(prev => [...prev, data])
      }

      setIsCategoryModalOpen(false)
      setEditingCategory(null)
      setCategoryFormData({ category_name: '', description: '', color: '#3B82F6' })
      
      // Refresh expenses to update the display with new category
      await fetchExpenses()
    } catch (error) {
      console.error('Error saving category:', error)
      alert('Failed to save category. Please try again.')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const { error } = await supabase
        .from('custom_categories')
        .delete()
        .eq('id', categoryId)

      if (error) throw error
      
      setCustomCategories(prev => prev.filter(cat => cat.id !== categoryId))
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('Failed to delete category. Please try again.')
    }
  }

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      const memberData = {
        user_id: user.id,
        name: memberFormData.name,
        type: memberFormData.type,
        photo_url: memberFormData.photo_url || null,
        description: memberFormData.description || null
      }

      if (editingMember) {
        // Update existing member
        const { error } = await supabase
          .from('managed_members_events')
          .update(memberData)
          .eq('id', editingMember.id)

        if (error) throw error
        
        setManagedMembers(prev => prev.map(member => 
          member.id === editingMember.id ? { ...member, ...memberData } : member
        ))
      } else {
        // Create new member
        const { data, error } = await supabase
          .from('managed_members_events')
          .insert([memberData])
          .select()
          .single()

        if (error) throw error
        setManagedMembers(prev => [...prev, data])
      }

      setIsMemberModalOpen(false)
      setEditingMember(null)
      setMemberFormData({ name: '', type: 'family_member', photo_url: '', description: '' })
    } catch (error) {
      console.error('Error saving member:', error)
      alert('Failed to save member/event. Please try again.')
    }
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to delete this member/event?')) return

    try {
      const { error } = await supabase
        .from('managed_members_events')
        .delete()
        .eq('id', memberId)

      if (error) throw error
      
      setManagedMembers(prev => prev.filter(member => member.id !== memberId))
    } catch (error) {
      console.error('Error deleting member:', error)
      alert('Failed to delete member/event. Please try again.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      // Get selected member details
      const selectedMember = managedMembers.find(member => member.id === formData.selected_member_id)
      const personName = selectedMember ? selectedMember.name : formData.person_name
      const personType = selectedMember ? selectedMember.type : formData.person_type
      const personPhotoUrl = selectedMember ? selectedMember.photo_url : formData.person_photo_url
      
      let finalCategory: PersonalExpense['category'] = 'grocery'
      let finalCustomCategory = null
      
      // Check if the selected value is a custom category
      const isCustomCategory = customCategories.some(cat => cat.category_name === formData.category)
      if (isCustomCategory) {
        finalCategory = 'custom'
        finalCustomCategory = formData.category
      } else if (formData.category === 'custom') {
        finalCategory = 'custom'
        finalCustomCategory = formData.selected_custom_category
      } else if (formData.category === 'others') {
        finalCategory = 'others'
        finalCustomCategory = formData.custom_category
      } else {
        // It's a predefined category
        finalCategory = formData.category as PersonalExpense['category']
      }
      
      const expenseData = {
        user_id: user.id,
        person_name: personName,
        person_type: personType,
        person_photo_url: personPhotoUrl || null,
        amount: parseFloat(formData.amount),
        expense_date: formData.expense_date,
        category: finalCategory,
        custom_category: finalCustomCategory,
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
    
    // Determine the category value for the form
    let categoryValue: string = expense.category
    if (expense.category === 'custom' && expense.custom_category) {
      // If it's a custom category, use the custom category name directly
      categoryValue = expense.custom_category
    }
    
    // Find matching managed member
    const matchingMember = managedMembers.find(member => 
      member.name === expense.person_name && member.type === expense.person_type
    )
    
    setFormData({
      person_name: expense.person_name,
      person_type: expense.person_type || 'family_member',
      person_photo_url: expense.person_photo_url || '',
      amount: expense.amount.toString(),
      expense_date: expense.expense_date,
      category: categoryValue,
      custom_category: expense.category === 'others' ? expense.custom_category || '' : '',
      selected_custom_category: expense.category === 'custom' ? expense.custom_category || '' : '',
      description: expense.description || '',
      payment_screenshot_url: expense.payment_screenshot_url || '',
      selected_member_id: matchingMember ? matchingMember.id : ''
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
    if (expense.category === 'custom' && expense.custom_category) {
      const customCat = customCategories.find(cat => cat.category_name === expense.custom_category)
      return customCat ? customCat.category_name : expense.custom_category
    }
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

  const toggleGroupExpansion = (groupKey: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }))
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">This Month</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.thisMonthExpenses)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TagIcon className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Records</p>
              <p className="text-2xl font-bold text-purple-600">{stats.expenseCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <TagIcon className="h-8 w-8 text-orange-600 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Top Category</p>
              <p className="text-lg font-bold text-orange-600">
                {stats.topCategory ? stats.topCategory.name : 'None'}
              </p>
              {stats.topCategory && (
                <p className="text-sm text-gray-500 dark:text-gray-200">{formatCurrency(stats.topCategory.amount)}</p>
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
            variant="outline"
            onClick={() => {
              setCategoryFormData({ category_name: '', description: '', color: '#3B82F6' })
              setEditingCategory(null)
              setIsCategoryModalOpen(true)
            }}
            className="flex items-center space-x-2"
            title="Add/Manage Custom Categories"
          >
            <TagIcon className="h-4 w-4" />
            <span>Add/Manage Categories</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setMemberFormData({ name: '', type: 'family_member', photo_url: '', description: '' })
              setEditingMember(null)
              setIsMemberModalOpen(true)
            }}
            className="flex items-center space-x-2"
            title="Add/Manage Members & Events"
          >
            <UserIcon className="h-4 w-4" />
            <span>Add/Manage Member/Event</span>
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
        <div className="grid grid-cols-1 gap-6">
          {getGroupedExpenses().map((group, groupIndex) => (
            <motion.div
              key={`${group.person_name}-${group.person_type}-${groupIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="p-6 bg-white dark:bg-gray-800">
                {/* Person/Event Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {group.expenses[0].person_photo_url ? (
                        <img
                          src={group.expenses[0].person_photo_url}
                          alt={group.person_name}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          {group.person_type === 'family_member' ? (
                            <UserIcon className="h-8 w-8 text-white" />
                          ) : (
                            <span className="text-2xl">🎉</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        {group.person_name}
                        <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                          {group.person_type === 'family_member' ? 'Family Member' : 'Event'}
                        </span>
                      </h3>
                      <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <span className="font-medium">Total Amount:</span> 
                          <span className="text-lg font-bold text-green-600 dark:text-green-400 ml-2">
                            {formatCurrency(group.total_amount)}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">Transactions:</span> {group.expenses.length}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expenses History */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Transaction History
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleGroupExpansion(`${group.person_name}-${group.person_type}`)}
                      className="flex items-center space-x-1"
                      title={expandedGroups[`${group.person_name}-${group.person_type}`] ? "Minimize transactions" : "Show all transactions"}
                    >
                      {expandedGroups[`${group.person_name}-${group.person_type}`] ? (
                        <>
                          <ChevronUpIcon className="h-3 w-3" />
                          <span className="text-xs">Minimize</span>
                        </>
                      ) : (
                        <>
                          <ChevronDownIcon className="h-3 w-3" />
                          <span className="text-xs">Show All ({group.expenses.length})</span>
                        </>
                      )}
                    </Button>
                  </div>
                  {(() => {
                    const groupKey = `${group.person_name}-${group.person_type}`
                    const isExpanded = expandedGroups[groupKey]
                    const expensesToShow = isExpanded 
                      ? group.expenses 
                      : [] // Show no transactions when minimized
                    
                    return expensesToShow.map((expense, expenseIndex) => (
                      <div key={`${expense.id}-${expenseIndex}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex-1">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Amount:</span>
                              <span className="ml-1 font-semibold text-green-600 dark:text-green-400">
                                {formatCurrency(expense.amount)}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Date:</span>
                              <span className="ml-1">{new Date(expense.expense_date).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700 dark:text-gray-300">Category:</span>
                              <span className="ml-1">{getCategoryDisplay(expense)}</span>
                            </div>
                            {expense.description && (
                              <div>
                                <span className="font-medium text-gray-700 dark:text-gray-300">Note:</span>
                                <span className="ml-1">{expense.description.length > 20 ? expense.description.substring(0, 20) + '...' : expense.description}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1 ml-4">
                          {expense.payment_screenshot_url && (
                            <DocumentIcon className="h-4 w-4 text-green-600" title="Payment screenshot available" />
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setViewingExpense(expense)
                              setIsViewModalOpen(true)
                            }}
                            title="View Details"
                          >
                            <EyeIcon className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                            title="Edit"
                          >
                            <PencilIcon className="h-3 w-3"/>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(expense)}
                            className="text-red-600 hover:bg-red-50"
                            title="Delete"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  })()}
                  {/* {(() => {
                    const groupKey = `${group.person_name}-${group.person_type}`
                    return !expandedGroups[groupKey] && group.expenses.length > 0 && (
                      <div className="text-center py-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {group.expenses.length} transaction{group.expenses.length > 1 ? 's' : ''} hidden. Click "Show All" to view.
                        </p>
                      </div>
                    )
                  })()} */}
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
          {/* Helpful hints */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-start">
              <span className="text-blue-500 mr-2">💡</span>
              <span>You can add expenses for family members or events like House Warming, Birthday parties, Weddings, Trips, etc. Choose an existing person to group all their expenses together! You can also create custom categories using the "Categories" button above.</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type *
              </label>
              <Select
                value={formData.person_type}
                onChange={(e) => setFormData({...formData, person_type: e.target.value as 'family_member' | 'event'})}
                options={PERSON_TYPES}
                required
              />
            </div> */}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Member/Event
              </label>
              <Select
                value={formData.selected_member_id}
                onChange={(e) => {
                  const memberId = e.target.value
                  const selectedMember = managedMembers.find(member => member.id === memberId)
                  setFormData({
                    ...formData, 
                    selected_member_id: memberId,
                    person_name: selectedMember ? selectedMember.name : '',
                    person_type: selectedMember ? selectedMember.type : 'family_member',
                    person_photo_url: selectedMember ? selectedMember.photo_url || '' : ''
                  })
                }}
                options={[
                  // { value: '', label: 'Select Member/Event or Create New...' },
                  ...managedMembers.map(member => ({ 
                    value: member.id, 
                    label: `${member.name} (${member.type === 'family_member' ? 'Family' : 'Event'})` 
                  }))
                ]}
              />
            </div>

            {/* {!formData.selected_member_id && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {formData.person_type === 'family_member' ? 'Family Member Name' : 'Event Name'} *
                  </label>
                  <Input
                    type="text"
                    value={formData.person_name}
                    onChange={(e) => setFormData({...formData, person_name: e.target.value})}
                    placeholder={formData.person_type === 'family_member' ? 'Enter family member name' : 'e.g., House Warming, Birthday Party, Wedding'}
                    required
                  />
                </div>
              </>
            )} */}

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
                value={formData.category === 'custom' ? formData.selected_custom_category : formData.category}
                onChange={(e) => {
                  const value = e.target.value
                  // Check if it's a custom category
                  const isCustomCategory = customCategories.some(cat => cat.category_name === value)
                  if (isCustomCategory) {
                    setFormData({
                      ...formData, 
                      category: value,
                      selected_custom_category: value
                    })
                  } else {
                    setFormData({
                      ...formData, 
                      category: value,
                      selected_custom_category: ''
                    })
                  }
                }}
                options={[
                  ...PREDEFINED_CATEGORIES.filter(cat => cat.value !== 'custom' && cat.value !== 'others'),
                  ...customCategories.map(cat => ({ value: cat.category_name, label: `${cat.category_name} (Custom)` })),
                  { value: 'others', label: 'Others' }
                ]}
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
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Photo of the person this expense was for</p>
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
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">Screenshot of payment/transaction receipt</p>
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
                  <UserIcon className="h-8 w-8 text-gray-500 dark:text-gray-300" />
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
                  <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Person/Event</label>
              <Select
                value={filters.person_name}
                onChange={(e) => setFilters({...filters, person_name: e.target.value})}
                options={[
                  { value: '', label: 'All Persons/Events' },
                  ...managedMembers.map(member => ({ 
                    value: member.name, 
                    label: `${member.name} (${member.type === 'family_member' ? 'Family' : 'Event'})` 
                  }))
                ]}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
              <Select
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                options={[
                  { value: '', label: 'All Categories' },
                  ...PREDEFINED_CATEGORIES.filter(cat => cat.value !== 'custom'),
                  ...customCategories.map(cat => ({ value: cat.category_name, label: `${cat.category_name} (Custom)` }))
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

      {/* Custom Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false)
          setEditingCategory(null)
          setCategoryFormData({ category_name: '', description: '', color: '#3B82F6' })
        }}
        title={editingCategory ? 'Edit Category' : 'Manage Custom Categories'}
      >
        <div className="space-y-6">
          {/* Add/Edit Category Form */}
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category Name *
                </label>
                <Input
                  type="text"
                  value={categoryFormData.category_name}
                  onChange={(e) => setCategoryFormData({...categoryFormData, category_name: e.target.value})}
                  placeholder="Enter category name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <Input
                  type="color"
                  value={categoryFormData.color}
                  onChange={(e) => setCategoryFormData({...categoryFormData, color: e.target.value})}
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({...categoryFormData, description: e.target.value})}
                placeholder="Brief description of this category..."
              />
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingCategory(null)
                  setCategoryFormData({ category_name: '', description: '', color: '#3B82F6' })
                }}
                className="flex-1"
              >
                {editingCategory ? 'Cancel Edit' : 'Clear'}
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
              >
                {editingCategory ? 'Update Category' : 'Add Category'}
              </Button>
            </div>
          </form>

          {/* Existing Categories List */}
          {customCategories.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Your Custom Categories</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customCategories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{category.category_name}</p>
                        {category.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300">{category.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCategory(category)
                          setCategoryFormData({
                            category_name: category.category_name,
                            description: category.description || '',
                            color: category.color
                          })
                        }}
                        title="Edit Category"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="text-red-600 hover:bg-red-50"
                        title="Delete Category"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customCategories.length === 0 && !editingCategory && (
            <div className="text-center py-6">
              <TagIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Custom Categories Yet</h3>
              <p className="text-gray-600 dark:text-gray-300">Create your first custom category to organize your expenses better.</p>
            </div>
          )}
        </div>
      </Modal>

      {/* Member/Event Management Modal */}
      <Modal
        isOpen={isMemberModalOpen}
        onClose={() => {
          setIsMemberModalOpen(false)
          setEditingMember(null)
          setMemberFormData({ name: '', type: 'family_member', photo_url: '', description: '' })
        }}
        title={editingMember ? 'Edit Member/Event' : 'Manage Members & Events'}
      >
        <div className="space-y-6">
          {/* Add/Edit Member Form */}
          <form onSubmit={handleMemberSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <Input
                  type="text"
                  value={memberFormData.name}
                  onChange={(e) => setMemberFormData({...memberFormData, name: e.target.value})}
                  placeholder="Enter name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type *
                </label>
                <Select
                  value={memberFormData.type}
                  onChange={(e) => setMemberFormData({...memberFormData, type: e.target.value as 'family_member' | 'event'})}
                  options={PERSON_TYPES}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Photo URL (Optional)
              </label>
              <Input
                type="url"
                value={memberFormData.photo_url}
                onChange={(e) => setMemberFormData({...memberFormData, photo_url: e.target.value})}
                placeholder="https://example.com/photo.jpg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={memberFormData.description}
                onChange={(e) => setMemberFormData({...memberFormData, description: e.target.value})}
                placeholder="Brief description..."
              />
            </div>

            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingMember(null)
                  setMemberFormData({ name: '', type: 'family_member', photo_url: '', description: '' })
                }}
                className="flex-1"
              >
                {editingMember ? 'Cancel Edit' : 'Clear'}
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
              >
                {editingMember ? 'Update Member/Event' : 'Add Member/Event'}
              </Button>
            </div>
          </form>

          {/* Existing Members List */}
          {managedMembers.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Your Members & Events</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {managedMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {member.photo_url ? (
                        <img
                          src={member.photo_url}
                          alt={member.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          {member.type === 'family_member' ? (
                            <UserIcon className="h-5 w-5 text-white" />
                          ) : (
                            <span className="text-sm">🎉</span>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          {member.type === 'family_member' ? 'Family Member' : 'Event'}
                        </p>
                        {member.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{member.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingMember(member)
                          setMemberFormData({
                            name: member.name,
                            type: member.type,
                            photo_url: member.photo_url || '',
                            description: member.description || ''
                          })
                        }}
                        title="Edit Member/Event"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:bg-red-50"
                        title="Delete Member/Event"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {managedMembers.length === 0 && !editingMember && (
            <div className="text-center py-6">
              <UserIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Members or Events Yet</h3>
              <p className="text-gray-600 dark:text-gray-300">Create your first member or event to easily track expenses.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
