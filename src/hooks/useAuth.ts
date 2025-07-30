import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string) => {
    // Get the correct redirect URL based on environment
    const getRedirectURL = () => {
      if (import.meta.env.PROD) {
        // Production - use your GitHub Pages URL
        return 'https://testingmasterdotin.github.io/FinanceManager/auth'
      } else {
        // Development - use localhost
        return 'http://localhost:5173/auth'
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getRedirectURL()
      }
    })
    return { data, error }
  }

  const signIn = async (email: string, password: string) => {
    try {
      console.log('Attempting sign in...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Supabase auth error:', error)
      } else {
        console.log('Sign in successful')
      }
      
      return { data, error }
    } catch (error) {
      console.error('Network/fetch error during sign in:', error)
      // Re-throw the error so it can be handled by the component
      throw error
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const signInWithProvider = async (provider: 'google' | 'github' | 'linkedin') => {
    // Get the correct redirect URL based on environment
    const getRedirectURL = () => {
      if (import.meta.env.PROD) {
        // Production - use your GitHub Pages URL
        return 'https://testingmasterdotin.github.io/FinanceManager/dashboard'
      } else {
        // Development - use localhost
        return 'http://localhost:5173/dashboard'
      }
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: getRedirectURL()
      }
    })
    return { data, error }
  }

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithProvider,
  }
}