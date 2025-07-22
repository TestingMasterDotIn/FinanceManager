import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BanknotesIcon,
  PlusIcon,
  UserIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  ClockIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface LentMoney {
  id: string
  user_id: string
  borrower_name: string
  borrower_contact?: string
  amount: number
  interest_rate: number
  lent_date: string
  expected_return_date?: string | null
  paid_date?: string
  is_paid: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface BorrowedMoney {
  id: string
  user_id: string
  lender_name: string
  lender_contact?: string
  amount: number
  interest_rate: number
  borrowed_date: string
  expected_return_date?: string | null
  paid_date?: string
  is_paid: boolean
  notes?: string
  created_at: string
  updated_at: string
}

interface InterestPayment {
  id: string
  loan_id: string
  loan_type: 'lent' | 'borrowed'
  payment_month: number
  payment_date: string
  amount_paid: number
  is_paid: boolean
  due_date: string
  created_at: string
  updated_at: string
}

export const LendingBorrowing: React.FC = () => {
  const { user } = useAuth()
  const [lentMoney, setLentMoney] = useState<LentMoney[]>([])
  const [borrowedMoney, setBorrowedMoney] = useState<BorrowedMoney[]>([])
  const [interestPayments, setInterestPayments] = useState<InterestPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<'lent' | 'borrowed'>('lent')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLoan, setEditingLoan] = useState<LentMoney | BorrowedMoney | null>(null)
  const [viewingLoan, setViewingLoan] = useState<LentMoney | BorrowedMoney | null>(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isInterestCalendarOpen, setIsInterestCalendarOpen] = useState(false)
  const [selectedLoanForInterest, setSelectedLoanForInterest] = useState<LentMoney | BorrowedMoney | null>(null)
  const [isBalanceUpdateOpen, setIsBalanceUpdateOpen] = useState(false)
  const [selectedLoanForBalance, setSelectedLoanForBalance] = useState<LentMoney | BorrowedMoney | null>(null)
  const [balanceUpdateAmount, setBalanceUpdateAmount] = useState('')
  
  const [formData, setFormData] = useState({
    person_name: '',
    person_contact: '',
    amount: '',
    interest_rate: '',
    date: '',
    expected_return_date: '',
    notes: ''
  })

  const isLentMoney = (loan: LentMoney | BorrowedMoney): loan is LentMoney => {
    return 'borrower_name' in loan
  }

  const resetForm = () => {
    setFormData({
      person_name: '',
      person_contact: '',
      amount: '',
      interest_rate: '',
      date: '',
      expected_return_date: '',
      notes: ''
    })
  }

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

  const fetchInterestPayments = useCallback(async () => {
    if (!user) return
    
    try {
      const { data, error } = await supabase
        .from('interest_payments')
        .select('*')
        .order('due_date', { ascending: false })

      if (error) throw error
      setInterestPayments(data || [])
    } catch (error) {
      console.error('Error fetching interest payments:', error)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      Promise.all([fetchLentMoney(), fetchBorrowedMoney(), fetchInterestPayments()]).finally(() => {
        setLoading(false)
      })
    }
  }, [user, fetchLentMoney, fetchBorrowedMoney, fetchInterestPayments])

  // Generate monthly interest payment schedule for a loan
  const generateInterestSchedule = async (loan: LentMoney | BorrowedMoney) => {
    if (loan.is_paid || loan.interest_rate <= 0) return

    const loanType = isLentMoney(loan) ? 'lent' : 'borrowed'
    const startDate = new Date(isLentMoney(loan) ? loan.lent_date : loan.borrowed_date)
    const currentDate = new Date()
    
    // Calculate how many months have passed
    const monthsElapsed = Math.floor(
      (currentDate.getFullYear() - startDate.getFullYear()) * 12 +
      (currentDate.getMonth() - startDate.getMonth()) +
      (currentDate.getDate() >= startDate.getDate() ? 1 : 0)
    )

    // Monthly interest amount
    const monthlyInterest = (loan.amount * loan.interest_rate) / (12 * 100)

    // Generate payment records for each month
    const paymentPromises = []
    for (let month = 1; month <= monthsElapsed; month++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + month)
      
      // Check if this payment already exists
      const existingPayment = interestPayments.find(
        p => p.loan_id === loan.id && p.loan_type === loanType && p.payment_month === month
      )

      if (!existingPayment) {
        paymentPromises.push(
          supabase.from('interest_payments').insert({
            loan_id: loan.id,
            loan_type: loanType,
            payment_month: month,
            amount_paid: monthlyInterest,
            due_date: dueDate.toISOString().split('T')[0],
            is_paid: false
          })
        )
      }
    }

    if (paymentPromises.length > 0) {
      await Promise.all(paymentPromises)
      await fetchInterestPayments()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    try {
      if (activeSection === 'lent') {
        const loanData = {
          user_id: user.id,
          borrower_name: formData.person_name,
          borrower_contact: formData.person_contact,
          amount: parseFloat(formData.amount),
          interest_rate: parseFloat(formData.interest_rate),
          lent_date: formData.date,
          expected_return_date: formData.expected_return_date || null,
          notes: formData.notes,
          is_paid: false
        }

        if (editingLoan && 'borrower_name' in editingLoan) {
          // Update existing lent money
          const { error } = await supabase
            .from('lent_money')
            .update(loanData)
            .eq('id', editingLoan.id)

          if (error) throw error
          
          setLentMoney(prev => prev.map(loan => 
            loan.id === editingLoan.id ? { ...loan, ...loanData } : loan
          ))
        } else {
          // Create new lent money
          const { data, error } = await supabase
            .from('lent_money')
            .insert([loanData])
            .select()
            .single()

          if (error) throw error
          setLentMoney(prev => [data, ...prev])
          
          // Generate interest schedule for new loan
          if (data.interest_rate > 0) {
            await generateInterestSchedule(data)
          }
        }
      } else {
        const loanData = {
          user_id: user.id,
          lender_name: formData.person_name,
          lender_contact: formData.person_contact,
          amount: parseFloat(formData.amount),
          outstanding_balance: parseFloat(formData.outstanding_balance || formData.amount),
          interest_rate: parseFloat(formData.interest_rate),
          borrowed_date: formData.date,
          expected_return_date: formData.expected_return_date || null,
          notes: formData.notes,
          is_paid: false
        }

        if (editingLoan && 'lender_name' in editingLoan) {
          // Update existing borrowed money
          const { error } = await supabase
            .from('borrowed_money')
            .update(loanData)
            .eq('id', editingLoan.id)

          if (error) throw error
          
          setBorrowedMoney(prev => prev.map(loan => 
            loan.id === editingLoan.id ? { ...loan, ...loanData } : loan
          ))
        } else {
          // Create new borrowed money
          const { data, error } = await supabase
            .from('borrowed_money')
            .insert([loanData])
            .select()
            .single()

          if (error) throw error
          setBorrowedMoney(prev => [data, ...prev])
          
          // Generate interest schedule for new loan
          if (data.interest_rate > 0) {
            await generateInterestSchedule(data)
          }
        }
      }

      setIsFormOpen(false)
      setEditingLoan(null)
      resetForm()
    } catch (error) {
      console.error('Error saving record:', error)
      alert('Failed to save. Please try again.')
    }
  }

  const handleEdit = (loan: LentMoney | BorrowedMoney) => {
    setEditingLoan(loan)
    
    if ('borrower_name' in loan) {
      // It's a lent money record
      setFormData({
        person_name: loan.borrower_name,
        person_contact: loan.borrower_contact || '',
        amount: loan.amount.toString(),
        outstanding_balance: loan.outstanding_balance.toString(),
        interest_rate: loan.interest_rate.toString(),
        date: loan.lent_date,
        expected_return_date: loan.expected_return_date || '',
        notes: loan.notes || ''
      })
    } else {
      // It's a borrowed money record
      setFormData({
        person_name: loan.lender_name,
        person_contact: loan.lender_contact || '',
        amount: loan.amount.toString(),
        outstanding_balance: loan.outstanding_balance.toString(),
        interest_rate: loan.interest_rate.toString(),
        date: loan.borrowed_date,
        expected_return_date: loan.expected_return_date || '',
        notes: loan.notes || ''
      })
    }
    setIsFormOpen(true)
  }

  const handleDelete = async (loan: LentMoney | BorrowedMoney) => {
    if (!confirm('Are you sure you want to delete this record? This will also delete all associated interest payment records.')) return

    try {
      const tableName = 'borrower_name' in loan ? 'lent_money' : 'borrowed_money'
      const loanType = 'borrower_name' in loan ? 'lent' : 'borrowed'
      
      // First delete related interest payments
      await supabase
        .from('interest_payments')
        .delete()
        .eq('loan_id', loan.id)
        .eq('loan_type', loanType)

      // Then delete the loan
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', loan.id)

      if (error) throw error
      
      if ('borrower_name' in loan) {
        setLentMoney(prev => prev.filter(l => l.id !== loan.id))
      } else {
        setBorrowedMoney(prev => prev.filter(l => l.id !== loan.id))
      }
      
      await fetchInterestPayments()
    } catch (error) {
      console.error('Error deleting record:', error)
      alert('Failed to delete. Please try again.')
    }
  }

  const handleMarkPaid = async (loan: LentMoney | BorrowedMoney) => {
    try {
      const tableName = 'borrower_name' in loan ? 'lent_money' : 'borrowed_money'
      const { error } = await supabase
        .from(tableName)
        .update({
          is_paid: !loan.is_paid,
          paid_date: !loan.is_paid ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', loan.id)

      if (error) throw error
      
      if ('borrower_name' in loan) {
        setLentMoney(prev => prev.map(l => 
          l.id === loan.id 
            ? { ...l, is_paid: !l.is_paid, paid_date: !l.is_paid ? new Date().toISOString().split('T')[0] : undefined }
            : l
        ))
      } else {
        setBorrowedMoney(prev => prev.map(l => 
          l.id === loan.id 
            ? { ...l, is_paid: !l.is_paid, paid_date: !l.is_paid ? new Date().toISOString().split('T')[0] : undefined }
            : l
        ))
      }
    } catch (error) {
      console.error('Error updating payment status:', error)
      alert('Failed to update payment status. Please try again.')
    }
  }

  const markInterestPayment = async (paymentId: string, isPaid: boolean) => {
    try {
      const { error } = await supabase
        .from('interest_payments')
        .update({
          is_paid: isPaid,
          payment_date: isPaid ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', paymentId)

      if (error) throw error
      
      setInterestPayments(prev => prev.map(payment =>
        payment.id === paymentId
          ? { ...payment, is_paid: isPaid, payment_date: isPaid ? new Date().toISOString().split('T')[0] : '' }
          : payment
      ))
    } catch (error) {
      console.error('Error updating interest payment:', error)
      alert('Failed to update interest payment. Please try again.')
    }
  }

  const handleBalanceUpdate = async () => {
    if (!selectedLoanForBalance || !balanceUpdateAmount) return

    try {
      const newBalance = parseFloat(balanceUpdateAmount)
      const tableName = 'borrower_name' in selectedLoanForBalance ? 'lent_money' : 'borrowed_money'
      
      const { error } = await supabase
        .from(tableName)
        .update({
          outstanding_balance: newBalance,
          is_paid: newBalance === 0,
          paid_date: newBalance === 0 ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', selectedLoanForBalance.id)

      if (error) throw error
      
      // Update local state
      if ('borrower_name' in selectedLoanForBalance) {
        setLentMoney(prev => prev.map(loan => 
          loan.id === selectedLoanForBalance.id 
            ? { ...loan, outstanding_balance: newBalance, is_paid: newBalance === 0, paid_date: newBalance === 0 ? new Date().toISOString().split('T')[0] : loan.paid_date }
            : loan
        ))
      } else {
        setBorrowedMoney(prev => prev.map(loan => 
          loan.id === selectedLoanForBalance.id 
            ? { ...loan, outstanding_balance: newBalance, is_paid: newBalance === 0, paid_date: newBalance === 0 ? new Date().toISOString().split('T')[0] : loan.paid_date }
            : loan
        ))
      }
      
      setIsBalanceUpdateOpen(false)
      setSelectedLoanForBalance(null)
      setBalanceUpdateAmount('')
    } catch (error) {
      console.error('Error updating outstanding balance:', error)
      alert('Failed to update outstanding balance. Please try again.')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getLoanInterestPayments = (loanId: string, loanType: 'lent' | 'borrowed') => {
    return interestPayments.filter(p => p.loan_id === loanId && p.loan_type === loanType)
  }

  const calculateTotalInterestEarned = (loanId: string, loanType: 'lent' | 'borrowed') => {
    const payments = getLoanInterestPayments(loanId, loanType)
    return payments.filter(p => p.is_paid).reduce((sum, p) => sum + p.amount_paid, 0)
  }

  const calculatePendingInterest = (loanId: string, loanType: 'lent' | 'borrowed') => {
    const payments = getLoanInterestPayments(loanId, loanType)
    return payments.filter(p => !p.is_paid && new Date(p.due_date) <= new Date()).reduce((sum, p) => sum + p.amount_paid, 0)
  }

  const getOverduePayments = (loanId: string, loanType: 'lent' | 'borrowed') => {
    const payments = getLoanInterestPayments(loanId, loanType)
    const currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)
    
    return payments.filter(p => !p.is_paid && new Date(p.due_date) < currentDate)
  }

  const getTotalStats = () => {
    const totalLent = lentMoney.reduce((sum, loan) => sum + loan.amount, 0)
    const totalLentPaid = lentMoney.filter(loan => loan.is_paid).reduce((sum, loan) => sum + loan.amount, 0)
    const totalLentPending = lentMoney.filter(loan => !loan.is_paid).reduce((sum, loan) => sum + loan.outstanding_balance, 0)
    const totalLentInterestEarned = lentMoney.reduce((sum, loan) => sum + calculateTotalInterestEarned(loan.id, 'lent'), 0)
    
    const totalBorrowed = borrowedMoney.reduce((sum, loan) => sum + loan.amount, 0)
    const totalBorrowedPaid = borrowedMoney.filter(loan => loan.is_paid).reduce((sum, loan) => sum + loan.amount, 0)
    const totalBorrowedPending = borrowedMoney.filter(loan => !loan.is_paid).reduce((sum, loan) => sum + loan.outstanding_balance, 0)
    const totalBorrowedInterestPaid = borrowedMoney.reduce((sum, loan) => sum + calculateTotalInterestEarned(loan.id, 'borrowed'), 0)
    
    return { 
      totalLent, totalLentPaid, totalLentPending, totalLentInterestEarned,
      totalBorrowed, totalBorrowedPaid, totalBorrowedPending, totalBorrowedInterestPaid
    }
  }

  const stats = getTotalStats()
  const currentData = activeSection === 'lent' ? lentMoney : borrowedMoney

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
      {/* Section Toggle */}
      <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <Button
          variant={activeSection === 'lent' ? 'primary' : 'ghost'}
          onClick={() => setActiveSection('lent')}
          className="flex items-center space-x-2 flex-1 justify-center"
        >
          <ArrowUpIcon className="h-4 w-4 text-green-600" />
          <span>Money Lent</span>
        </Button>
        <Button
          variant={activeSection === 'borrowed' ? 'primary' : 'ghost'}
          onClick={() => setActiveSection('borrowed')}
          className="flex items-center space-x-2 flex-1 justify-center"
        >
          <ArrowDownIcon className="h-4 w-4 text-red-600" />
          <span>Money Borrowed</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {activeSection === 'lent' ? (
          <>
            <Card className="p-4">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Lent</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalLent)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Repaid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalLentPaid)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalLentPending)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <CurrencyRupeeIcon className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Interest Earned</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalLentInterestEarned)}</p>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card className="p-4">
              <div className="flex items-center">
                <BanknotesIcon className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Borrowed</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalBorrowed)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Repaid</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalBorrowedPaid)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(stats.totalBorrowedPending)}</p>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center">
                <CurrencyRupeeIcon className="h-8 w-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Interest Paid</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalBorrowedInterestPaid)}</p>
                </div>
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {activeSection === 'lent' ? 'Money Lending Records' : 'Money Borrowing Records'}
          </h3>
          <p className="text-gray-600">
            {activeSection === 'lent' 
              ? 'Track money you\'ve lent to others with monthly interest tracking' 
              : 'Track money you\'ve borrowed from others with monthly interest tracking'
            }
          </p>
        </div>
        <Button 
          onClick={() => {
            resetForm()
            setEditingLoan(null)
            setIsFormOpen(true)
          }}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="h-4 w-4" />
          <span>Add {activeSection === 'lent' ? 'Lending' : 'Borrowing'} Record</span>
        </Button>
      </div>

      {/* Records List */}
      {currentData.length === 0 ? (
        <Card className="p-8">
          <div className="text-center">
            <BanknotesIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {activeSection === 'lent' ? 'lending' : 'borrowing'} records yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start by adding your first {activeSection === 'lent' ? 'money lending' : 'money borrowing'} record
            </p>
            <Button onClick={() => setIsFormOpen(true)}>Add First Record</Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {currentData.map((loan) => {
            const personName = 'borrower_name' in loan ? loan.borrower_name : loan.lender_name
            const date = 'lent_date' in loan ? loan.lent_date : loan.borrowed_date
            const loanType = activeSection
            const totalEarned = calculateTotalInterestEarned(loan.id, loanType)
            const pendingInterest = calculatePendingInterest(loan.id, loanType)
            const overduePayments = getOverduePayments(loan.id, loanType)
            
            return (
              <motion.div
                key={loan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className={`p-4 ${loan.is_paid ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                            <UserIcon className="h-5 w-5 mr-2 text-gray-500" />
                            {personName}
                            {overduePayments.length > 0 && (
                              <ExclamationTriangleIcon className="h-5 w-5 ml-2 text-red-500" />
                            )}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-2 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Amount:</span> {formatCurrency(loan.amount)}
                            </div>
                            <div>
                              <span className="font-medium">Outstanding:</span> {formatCurrency(loan.outstanding_balance)}
                            </div>
                            <div>
                              <span className="font-medium">Interest:</span> {loan.interest_rate}% p.a.
                            </div>
                            <div>
                              <span className="font-medium">{activeSection === 'lent' ? 'Lent' : 'Borrowed'} Date:</span> {new Date(date).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Expected Return:</span> {loan.expected_return_date ? new Date(loan.expected_return_date).toLocaleDateString() : 'Not specified'}
                            </div>
                          </div>
                          <div className="mt-2 space-y-1 text-sm">
                            <div className="flex items-center justify-between">
                              <span className={`font-medium ${activeSection === 'lent' ? 'text-green-600' : 'text-red-600'}`}>
                                {activeSection === 'lent' ? 'Interest Earned' : 'Interest Paid'}: {formatCurrency(totalEarned)}
                              </span>
                              {pendingInterest > 0 && (
                                <span className="font-medium text-red-600">
                                  Pending: {formatCurrency(pendingInterest)}
                                </span>
                              )}
                            </div>
                            {overduePayments.length > 0 && (
                              <div className="text-red-600 font-medium">
                                {overduePayments.length} overdue payment{overduePayments.length > 1 ? 's' : ''}
                              </div>
                            )}
                            {loan.is_paid && loan.paid_date && (
                              <span className="text-green-600 font-medium">
                                Paid on: {new Date(loan.paid_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            loan.is_paid 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {loan.is_paid ? 'Paid' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLoanForBalance(loan)
                          setBalanceUpdateAmount(loan.outstanding_balance.toString())
                          setIsBalanceUpdateOpen(true)
                        }}
                      >
                        <CurrencyDollarIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLoanForInterest(loan)
                          setIsInterestCalendarOpen(true)
                        }}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingLoan(loan)
                          setIsViewModalOpen(true)
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(loan)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant={loan.is_paid ? "outline" : "primary"}
                        size="sm"
                        onClick={() => handleMarkPaid(loan)}
                        className={loan.is_paid ? "text-orange-600" : "bg-green-600 hover:bg-green-700"}
                      >
                        {loan.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(loan)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => {
          setIsFormOpen(false)
          setEditingLoan(null)
          resetForm()
        }}
        title={editingLoan 
          ? `Edit ${activeSection === 'lent' ? 'Lending' : 'Borrowing'} Record` 
          : `Add New ${activeSection === 'lent' ? 'Lending' : 'Borrowing'} Record`
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {activeSection === 'lent' ? 'Borrower Name' : 'Lender Name'} *
              </label>
              <Input
                type="text"
                value={formData.person_name}
                onChange={(e) => setFormData({...formData, person_name: e.target.value})}
                placeholder={`Enter ${activeSection === 'lent' ? 'borrower\'s' : 'lender\'s'} name`}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact (Optional)
              </label>
              <Input
                type="text"
                value={formData.person_contact}
                onChange={(e) => setFormData({...formData, person_contact: e.target.value})}
                placeholder="Phone or email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount *
              </label>
              <Input
                type="number"
                step={0.01}
                value={formData.amount}
                onChange={(e) => {
                  setFormData({...formData, amount: e.target.value})
                  // Auto-set outstanding balance to amount if not editing
                  if (!editingLoan && !formData.outstanding_balance) {
                    setFormData(prev => ({...prev, amount: e.target.value, outstanding_balance: e.target.value}))
                  }
                }}
                placeholder="Enter amount"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outstanding Balance *
              </label>
              <Input
                type="number"
                step={0.01}
                value={formData.outstanding_balance}
                onChange={(e) => setFormData({...formData, outstanding_balance: e.target.value})}
                placeholder="Current outstanding balance"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interest Rate (% per annum)
              </label>
              <Input
                type="number"
                step={0.01}
                value={formData.interest_rate}
                onChange={(e) => setFormData({...formData, interest_rate: e.target.value})}
                placeholder="e.g. 12.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {activeSection === 'lent' ? 'Lent Date' : 'Borrowed Date'} *
              </label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Return Date (Optional)
              </label>
              <Input
                type="date"
                value={formData.expected_return_date}
                onChange={(e) => setFormData({...formData, expected_return_date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsFormOpen(false)
                setEditingLoan(null)
                resetForm()
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {editingLoan ? 'Update Record' : 'Add Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setViewingLoan(null)
        }}
        title={`${activeSection === 'lent' ? 'Lending' : 'Borrowing'} Details`}
      >
        {viewingLoan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {activeSection === 'lent' ? 'Borrower' : 'Lender'}
                </h4>
                <p className="text-gray-600">
                  {'borrower_name' in viewingLoan ? viewingLoan.borrower_name : viewingLoan.lender_name}
                </p>
                {(('borrower_contact' in viewingLoan && viewingLoan.borrower_contact) || 
                  ('lender_contact' in viewingLoan && viewingLoan.lender_contact)) && (
                  <p className="text-sm text-gray-500">
                    {'borrower_contact' in viewingLoan ? viewingLoan.borrower_contact : 
                     'lender_contact' in viewingLoan ? viewingLoan.lender_contact : ''}
                  </p>
                )}
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Original Amount</h4>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(viewingLoan.amount)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Outstanding Balance</h4>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(viewingLoan.outstanding_balance)}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Interest Rate</h4>
                <p className="text-gray-600">{viewingLoan.interest_rate}% per annum</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {activeSection === 'lent' ? 'Interest Earned' : 'Interest Paid'}
                </h4>
                <p className={`text-lg font-semibold ${activeSection === 'lent' ? 'text-purple-600' : 'text-red-600'}`}>
                  {formatCurrency(calculateTotalInterestEarned(viewingLoan.id, activeSection))}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">
                  {activeSection === 'lent' ? 'Lent Date' : 'Borrowed Date'}
                </h4>
                <p className="text-gray-600">
                  {new Date('lent_date' in viewingLoan ? viewingLoan.lent_date : viewingLoan.borrowed_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Expected Return</h4>
                <p className="text-gray-600">
                  {viewingLoan.expected_return_date ? new Date(viewingLoan.expected_return_date).toLocaleDateString() : 'Not specified'}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900">Status</h4>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                viewingLoan.is_paid 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-orange-100 text-orange-800'
              }`}>
                {viewingLoan.is_paid ? 'Paid' : 'Pending'}
              </span>
              {viewingLoan.is_paid && viewingLoan.paid_date && (
                <p className="text-sm text-gray-600 mt-1">
                  Paid on: {new Date(viewingLoan.paid_date).toLocaleDateString()}
                </p>
              )}
            </div>

            {viewingLoan.notes && (
              <div>
                <h4 className="font-semibold text-gray-900">Notes</h4>
                <p className="text-gray-600">{viewingLoan.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Interest Payment Calendar Modal */}
      <Modal
        isOpen={isInterestCalendarOpen}
        onClose={() => {
          setIsInterestCalendarOpen(false)
          setSelectedLoanForInterest(null)
        }}
        title="Interest Payment Tracker"
        size="lg"
      >
        {selectedLoanForInterest && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900">
                {activeSection === 'lent' ? 'Money Lent to' : 'Money Borrowed from'}: {' '}
                {'borrower_name' in selectedLoanForInterest 
                  ? selectedLoanForInterest.borrower_name 
                  : selectedLoanForInterest.lender_name
                }
              </h4>
              <p className="text-blue-700">
                Amount: {formatCurrency(selectedLoanForInterest.amount)} | 
                Outstanding: {formatCurrency(selectedLoanForInterest.outstanding_balance)} | 
                Interest: {selectedLoanForInterest.interest_rate}% p.a. | 
                Monthly: {formatCurrency((selectedLoanForInterest.outstanding_balance * selectedLoanForInterest.interest_rate) / (12 * 100))}
              </p>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {getLoanInterestPayments(selectedLoanForInterest.id, activeSection).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No interest payment schedule generated yet.</p>
                  <Button
                    onClick={() => generateInterestSchedule(selectedLoanForInterest)}
                    className="flex items-center space-x-2"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    <span>Generate Payment Schedule</span>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {getLoanInterestPayments(selectedLoanForInterest.id, activeSection)
                    .sort((a, b) => a.payment_month - b.payment_month)
                    .map((payment) => {
                      const dueDate = new Date(payment.due_date)
                      const isOverdue = !payment.is_paid && dueDate < new Date()
                      
                      return (
                        <div
                          key={payment.id}
                          className={`p-3 rounded-lg border-2 ${
                            payment.is_paid 
                              ? 'bg-green-50 border-green-200' 
                              : isOverdue
                              ? 'bg-red-50 border-red-200'
                              : 'bg-yellow-50 border-yellow-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="font-semibold">
                                Month {payment.payment_month}
                              </h5>
                              <p className="text-sm text-gray-600">
                                Due: {dueDate.toLocaleDateString()} | 
                                Amount: {formatCurrency(payment.amount_paid)}
                              </p>
                              {payment.is_paid && (
                                <p className="text-sm text-green-600">
                                  Paid on: {new Date(payment.payment_date).toLocaleDateString()}
                                </p>
                              )}
                              {isOverdue && (
                                <p className="text-sm text-red-600 font-medium">
                                  Overdue by {Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))} days
                                </p>
                              )}
                            </div>
                            <Button
                              variant={payment.is_paid ? "outline" : "primary"}
                              size="sm"
                              onClick={() => markInterestPayment(payment.id, !payment.is_paid)}
                              className={payment.is_paid ? "text-orange-600" : "bg-green-600 hover:bg-green-700"}
                            >
                              {payment.is_paid ? 'Mark Unpaid' : 'Mark Paid'}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">
                    {activeSection === 'lent' ? 'Total Earned' : 'Total Paid'}
                  </p>
                  <p className={`text-lg font-semibold ${activeSection === 'lent' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(calculateTotalInterestEarned(selectedLoanForInterest.id, activeSection))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-lg font-semibold text-orange-600">
                    {formatCurrency(calculatePendingInterest(selectedLoanForInterest.id, activeSection))}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-lg font-semibold text-red-600">
                    {getOverduePayments(selectedLoanForInterest.id, activeSection).length} payments
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Balance Update Modal */}
      <Modal
        isOpen={isBalanceUpdateOpen}
        onClose={() => {
          setIsBalanceUpdateOpen(false)
          setSelectedLoanForBalance(null)
          setBalanceUpdateAmount('')
        }}
        title="Update Outstanding Balance"
      >
        {selectedLoanForBalance && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold text-blue-900">
                {activeSection === 'lent' ? 'Money Lent to' : 'Money Borrowed from'}: {' '}
                {'borrower_name' in selectedLoanForBalance 
                  ? selectedLoanForBalance.borrower_name 
                  : selectedLoanForBalance.lender_name
                }
              </h4>
              <p className="text-blue-700">
                Original Amount: {formatCurrency(selectedLoanForBalance.amount)} | 
                Current Outstanding: {formatCurrency(selectedLoanForBalance.outstanding_balance)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Outstanding Balance *
              </label>
              <Input
                type="number"
                step={0.01}
                value={balanceUpdateAmount}
                onChange={(e) => setBalanceUpdateAmount(e.target.value)}
                placeholder="Enter new outstanding balance"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter 0 to mark as fully paid, or any amount between 0 and {formatCurrency(selectedLoanForBalance.amount)}
              </p>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBalanceUpdateOpen(false)
                  setSelectedLoanForBalance(null)
                  setBalanceUpdateAmount('')
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBalanceUpdate} 
                className="flex-1"
                disabled={!balanceUpdateAmount || parseFloat(balanceUpdateAmount) < 0 || parseFloat(balanceUpdateAmount) > selectedLoanForBalance.amount}
              >
                Update Balance
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
