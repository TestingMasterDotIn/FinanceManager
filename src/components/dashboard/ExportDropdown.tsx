import React, { useState, useRef, useEffect } from 'react'
import { DocumentArrowDownIcon, ChevronDownIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import { Button } from '../ui/Button'
import { LoanData, FixedExpense, calculateLoanAnalytics, UserEarnings, calculateCombinedAnalytics } from '../../utils/loanCalculations'
import jsPDF from 'jspdf'

interface ExportDropdownProps {
  loans: LoanData[]
  fixedExpenses: FixedExpense[]
  earnings: UserEarnings | null
}

export const ExportDropdown: React.FC<ExportDropdownProps> = ({ loans, fixedExpenses, earnings }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

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

  const generateExportData = () => {
    const totalEMI = loans.reduce((sum, loan) => sum + loan.emi_amount, 0)
    const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const monthlyIncome = earnings?.monthly_earnings || 0
    const remainingIncome = monthlyIncome - totalEMI - totalFixedExpenses

    return {
      user_profile: {
        monthly_earnings: monthlyIncome,
        total_monthly_emi: totalEMI,
        total_fixed_expenses: totalFixedExpenses,
        remaining_income: remainingIncome,
        export_date: new Date().toISOString()
      },
      loans: loans.map(loan => ({
        ...loan,
        analytics: calculateLoanAnalytics(loan)
      })),
      fixed_expenses: fixedExpenses,
      financial_summary: {
        total_loans: loans.length,
        total_principal: loans.reduce((sum, loan) => sum + loan.principal, 0),
        average_interest_rate: loans.length > 0 ? loans.reduce((sum, loan) => sum + loan.interest_rate, 0) / loans.length : 0
      }
    }
  }

  const exportToJSON = () => {
    const data = generateExportData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `loan-master-data-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setIsOpen(false)
  }

  const exportToPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 15
    let yPosition = margin

    const totalEMI = loans.reduce((sum, loan) => sum + loan.emi_amount, 0)
    const totalFixedExpenses = fixedExpenses.reduce((sum, exp) => sum + exp.amount, 0)
    const monthlyIncome = earnings?.monthly_earnings || 0
    const remainingIncome = monthlyIncome - totalEMI - totalFixedExpenses
    const combinedAnalytics = calculateCombinedAnalytics(loans)

    // Helper function to add text with automatic page break
    const addText = (text: string, x: number, y: number, options: { maxWidth?: number; lineHeight?: number } = {}) => {
      if (y > pageHeight - 20) {
        doc.addPage()
        y = margin
      }
      
      if (options.maxWidth) {
        const lines = doc.splitTextToSize(text, options.maxWidth)
        doc.text(lines, x, y)
        return y + (lines.length * (options.lineHeight || 6))
      } else {
        doc.text(text, x, y)
        return y + (options.lineHeight || 6)
      }
    }

    // Helper function to add a card-like section
    const addCard = (title: string, content: string[], yPos: number) => {
      // Card background
      doc.setFillColor(248, 250, 252) // Light gray background
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, content.length * 8 + 15, 'F')
      
      // Card border
      doc.setDrawColor(229, 231, 235)
      doc.rect(margin, yPos - 5, pageWidth - 2 * margin, content.length * 8 + 15)
      
      // Title
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(31, 41, 55) // Dark gray
      yPos = addText(title, margin + 5, yPos + 5)
      
      // Content
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(75, 85, 99) // Medium gray
      
      content.forEach(line => {
        yPos = addText(line, margin + 5, yPos + 2)
      })
      
      return yPos + 10
    }

    try {
      // Header
      doc.setFillColor(59, 130, 246) // Blue background
      doc.rect(0, 0, pageWidth, 30, 'F')
      
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255) // White text
      doc.text('LOAN MASTER DASHBOARD', margin, 20)
      
      doc.setFontSize(10)
      doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}`, margin, 26)
      
      yPosition = 45

      // Financial Overview Card
      const overviewContent = [
        `Monthly Earnings: ${formatCurrency(monthlyIncome)}`,
        `Total Monthly EMI: ${formatCurrency(totalEMI)}`,
        `Fixed Expenses: ${formatCurrency(totalFixedExpenses)}`,
        `Available Income: ${formatCurrency(remainingIncome)}`,
        `Financial Status: ${remainingIncome >= 0 ? '✅ Healthy' : '⚠️ Needs Attention'}`
      ]
      yPosition = addCard('💰 FINANCIAL OVERVIEW', overviewContent, yPosition)

      // Loan Summary Card
      if (loans.length > 0) {
        const loanSummaryContent = [
          `Total Active Loans: ${loans.length}`,
          `Total Principal Amount: ${formatCurrency(combinedAnalytics.totalPrincipal)}`,
          `Total Interest Paid: ${formatCurrency(combinedAnalytics.totalPaidInterest)}`,
          `Total Remaining: ${formatCurrency(combinedAnalytics.totalRemainingPrincipal)}`,
          `Average Interest Rate: ${formatPercentage(loans.reduce((sum, loan) => sum + loan.interest_rate, 0) / loans.length)}`,
          `Overall Progress: ${formatPercentage((combinedAnalytics.totalPaidPrincipal / combinedAnalytics.totalPrincipal) * 100)}`
        ]
        yPosition = addCard('🏦 LOAN PORTFOLIO SUMMARY', loanSummaryContent, yPosition)

        // Individual Loan Cards
        yPosition = addText('📋 INDIVIDUAL LOAN DETAILS', margin, yPosition + 5, { lineHeight: 8 })
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(31, 41, 55)
        yPosition += 5

        loans.forEach((loan, index) => {
          if (yPosition > pageHeight - 60) {
            doc.addPage()
            yPosition = margin
          }

          const analytics = calculateLoanAnalytics(loan)
          const progress = (analytics.paidPrincipal / analytics.totalPrincipal) * 100
          
          const loanContent = [
            `Loan Type: ${loan.loan_type}`,
            `Principal: ${formatCurrency(loan.principal)} | EMI: ${formatCurrency(loan.emi_amount)}`,
            `Interest Rate: ${loan.interest_rate}% | Tenure: ${loan.tenure_months} months`,
            `Progress: ${formatPercentage(progress)} | Remaining: ${formatCurrency(analytics.remainingPrincipal)}`,
            `Interest Paid: ${formatCurrency(analytics.paidInterest)} | Principal Paid: ${formatCurrency(analytics.paidPrincipal)}`
          ]
          
          yPosition = addCard(`Loan ${index + 1}: ${loan.loan_type}`, loanContent, yPosition)
        })
      }

      // Fixed Expenses Card
      if (fixedExpenses.length > 0) {
        if (yPosition > pageHeight - 80) {
          doc.addPage()
          yPosition = margin
        }

        const expenseContent = fixedExpenses.map(exp => 
          `${exp.expense_name}: ${formatCurrency(exp.amount)}`
        )
        expenseContent.push(`Total Fixed Expenses: ${formatCurrency(totalFixedExpenses)}`)
        
        yPosition = addCard('💳 FIXED EXPENSES', expenseContent, yPosition)
      }

      // Financial Analysis Card
      if (monthlyIncome > 0) {
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = margin
        }

        const emiRatio = (totalEMI / monthlyIncome) * 100
        const expenseRatio = (totalFixedExpenses / monthlyIncome) * 100
        const savingsRatio = (remainingIncome / monthlyIncome) * 100

        const analysisContent = [
          `EMI to Income Ratio: ${formatPercentage(emiRatio)}`,
          `Fixed Expenses Ratio: ${formatPercentage(expenseRatio)}`,
          `Savings Ratio: ${formatPercentage(savingsRatio)}`,
          `Debt Burden: ${emiRatio > 40 ? 'High ⚠️' : emiRatio > 25 ? 'Moderate ⚡' : 'Low ✅'}`
        ]
        
        yPosition = addCard('📊 FINANCIAL ANALYSIS', analysisContent, yPosition)
      }

      // Recommendations Card
      if (yPosition > pageHeight - 50) {
        doc.addPage()
        yPosition = margin
      }

      const recommendations = []
      const emiRatio = monthlyIncome > 0 ? (totalEMI / monthlyIncome) * 100 : 0

      if (remainingIncome < 0) {
        recommendations.push('🚨 URGENT: Expenses exceed income. Consider debt restructuring.')
        recommendations.push('• Negotiate with lenders for lower EMIs or extended tenure')
        recommendations.push('• Look for additional income sources')
        recommendations.push('• Cut down on non-essential fixed expenses')
      } else if (emiRatio > 40) {
        recommendations.push('⚠️ High debt burden detected')
        recommendations.push('• Consider prepaying high-interest loans')
        recommendations.push('• Avoid taking new loans until ratio improves')
      } else if (remainingIncome > monthlyIncome * 0.3) {
        recommendations.push('✅ Excellent financial health!')
        recommendations.push('• Consider investing surplus in SIP/mutual funds')
        recommendations.push('• Build an emergency fund (6-12 months expenses)')
        recommendations.push('• Explore prepayment opportunities for tax benefits')
      } else {
        recommendations.push('⚡ Good financial position with room for improvement')
        recommendations.push('• Build emergency fund gradually')
        recommendations.push('• Consider small investments in low-risk instruments')
      }

      yPosition = addCard('💡 PERSONALIZED RECOMMENDATIONS', recommendations, yPosition)

      // Footer
      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(107, 114, 128)
      doc.text('Generated by Loan Master - Your Personal Finance Companion', margin, pageHeight - 10)
      doc.text(`Report includes ${loans.length} loans and ${fixedExpenses.length} fixed expenses`, margin, pageHeight - 6)

      // Save the PDF
      doc.save(`loan-master-dashboard-${new Date().toISOString().split('T')[0]}.pdf`)
      setIsOpen(false)
      
    } catch (error) {
      console.error('Error generating PDF:', error)
      // Fallback to basic PDF if advanced generation fails
      doc.text('Error generating advanced PDF. Please try again.', margin, yPosition)
      doc.save(`loan-master-basic-${new Date().toISOString().split('T')[0]}.pdf`)
      setIsOpen(false)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <DocumentArrowDownIcon className="h-4 w-4" />
        <span>Export</span>
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-50">
          <div className="py-1">
            <button
              onClick={exportToJSON}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Export as JSON
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export as PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
