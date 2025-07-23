import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  UserGroupIcon,
  CurrencyRupeeIcon,
  TrophyIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  BanknotesIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface Chit {
  id: string
  user_id: string
  chit_name: string
  organizer_name: string
  organizer_contact?: string
  total_members: number
  chit_value: number
  monthly_contribution: number
  total_months: number
  start_date: string
  member_number: number
  current_month: number
  status: 'active' | 'won' | 'completed' | 'discontinued'
  won_month?: number
  won_amount?: number
  auction_amount?: number
  total_paid: number
  remaining_amount: number
  notes?: string
  created_at: string
  updated_at: string
}

interface ChitPayment {
  id: string
  chit_id: string
  month_number: number
  payment_date: string
  amount_paid: number
  is_dividend: boolean
  dividend_amount: number
  net_payment: number
  notes?: string
  created_at: string
  updated_at: string
}

interface ChitFormData {
  chit_name: string
  organizer_name: string
  organizer_contact: string
  total_members: number
  chit_value: number
  monthly_contribution: number
  total_months: number
  start_date: string
  member_number: number
  notes: string
}

interface PaymentFormData {
  month_number: number
  payment_date: string
  amount_paid: number
  is_dividend: boolean
  dividend_amount: number
  notes: string
}

interface WinFormData {
  won_month: number
  won_amount: number
  auction_amount: number
  notes: string
}

