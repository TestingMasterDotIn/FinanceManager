export interface LoanData {
  id: string
  loan_type: string
  principal: number
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