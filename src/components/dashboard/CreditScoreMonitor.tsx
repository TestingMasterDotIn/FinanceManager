import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  ShieldCheckIcon, 
  DocumentTextIcon, 
  ArrowPathIcon, 
  ExclamationTriangleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'

interface CreditScore {
  id?: string
  user_id: string
  score: number
  provider: 'CIBIL' | 'Experian' | 'Equifax' | 'CRIF'
  last_updated: string
  factors: {
    payment_history: number
    credit_utilization: number
    credit_length: number
    credit_mix: number
    new_inquiries: number
  }
}

interface PanFormData {
  panNumber: string
  fullName: string
  dateOfBirth: string
  mobileNumber: string
  email: string
}

export const CreditScoreMonitor: React.FC = () => {
  const { user } = useAuth()
  const [creditScore, setCreditScore] = useState<CreditScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPanForm, setShowPanForm] = useState(false)
  const [fetchingScore, setFetchingScore] = useState(false)
  const [panFormData, setPanFormData] = useState<PanFormData>({
    panNumber: '',
    fullName: '',
    dateOfBirth: '',
    mobileNumber: '',
    email: ''
  })

  // Validate PAN format
  const validatePan = (pan: string): boolean => {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/
    return panRegex.test(pan.toUpperCase())
  }

  // Fetch existing credit score
  const fetchCreditScore = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Fetch latest credit score from database
      const { data: scoreData } = await supabase
        .from('credit_scores')
        .select('*')
        .eq('user_id', user.id)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (scoreData) {
        setCreditScore(scoreData)
      }

      // Fetch user profile for PAN details  
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('pan_number, full_name, date_of_birth, mobile_number, email')
        .eq('user_id', user.id)
        .single()
      
      if (profile) {
        setPanFormData({
          panNumber: profile.pan_number || '',
          fullName: profile.full_name || '',
          dateOfBirth: profile.date_of_birth || '',
          mobileNumber: profile.mobile_number || '',
          email: profile.email || user.email || ''
        })
      }
    } catch (error) {
      console.error('Error fetching credit score:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  // Mock credit score fetch function
  const fetchCreditScoreFromPan = async () => {
    if (!user || !validatePan(panFormData.panNumber)) {
      alert('Please enter a valid PAN number')
      return
    }

    setFetchingScore(true)
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Generate mock credit score
      const mockScore = Math.floor(Math.random() * (850 - 300) + 300)
      
      const newScore: CreditScore = {
        user_id: user.id,
        score: mockScore,
        provider: 'CIBIL',
        last_updated: new Date().toISOString(),
        factors: {
          payment_history: Math.floor(Math.random() * 40 + 60),
          credit_utilization: Math.floor(Math.random() * 50 + 20),
          credit_length: Math.floor(Math.random() * 20 + 10),
          credit_mix: Math.floor(Math.random() * 15 + 5),
          new_inquiries: Math.floor(Math.random() * 10 + 1)
        }
      }

      // Save to database
      const { data, error } = await supabase
        .from('credit_scores')
        .insert([newScore])
        .select()
        .single()

      if (error) throw error
      setCreditScore(data)

      // Update user profile with PAN details
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          pan_number: panFormData.panNumber,
          full_name: panFormData.fullName,
          date_of_birth: panFormData.dateOfBirth,
          mobile_number: panFormData.mobileNumber,
          email: panFormData.email
        })

      setShowPanForm(false)
    } catch (error) {
      console.error('Error fetching credit score:', error)
      alert('Error fetching credit score. Please try again.')
    } finally {
      setFetchingScore(false)
    }
  }

  useEffect(() => {
    fetchCreditScore()
  }, [fetchCreditScore])

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
      {/* Main Credit Score Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Credit Score Monitor</h2>
                <p className="text-sm text-gray-600">
                  {creditScore ? 'Last updated: ' + new Date(creditScore.last_updated).toLocaleDateString() : 'No credit score available'}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowPanForm(true)}
              className="flex items-center space-x-2"
            >
              <ArrowPathIcon className="h-4 w-4" />
              <span>Get Score</span>
            </Button>
          </div>

          {creditScore ? (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white mb-4">
                <div className="text-center">
                  <div className="text-3xl font-bold">{creditScore.score}</div>
                  <div className="text-sm opacity-90">{creditScore.provider}</div>
                </div>
              </div>
              
              <div className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {creditScore.score >= 750 ? 'Excellent' : 
                 creditScore.score >= 700 ? 'Good' : 
                 creditScore.score >= 650 ? 'Fair' : 'Needs Improvement'}
              </div>
              
              <p className="text-gray-600 mb-6">
                {creditScore.score >= 750 ? 'You have an excellent credit score! Keep it up.' :
                 creditScore.score >= 700 ? 'Your credit score is good. Consider improving it further.' :
                 creditScore.score >= 650 ? 'Your credit score is fair. Work on improving it.' :
                 'Your credit score needs improvement. Focus on paying bills on time.'}
              </p>

              {/* Credit Score Factors */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{creditScore.factors.payment_history}%</div>
                  <div className="text-xs text-gray-600">Payment History</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{creditScore.factors.credit_utilization}%</div>
                  <div className="text-xs text-gray-600">Credit Utilization</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{creditScore.factors.credit_length}</div>
                  <div className="text-xs text-gray-600">Credit Length</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{creditScore.factors.credit_mix}</div>
                  <div className="text-xs text-gray-600">Credit Mix</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{creditScore.factors.new_inquiries}</div>
                  <div className="text-xs text-gray-600">New Inquiries</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Credit Score Available</h3>
              <p className="text-gray-600 mb-6">
                Add your PAN card details to fetch your credit score automatically from credit bureaus.
              </p>
              <Button
                onClick={() => setShowPanForm(true)}
                className="flex items-center space-x-2 mx-auto"
              >
                <DocumentTextIcon className="h-4 w-4" />
                <span>Add PAN Details</span>
              </Button>
            </div>
          )}
        </Card>
      </motion.div>

      {/* PAN Form Modal */}
      {showPanForm && (
        <Card className="p-6 border border-blue-200 bg-blue-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Enter PAN Details to Fetch Credit Score
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPanForm(false)}
                disabled={fetchingScore}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number *
                </label>
                <Input
                  type="text"
                  value={panFormData.panNumber}
                  onChange={(e) => setPanFormData({...panFormData, panNumber: e.target.value.toUpperCase()})}
                  placeholder="ABCDE1234F"
                  className={validatePan(panFormData.panNumber) || !panFormData.panNumber ? '' : 'border-red-500'}
                  disabled={fetchingScore}
                />
                {panFormData.panNumber && !validatePan(panFormData.panNumber) && (
                  <p className="text-xs text-red-500 mt-1">Invalid PAN format</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <Input
                  type="text"
                  value={panFormData.fullName}
                  onChange={(e) => setPanFormData({...panFormData, fullName: e.target.value})}
                  placeholder="Full Name as per PAN"
                  disabled={fetchingScore}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth *
                </label>
                <Input
                  type="date"
                  value={panFormData.dateOfBirth}
                  onChange={(e) => setPanFormData({...panFormData, dateOfBirth: e.target.value})}
                  disabled={fetchingScore}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mobile Number *
                </label>
                <Input
                  type="tel"
                  value={panFormData.mobileNumber}
                  onChange={(e) => setPanFormData({...panFormData, mobileNumber: e.target.value})}
                  placeholder="10-digit mobile number"
                  disabled={fetchingScore}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <Input
                  type="email"
                  value={panFormData.email}
                  onChange={(e) => setPanFormData({...panFormData, email: e.target.value})}
                  placeholder="email@example.com"
                  disabled={fetchingScore}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 mb-4">
              <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
              <p className="text-sm text-gray-600">
                Your PAN details will be securely stored and used only for credit score retrieval.
              </p>
            </div>

            <div className="flex space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowPanForm(false)}
                disabled={fetchingScore}
              >
                Cancel
              </Button>
              <Button
                onClick={fetchCreditScoreFromPan}
                disabled={fetchingScore || !validatePan(panFormData.panNumber) || !panFormData.fullName}
                className="flex-1"
              >
                {fetchingScore ? (
                  <>
                    <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                    Fetching Credit Score...
                  </>
                ) : (
                  'Get Credit Score'
                )}
              </Button>
            </div>
          </motion.div>
        </Card>
      )}
    </div>
  )
}