export const ChitFund: React.FC = () => {
  const { user } = useAuth()
  const [chits, setChits] = useState<Chit[]>([])
  const [payments, setPayments] = useState<{ [chitId: string]: ChitPayment[] }>({})
  const [loading] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isPaymentFormOpen, setIsPaymentFormOpen] = useState(false)
  const [isWinFormOpen, setIsWinFormOpen] = useState(false)
  const [editingChit, setEditingChit] = useState<Chit | null>(null)
  const [selectedChit, setSelectedChit] = useState<Chit | null>(null)
  const [winningChit, setWinningChit] = useState<Chit | null>(null)
  const [viewDetailsChit, setViewDetailsChit] = useState<Chit | null>(null)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [editingPayment, setEditingPayment] = useState<ChitPayment | null>(null)

  const [formData, setFormData] = useState<ChitFormData>({
    chit_name: '',
    organizer_name: '',
    organizer_contact: '',
    total_members: 20,
    chit_value: 100000,
    monthly_contribution: 5000,
    total_months: 20,
    start_date: '',
    member_number: 1,
    notes: ''
  })

  // Auto-calculate monthly contribution when chit value or total months change
  useEffect(() => {
    if (formData.chit_value > 0 && formData.total_months > 0) {
      const calculatedContribution = Math.round(formData.chit_value / formData.total_months)
      setFormData(prev => ({
        ...prev,
        monthly_contribution: calculatedContribution
      }))
    }
  }, [formData.chit_value, formData.total_months])

  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    month_number: 1,
    payment_date: new Date().toISOString().split('T')[0],
    amount_paid: 0,
    is_dividend: false,
    dividend_amount: 0,
    notes: ''
  })

  // Auto-calculate dividend when amount paid changes
  useEffect(() => {
    if (selectedChit && paymentFormData.amount_paid > 0) {
      const expectedAmount = selectedChit.monthly_contribution
      const amountPaid = paymentFormData.amount_paid
      
      if (amountPaid < expectedAmount) {
        // User paid less than expected, so they received a dividend
        const dividend = expectedAmount - amountPaid
        setPaymentFormData(prev => ({
          ...prev,
          is_dividend: true,
          dividend_amount: dividend
        }))
      } else {
        // User paid the full amount or more, no dividend
        setPaymentFormData(prev => ({
          ...prev,
          is_dividend: false,
          dividend_amount: 0
        }))
      }
    }
  }, [paymentFormData.amount_paid, selectedChit])

  const [winFormData, setWinFormData] = useState<WinFormData>({
    won_month: 1,
    won_amount: 0,
    auction_amount: 0,
    notes: ''
  })

  const fetchChits = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('chits')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false })

      if (error) throw error
      setChits(data || [])
    } catch (error) {
      console.error('Error fetching chits:', error)
    }
  }, [user])

  const fetchPayments = useCallback(async (chitId: string) => {
    try {
      const { data, error } = await supabase
        .from('chit_payments')
        .select('*')
        .eq('chit_id', chitId)
        .order('month_number', { ascending: true })

      if (error) throw error
      setPayments(prev => ({ ...prev, [chitId]: data || [] }))
    } catch (error) {
      console.error('Error fetching payments:', error)
    }
  }, [])

  useEffect(() => {
    if (user) {
      fetchChits()
    }
  }, [user, fetchChits])

  useEffect(() => {
    // Fetch payments for all chits
    chits.forEach(chit => {
      if (!payments[chit.id]) {
        fetchPayments(chit.id)
      }
    })
  }, [chits, payments, fetchPayments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      if (editingChit) {
        // Update existing chit
        const { error } = await supabase
          .from('chits')
          .update({
            ...formData,
            remaining_amount: (formData.chit_value * formData.total_months) - (payments[editingChit.id]?.reduce((sum, p) => sum + p.net_payment, 0) || 0)
          })
          .eq('id', editingChit.id)

        if (error) throw error
      } else {
        // Add new chit
        const { error } = await supabase
          .from('chits')
          .insert([{
            ...formData,
            user_id: user.id,
            remaining_amount: formData.monthly_contribution * formData.total_months
          }])

        if (error) throw error
      }

      setIsFormOpen(false)
      setEditingChit(null)
      resetForm()
      fetchChits()
    } catch (error) {
      console.error('Error saving chit:', error)
    }
  }

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChit) return

    try {
      // Net payment is the amount actually paid by the user
      const netPayment = paymentFormData.amount_paid
      
      if (editingPayment) {
        // Update existing payment
        const { error } = await supabase
          .from('chit_payments')
          .update({
            month_number: paymentFormData.month_number,
            payment_date: paymentFormData.payment_date,
            amount_paid: paymentFormData.amount_paid,
            is_dividend: paymentFormData.is_dividend,
            dividend_amount: paymentFormData.dividend_amount,
            net_payment: netPayment,
            notes: paymentFormData.notes
          })
          .eq('id', editingPayment.id)

        if (error) throw error

        // Recalculate totals for the chit
        await recalculateChitTotals(selectedChit.id)
      } else {
        // Add new payment
        const { error } = await supabase
          .from('chit_payments')
          .insert([{
            chit_id: selectedChit.id,
            ...paymentFormData,
            net_payment: netPayment
          }])

        if (error) throw error

        // Update chit total_paid and remaining_amount
        const currentTotal = payments[selectedChit.id]?.reduce((sum, p) => sum + p.net_payment, 0) || 0
        const newTotal = currentTotal + netPayment
        const remaining = (selectedChit.monthly_contribution * selectedChit.total_months) - newTotal

        await supabase
          .from('chits')
          .update({
            total_paid: newTotal,
            remaining_amount: remaining,
            current_month: Math.max(selectedChit.current_month, paymentFormData.month_number)
          })
          .eq('id', selectedChit.id)
      }

      setIsPaymentFormOpen(false)
      setEditingPayment(null)
      resetPaymentForm()
      fetchChits()
      fetchPayments(selectedChit.id)
      
      // Reopen details modal if there was a chit being viewed
      if (viewDetailsChit) {
        setShowPaymentsModal(true)
      }
    } catch (error) {
      console.error('Error saving payment:', error)
    }
  }

  const recalculateChitTotals = async (chitId: string) => {
    try {
      // Fetch all payments for this chit
      const { data: chitPayments, error } = await supabase
        .from('chit_payments')
        .select('*')
        .eq('chit_id', chitId)

      if (error) throw error

      const chit = chits.find(c => c.id === chitId)
      if (!chit) return

      // Calculate new totals
      const totalPaid = chitPayments?.reduce((sum, p) => sum + p.net_payment, 0) || 0
      const remaining = (chit.monthly_contribution * chit.total_months) - totalPaid
      const currentMonth = Math.max(...(chitPayments?.map(p => p.month_number) || [0]), 1)

      // Update chit with new totals
      await supabase
        .from('chits')
        .update({
          total_paid: totalPaid,
          remaining_amount: remaining,
          current_month: currentMonth
        })
        .eq('id', chitId)
    } catch (error) {
      console.error('Error recalculating chit totals:', error)
    }
  }

  const handleDeletePayment = async (payment: ChitPayment) => {
    if (!confirm('Are you sure you want to delete this payment?')) return

    try {
      const { error } = await supabase
        .from('chit_payments')
        .delete()
        .eq('id', payment.id)

      if (error) throw error

      // Recalculate totals for the chit
      await recalculateChitTotals(payment.chit_id)
      
      fetchChits()
      fetchPayments(payment.chit_id)
    } catch (error) {
      console.error('Error deleting payment:', error)
    }
  }

  const handleWinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!winningChit) return

    try {
      const { error } = await supabase
        .from('chits')
        .update({
          status: 'won',
          won_month: winFormData.won_month,
          won_amount: winFormData.won_amount,
          auction_amount: winFormData.auction_amount || winFormData.won_amount,
          notes: winFormData.notes ? `${winningChit.notes || ''}\n\nWon Details: ${winFormData.notes}`.trim() : winningChit.notes
        })
        .eq('id', winningChit.id)

      if (error) throw error

      setIsWinFormOpen(false)
      setWinningChit(null)
      resetWinForm()
      fetchChits()
    } catch (error) {
      console.error('Error marking chit as won:', error)
    }
  }

  const handleDelete = async (chit: Chit) => {
    if (!confirm('Are you sure you want to delete this chit?')) return

    try {
      const { error } = await supabase
        .from('chits')
        .delete()
        .eq('id', chit.id)

      if (error) throw error
      fetchChits()
    } catch (error) {
      console.error('Error deleting chit:', error)
    }
  }

  const resetForm = () => {
    const defaultChitValue = 100000
    const defaultTotalMonths = 20
    const defaultMonthlyContribution = Math.round(defaultChitValue / defaultTotalMonths)
    
    setFormData({
      chit_name: '',
      organizer_name: '',
      organizer_contact: '',
      total_members: 20,
      chit_value: defaultChitValue,
      monthly_contribution: defaultMonthlyContribution,
      total_months: defaultTotalMonths,
      start_date: '',
      member_number: 1,
      notes: ''
    })
  }

  const resetPaymentForm = () => {
    setPaymentFormData({
      month_number: 1,
      payment_date: new Date().toISOString().split('T')[0],
      amount_paid: 0,
      is_dividend: false,
      dividend_amount: 0,
      notes: ''
    })
    setEditingPayment(null)
  }

  const resetWinForm = () => {
    setWinFormData({
      won_month: 1,
      won_amount: 0,
      auction_amount: 0,
      notes: ''
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatCurrencyCompact = (amount: number) => {
    if (amount >= 10000000) { // 1 crore
      return `₹${(amount / 10000000).toFixed(1).replace('.0', '')}Cr`
    } else if (amount >= 100000) { // 1 lakh
      return `₹${(amount / 100000).toFixed(1).replace('.0', '')}L`
    } else if (amount >= 1000) { // 1 thousand
      return `₹${(amount / 1000).toFixed(1).replace('.0', '')}K`
    } else {
      return `₹${amount}`
    }
  }

  const calculateProgress = (chit: Chit) => {
    return Math.min((chit.current_month / chit.total_months) * 100, 100)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-blue-600 bg-blue-100'
      case 'won': return 'text-green-600 bg-green-100'
      case 'completed': return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700'
      case 'discontinued': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700'
    }
  }

  const activeChits = chits.filter(c => c.status === 'active').length
  const wonChits = chits.filter(c => c.status === 'won').length
  const totalInvested = chits.reduce((sum, c) => sum + c.total_paid, 0)
  const totalValue = chits.reduce((sum, c) => sum + c.chit_value, 0)
  const totalWonAmount = chits.reduce((sum, c) => sum + (c.won_amount || 0), 0)
  
  // Calculate total dividends received across all chits
  const totalDividends = Object.values(payments).flat().reduce((sum, payment) => {
    return sum + (payment.is_dividend ? payment.dividend_amount : 0)
  }, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Chit Fund Tracker</h2>
          <p className="text-gray-600 dark:text-gray-300">Manage your chitfund investments and track payments</p>
        </div>
        <Button
          onClick={() => {
            setEditingChit(null)
            resetForm()
            setIsFormOpen(true)
          }}
          className="flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Chit
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Active Chits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeChits}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrophyIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Won Chits</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{wonChits}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CurrencyRupeeIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Invested</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrencyCompact(totalInvested)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <CurrencyRupeeIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Dividend</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrencyCompact(totalDividends)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrophyIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Amount Won</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrencyCompact(totalWonAmount)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BanknotesIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">Total Value</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrencyCompact(totalValue)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Chits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {chits.map((chit) => (
          <motion.div
            key={chit.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{chit.chit_name}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{chit.organizer_name}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(chit.status)}`}>
                  {chit.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Chit Value:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(chit.chit_value)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Monthly:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(chit.monthly_contribution)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Member #:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{chit.member_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Progress:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{chit.current_month}/{chit.total_months}</span>
                </div>
                {chit.status === 'won' && chit.won_amount && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Won in Month:</span>
                      <span className="font-semibold text-green-600">{chit.won_month}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-300">Amount Won:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(chit.won_amount)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(calculateProgress(chit))}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress(chit)}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Paid:</span>
                  <span className="text-green-600 font-semibold">{formatCurrency(chit.total_paid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Remaining:</span>
                  <span className="text-orange-600 font-semibold">{formatCurrency(chit.remaining_amount)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setViewDetailsChit(chit)
                    setShowPaymentsModal(true)
                  }}
                  className="flex-1"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Details
                </Button>
                {chit.status === 'active' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedChit(chit)
                        setEditingPayment(null)
                        setPaymentFormData({
                          ...paymentFormData,
                          month_number: chit.current_month + 1,
                          amount_paid: chit.monthly_contribution
                        })
                        setIsPaymentFormOpen(true)
                      }}
                      className="flex-1"
                    >
                      <PlusIcon className="h-4 w-4 mr-1" />
                      Payment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWinningChit(chit)
                        setWinFormData({
                          won_month: chit.current_month,
                          won_amount: chit.chit_value,
                          auction_amount: chit.chit_value,
                          notes: ''
                        })
                        setIsWinFormOpen(true)
                      }}
                      className="text-green-600 hover:text-green-700"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingChit(chit)
                    setFormData({
                      chit_name: chit.chit_name,
                      organizer_name: chit.organizer_name,
                      organizer_contact: chit.organizer_contact || '',
                      total_members: chit.total_members,
                      chit_value: chit.chit_value,
                      monthly_contribution: chit.monthly_contribution,
                      total_months: chit.total_months,
                      start_date: chit.start_date,
                      member_number: chit.member_number,
                      notes: chit.notes || ''
                    })
                    setIsFormOpen(true)
                  }}
                >
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(chit)}
                  className="text-red-600 hover:text-red-700"
                >
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {chits.length === 0 && (
        <div className="text-center py-12">
          <UserGroupIcon className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No chits yet</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Start tracking your chitfund investments</p>
          <Button onClick={() => setIsFormOpen(true)}>
            Add Your First Chit
          </Button>
        </div>
      )}

      {/* Add/Edit Chit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditingChit(null)
          resetForm()
        }}
        title={editingChit ? 'Edit Chit' : 'Add New Chit'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Chit Name"
              type="text"
              value={formData.chit_name}
              onChange={(e) => setFormData({ ...formData, chit_name: e.target.value })}
              required
            />
            <Input
              label="Organizer Name"
              type="text"
              value={formData.organizer_name}
              onChange={(e) => setFormData({ ...formData, organizer_name: e.target.value })}
              required
            />
            <Input
              label="Organizer Contact"
              type="text"
              value={formData.organizer_contact}
              onChange={(e) => setFormData({ ...formData, organizer_contact: e.target.value })}
            />
            <Input
              label="Total Members"
              type="number"
              value={formData.total_members}
              onChange={(e) => setFormData({ ...formData, total_members: parseInt(e.target.value) })}
              required
            />
            <Input
              label="Chit Value (₹)"
              type="number"
              value={formData.chit_value}
              onChange={(e) => setFormData({ ...formData, chit_value: parseFloat(e.target.value) })}
              required
            />
            <Input
              label="Monthly Contribution (₹)"
              type="number"
              value={formData.monthly_contribution}
              onChange={(e) => setFormData({ ...formData, monthly_contribution: parseFloat(e.target.value) })}
              required
            />
            <Input
              label="Total Months"
              type="number"
              value={formData.total_months}
              onChange={(e) => setFormData({ ...formData, total_months: parseInt(e.target.value) })}
              required
            />
            <Input
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              required
            />
            <Input
              label="Your Member Number"
              type="number"
              value={formData.member_number}
              onChange={(e) => setFormData({ ...formData, member_number: parseInt(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Additional notes about this chit..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingChit ? 'Update Chit' : 'Add Chit'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFormOpen(false)
                setEditingChit(null)
                resetForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Payment Modal */}
      <Modal
        isOpen={isPaymentFormOpen}
        onClose={() => {
          setIsPaymentFormOpen(false)
          setSelectedChit(null)
          setEditingPayment(null)
          resetPaymentForm()
          // Reopen details modal if there was a chit being viewed
          if (viewDetailsChit) {
            setShowPaymentsModal(true)
          }
        }}
        title={`${editingPayment ? 'Edit' : 'Add'} Payment - ${selectedChit?.chit_name}`}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Month Number"
              type="number"
              value={paymentFormData.month_number}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, month_number: parseInt(e.target.value) })}
              required
            />
            <Input
              label="Payment Date"
              type="date"
              value={paymentFormData.payment_date}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_date: e.target.value })}
              required
            />
            <Input
              label="Amount Paid (₹)"
              type="number"
              value={paymentFormData.amount_paid}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, amount_paid: parseFloat(e.target.value) })}
              required
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_dividend"
                checked={paymentFormData.is_dividend}
                onChange={(e) => {
                  if (!e.target.checked) {
                    // If unchecking, reset dividend amount
                    setPaymentFormData({ 
                      ...paymentFormData, 
                      is_dividend: false,
                      dividend_amount: 0 
                    })
                  } else {
                    setPaymentFormData({ ...paymentFormData, is_dividend: e.target.checked })
                  }
                }}
                className="h-4 w-4 text-indigo-600 rounded border-gray-300"
              />
              <label htmlFor="is_dividend" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Received Dividend {paymentFormData.is_dividend && paymentFormData.amount_paid > 0 && selectedChit && paymentFormData.amount_paid < selectedChit.monthly_contribution && (
                  <span className="text-green-600 font-normal">(Auto-calculated)</span>
                )}
              </label>
            </div>
            {paymentFormData.is_dividend && (
              <Input
                label="Dividend Amount (₹)"
                type="number"
                value={paymentFormData.dividend_amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, dividend_amount: parseFloat(e.target.value) })}
                readOnly={!!(selectedChit && paymentFormData.amount_paid > 0 && paymentFormData.amount_paid < selectedChit.monthly_contribution)}
                className={selectedChit && paymentFormData.amount_paid > 0 && paymentFormData.amount_paid < selectedChit.monthly_contribution ? 'bg-green-50' : ''}
              />
            )}
          </div>
          {selectedChit && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Monthly Contribution:</strong> {formatCurrency(selectedChit.monthly_contribution)}
                <br />
                <span className="text-blue-600">
                  💡 If you pay less than the monthly contribution, the difference is your dividend (amount saved from auction).
                </span>
              </p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={paymentFormData.notes}
              onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Payment notes..."
            />
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Monthly Contribution:</span>
                <span>{selectedChit ? formatCurrency(selectedChit.monthly_contribution) : '₹0'}</span>
              </div>
              <div className="flex justify-between">
                <span>Amount You Paid:</span>
                <span>{formatCurrency(paymentFormData.amount_paid)}</span>
              </div>
              {paymentFormData.is_dividend && (
                <div className="flex justify-between">
                  <span>Dividend (You Saved):</span>
                  <span className="text-green-600">{formatCurrency(paymentFormData.dividend_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                <span>Net Payment (What You Paid):</span>
                <span>{formatCurrency(paymentFormData.amount_paid)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1">
              {editingPayment ? 'Update Payment' : 'Add Payment'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsPaymentFormOpen(false)
                setSelectedChit(null)
                setEditingPayment(null)
                resetPaymentForm()
                // Reopen details modal if there was a chit being viewed
                if (viewDetailsChit) {
                  setShowPaymentsModal(true)
                }
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Chit Details Modal */}
      <Modal
        isOpen={showPaymentsModal}
        onClose={() => {
          setShowPaymentsModal(false)
          setViewDetailsChit(null)
        }}
        title={`${viewDetailsChit?.chit_name} - Details`}
        size="lg"
      >
        {viewDetailsChit && (
          <div className="space-y-6">
            {/* Chit Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Chit Information</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Organizer:</span>
                    <span className="text-gray-900 dark:text-white">{viewDetailsChit.organizer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Total Members:</span>
                    <span className="text-gray-900 dark:text-white">{viewDetailsChit.total_members}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Chit Value:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(viewDetailsChit.chit_value)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Monthly Contribution:</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(viewDetailsChit.monthly_contribution)}</span>
                  </div>
                  {viewDetailsChit.status === 'won' && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Won in Month:</span>
                        <span className="text-green-600 font-semibold">{viewDetailsChit.won_month}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-300">Amount Received:</span>
                        <span className="text-green-600 font-semibold">{formatCurrency(viewDetailsChit.won_amount || 0)}</span>
                      </div>
                      {viewDetailsChit.auction_amount && viewDetailsChit.auction_amount !== viewDetailsChit.won_amount && (
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-300">Auction Amount:</span>
                          <span className="text-blue-600 font-semibold">{formatCurrency(viewDetailsChit.auction_amount)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Progress</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Month:</span>
                    <span>{viewDetailsChit.current_month} of {viewDetailsChit.total_months}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Paid:</span>
                    <span className="text-green-600">{formatCurrency(viewDetailsChit.total_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="text-orange-600">{formatCurrency(viewDetailsChit.remaining_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(viewDetailsChit.status)}`}>
                      {viewDetailsChit.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment History */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-semibold text-gray-900">Payment History</h4>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedChit(viewDetailsChit)
                    setEditingPayment(null)
                    setPaymentFormData({
                      month_number: viewDetailsChit.current_month + 1,
                      payment_date: new Date().toISOString().split('T')[0],
                      amount_paid: viewDetailsChit.monthly_contribution,
                      is_dividend: false,
                      dividend_amount: 0,
                      notes: ''
                    })
                    setShowPaymentsModal(false) // Close details modal
                    setIsPaymentFormOpen(true)
                  }}
                  className="flex items-center gap-1"
                >
                  <PlusIcon className="h-3 w-3" />
                  Add Payment
                </Button>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {payments[viewDetailsChit.id]?.length > 0 ? (
                  <div className="space-y-2">
                    {payments[viewDetailsChit.id].map((payment) => (
                      <div key={payment.id} className="flex justify-between items-center p-3 bg-white border rounded-lg">
                        <div>
                          <div className="font-medium">Month {payment.month_number}</div>
                          <div className="text-sm text-gray-600">{new Date(payment.payment_date).toLocaleDateString()}</div>
                          {payment.notes && (
                            <div className="text-xs text-gray-500 mt-1">{payment.notes}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-semibold">{formatCurrency(payment.net_payment)}</div>
                            {payment.is_dividend && (
                              <div className="text-sm text-green-600">Dividend: {formatCurrency(payment.dividend_amount)}</div>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPayment(payment)
                                setSelectedChit(viewDetailsChit)
                                setPaymentFormData({
                                  month_number: payment.month_number,
                                  payment_date: payment.payment_date,
                                  amount_paid: payment.amount_paid,
                                  is_dividend: payment.is_dividend,
                                  dividend_amount: payment.dividend_amount,
                                  notes: payment.notes || ''
                                })
                                setShowPaymentsModal(false) // Close details modal
                                setIsPaymentFormOpen(true)
                              }}
                              className="p-1"
                            >
                              <PencilIcon className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePayment(payment)}
                              className="p-1 text-red-600 hover:text-red-700"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No payments recorded yet</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Mark as Won Modal */}
      <Modal
        isOpen={isWinFormOpen}
        onClose={() => {
          setIsWinFormOpen(false)
          setWinningChit(null)
          resetWinForm()
        }}
        title={`Mark as Won - ${winningChit?.chit_name}`}
      >
        <form onSubmit={handleWinSubmit} className="space-y-4">
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <TrophyIcon className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-semibold text-green-800">Congratulations! You won this chit!</h4>
            </div>
            <p className="text-green-700 text-sm">
              Please enter the details of your chit win. This will mark the chit as won and update its status.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Won in Month"
              type="number"
              value={winFormData.won_month}
              onChange={(e) => setWinFormData({ ...winFormData, won_month: parseInt(e.target.value) })}
              required
              min={1}
              max={winningChit?.total_months}
            />
            <Input
              label="Amount Received (₹)"
              type="number"
              value={winFormData.won_amount}
              onChange={(e) => setWinFormData({ ...winFormData, won_amount: parseFloat(e.target.value) })}
              required
              min={0}
              placeholder="Amount you actually received"
            />
            <Input
              label="Auction Amount (₹)"
              type="number"
              value={winFormData.auction_amount}
              onChange={(e) => setWinFormData({ ...winFormData, auction_amount: parseFloat(e.target.value) })}
              min={0}
              placeholder="Original auction bid (if different)"
            />
          </div>

          {winningChit && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Chit Value:</strong> {formatCurrency(winningChit.chit_value)}
                <br />
                <strong>Monthly Contribution:</strong> {formatCurrency(winningChit.monthly_contribution)}
                <br />
                <span className="text-blue-600">
                  💡 After winning, you'll continue paying monthly contributions but your payments help others in the group.
                </span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={winFormData.notes}
              onChange={(e) => setWinFormData({ ...winFormData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Any additional details about winning this chit..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700">
              <TrophyIcon className="h-4 w-4 mr-2" />
              Mark as Won
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsWinFormOpen(false)
                setWinningChit(null)
                resetWinForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
