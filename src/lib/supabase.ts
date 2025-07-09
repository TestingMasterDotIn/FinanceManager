import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      loans: {
        Row: {
          id: string
          user_id: string
          loan_type: string
          principal: number
          interest_rate: number
          tenure_months: number
          start_date: string
          emi_amount: number
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          loan_type: string
          principal: number
          interest_rate: number
          tenure_months: number
          start_date: string
          emi_amount: number
        }
        Update: {
          loan_type?: string
          principal?: number
          interest_rate?: number
          tenure_months?: number
          start_date?: string
          emi_amount?: number
        }
      }
      prepayments: {
        Row: {
          id: string
          loan_id: string
          user_id: string
          amount: number
          prepayment_date: string
          prepayment_type: 'one_time' | 'recurring'
          frequency?: 'monthly' | 'yearly' | 'custom'
          created_at: string
        }
        Insert: {
          loan_id: string
          user_id: string
          amount: number
          prepayment_date: string
          prepayment_type: 'one_time' | 'recurring'
          frequency?: 'monthly' | 'yearly' | 'custom'
        }
        Update: {
          amount?: number
          prepayment_date?: string
          prepayment_type?: 'one_time' | 'recurring'
          frequency?: 'monthly' | 'yearly' | 'custom'
        }
      }
      rate_changes: {
        Row: {
          id: string
          loan_id: string
          user_id: string
          new_rate: number
          effective_date: string
          created_at: string
        }
        Insert: {
          loan_id: string
          user_id: string
          new_rate: number
          effective_date: string
        }
        Update: {
          new_rate?: number
          effective_date?: string
        }
      }
    }
  }
}