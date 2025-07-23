export interface LoanData {
  id: string
  loan_type: string
  custom_name?: string
  principal: number
  outstanding_balance: number
  interest_rate: number
  tenure_months: number
  start_date: string
  emi_amount: number
}

export interface PrepaymentData {
  id: string
  loan_id: string
  amount: number
  prepayment_date: string
  prepayment_type: 'one_time' | 'recurring'
  frequency?: 'monthly' | 'yearly' | 'custom'
}

export interface RateChangeData {
  id: string
  loan_id: string
  new_rate: number
  effective_date: string
}

export interface EMIScheduleItem {
  month: number
  date: string
  emi: number
  principal: number
  interest: number
  balance: number
  prepayment?: number
}

export interface FixedExpense {
  id: string
  user_id: string
  category: string
  name: string
  amount: number
  frequency: 'monthly' | 'weekly' | 'daily'
  created_at?: string
  updated_at?: string
}

export interface UserEarnings {
  user_id: string
  monthly_earnings: number
  salary?: number
  include_interest_earnings?: boolean
  created_at?: string
  updated_at?: string
}

export interface LentMoney {
  id: string
  user_id: string
  borrower_name: string
  borrower_contact?: string
  amount: number
  outstanding_balance: number
  interest_rate: number
  lent_date: string
  expected_return_date: string
  paid_date?: string
  is_paid: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface BorrowedMoney {
  id: string
  user_id: string
  lender_name: string
  lender_contact?: string
  amount: number
  outstanding_balance: number
  interest_rate: number
  borrowed_date: string
  expected_return_date: string
  paid_date?: string
  is_paid: boolean
  notes?: string
  created_at: string
  updated_at: string
}

export interface LoanAnalytics {
  loanId: string
  loanType: string
  totalPrincipal: number
  totalInterest: number
  monthlyEMI: number
  remainingPrincipal: number
  paidPrincipal: number
  paidInterest: number
}

export interface SimulationResult {
  originalSchedule: EMIScheduleItem[]
  newSchedule: EMIScheduleItem[]
  interestSaved: number
  monthsSaved: number
  newDebtFreeDate: string
  newEMI?: number
}

export interface SavedSimulation {
  id: string
  user_id: string
  loan_id: string
  simulation_name: string
  description?: string
  original_schedule: EMIScheduleItem[]
  new_schedule: EMIScheduleItem[]
  interest_saved: number
  months_saved: number
  new_debt_free_date: string
  new_emi?: number
  prepayments?: PrepaymentData[]
  rate_changes?: RateChangeData[]
  created_at: string
  updated_at: string
}

export const calculateEMI = (principal: number, rate: number, tenure: number): number => {
  const monthlyRate = rate / 100 / 12
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / 
              (Math.pow(1 + monthlyRate, tenure) - 1)
  return Math.round(emi)
}

export const generateEMISchedule = (
  loan: LoanData,
  prepayments: PrepaymentData[] = [],
  rateChanges: RateChangeData[] = []
): EMIScheduleItem[] => {
  const schedule: EMIScheduleItem[] = []
  let balance = loan.principal
  let currentRate = loan.interest_rate
  let currentEMI = loan.emi_amount
  
  const startDate = new Date(loan.start_date)
  
  for (let month = 1; month <= loan.tenure_months && balance > 0; month++) {
    const currentDate = new Date(startDate)
    currentDate.setMonth(startDate.getMonth() + month - 1)
    
    // Check for rate changes
    const rateChange = rateChanges.find(rc => {
      const changeDate = new Date(rc.effective_date)
      return changeDate.getMonth() === currentDate.getMonth() && 
             changeDate.getFullYear() === currentDate.getFullYear()
    })
    
    if (rateChange) {
      currentRate = rateChange.new_rate
      const remainingMonths = loan.tenure_months - month + 1
      currentEMI = calculateEMI(balance, currentRate, remainingMonths)
    }
    
    const monthlyRate = currentRate / 100 / 12
    const interestAmount = balance * monthlyRate
    const principalAmount = Math.min(currentEMI - interestAmount, balance)
    
    // Check for prepayments
    const prepayment = prepayments.find(p => {
      const prepayDate = new Date(p.prepayment_date)
      return prepayDate.getMonth() === currentDate.getMonth() && 
             prepayDate.getFullYear() === currentDate.getFullYear()
    })
    
    let prepaymentAmount = 0
    if (prepayment) {
      prepaymentAmount = Math.min(prepayment.amount, balance - principalAmount)
    }
    
    balance = balance - principalAmount - prepaymentAmount
    
    schedule.push({
      month,
      date: currentDate.toISOString().split('T')[0],
      emi: currentEMI,
      principal: principalAmount,
      interest: interestAmount,
      balance: Math.max(0, balance),
      prepayment: prepaymentAmount > 0 ? prepaymentAmount : undefined
    })
    
    if (balance <= 0) break
  }
  
  return schedule
}

export const calculateTotalInterest = (schedule: EMIScheduleItem[]): number => {
  return schedule.reduce((total, item) => total + item.interest, 0)
}

export const calculateSavings = (originalSchedule: EMIScheduleItem[], newSchedule: EMIScheduleItem[]) => {
  const originalInterest = calculateTotalInterest(originalSchedule)
  const newInterest = calculateTotalInterest(newSchedule)
  
  return {
    interestSaved: originalInterest - newInterest,
    monthsSaved: originalSchedule.length - newSchedule.length,
    debtFreeDate: newSchedule[newSchedule.length - 1]?.date
  }
}

export const generateAIPrompt = (loans: LoanData[], extraAmount: number = 0): string => {
  const loanDescriptions = loans.map(loan => {
    const emiAmount = calculateEMI(loan.principal, loan.interest_rate, loan.tenure_months)
    return `${loan.loan_type}: ₹${(loan.principal / 100000).toFixed(1)}L at ${loan.interest_rate}% for ${loan.tenure_months} months (EMI: ₹${emiAmount.toLocaleString()})`
  }).join(', ')
  
  const totalEMI = loans.reduce((total, loan) => total + loan.emi_amount, 0)
  const totalBalance = loans.reduce((total, loan) => total + loan.principal, 0)
  
  return `I have the following loans: ${loanDescriptions}. 
Total monthly EMI: ₹${totalEMI.toLocaleString()}, Total outstanding: ₹${(totalBalance / 100000).toFixed(1)}L.
${extraAmount > 0 ? `I can pay ₹${extraAmount.toLocaleString()} extra monthly.` : ''} 
Please suggest an optimal debt repayment strategy to minimize total interest paid and become debt-free faster. 
Consider loan snowball vs avalanche methods and provide a month-by-month action plan.`
}

export const calculateLoanAnalytics = (loan: LoanData): LoanAnalytics => {
  const schedule = generateEMISchedule(loan)
  const totalInterest = calculateTotalInterest(schedule)
  
  // Calculate how much has been paid based on start date
  const startDate = new Date(loan.start_date)
  const currentDate = new Date()
  const monthsPassed = Math.max(0, 
    (currentDate.getFullYear() - startDate.getFullYear()) * 12 + 
    (currentDate.getMonth() - startDate.getMonth())
  )
  
  let paidInterest = 0
  
  // Calculate paid interest from schedule up to months passed
  for (let i = 0; i < Math.min(monthsPassed, schedule.length); i++) {
    paidInterest += schedule[i].interest
  }
  
  return {
    loanId: loan.id,
    loanType: loan.custom_name || loan.loan_type,
    totalPrincipal: loan.principal,
    totalInterest,
    monthlyEMI: loan.emi_amount,
    remainingPrincipal: loan.outstanding_balance, // Use actual outstanding balance
    paidPrincipal: loan.principal - loan.outstanding_balance, // Calculate from actual values
    paidInterest // Interest paid based on schedule
  }
}

export const calculateCombinedAnalytics = (loans: LoanData[]) => {
  const analytics = loans.map(calculateLoanAnalytics)
  
  return {
    totalPrincipal: analytics.reduce((sum, a) => sum + a.totalPrincipal, 0),
    totalInterest: analytics.reduce((sum, a) => sum + a.totalInterest, 0),
    totalMonthlyEMI: analytics.reduce((sum, a) => sum + a.monthlyEMI, 0),
    totalRemainingPrincipal: analytics.reduce((sum, a) => sum + a.remainingPrincipal, 0),
    totalPaidPrincipal: analytics.reduce((sum, a) => sum + a.paidPrincipal, 0),
    totalPaidInterest: analytics.reduce((sum, a) => sum + a.paidInterest, 0),
    individualAnalytics: analytics
  }
}

// Calculate remaining tenure for a loan based on current outstanding balance
export const calculateRemainingTenure = (loan: LoanData): number => {
  if (loan.outstanding_balance <= 0) return 0
  
  // Simple estimation: remaining_balance / (emi - monthly_interest)
  const monthlyInterestRate = loan.interest_rate / 100 / 12
  const monthlyInterest = loan.outstanding_balance * monthlyInterestRate
  const principalPayment = loan.emi_amount - monthlyInterest
  
  if (principalPayment <= 0) return loan.tenure_months // If EMI doesn't cover interest
  
  // More accurate calculation using loan formula
  const monthlyRate = loan.interest_rate / 100 / 12
  const remainingMonths = Math.ceil(
    Math.log(1 + (loan.outstanding_balance * monthlyRate) / loan.emi_amount) / 
    Math.log(1 + monthlyRate)
  )
  
  return Math.max(0, remainingMonths)
}

// Calculate interest earned from lending activities
export const calculateLendingBorrowingStats = (lentMoney: LentMoney[], borrowedMoney: BorrowedMoney[]) => {
  // Calculate monthly interest earnings from current outstanding amounts
  let totalMonthlyLentInterest = 0
  let totalMonthlyBorrowedInterest = 0
  
  lentMoney.forEach(loan => {
    if (!loan.is_paid && loan.outstanding_balance > 0) {
      // Calculate monthly interest based on current outstanding balance
      const monthlyInterestRate = loan.interest_rate / 100 / 12
      totalMonthlyLentInterest += loan.outstanding_balance * monthlyInterestRate
    }
  })
  
  borrowedMoney.forEach(loan => {
    if (!loan.is_paid && loan.outstanding_balance > 0) {
      // Calculate monthly interest owed based on current outstanding balance
      const monthlyInterestRate = loan.interest_rate / 100 / 12
      totalMonthlyBorrowedInterest += loan.outstanding_balance * monthlyInterestRate
    }
  })
  
  return {
    totalLentInterestEarned: Math.round(totalMonthlyLentInterest), // Monthly interest earned from lending
    totalBorrowedInterestOwed: Math.round(totalMonthlyBorrowedInterest), // Monthly interest owed on borrowing
    netInterestEarnings: Math.round(totalMonthlyLentInterest - totalMonthlyBorrowedInterest) // Net monthly interest
  }
}