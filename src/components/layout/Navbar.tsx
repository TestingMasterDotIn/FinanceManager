import React from 'react'
import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'
import { SunIcon, MoonIcon, UserIcon, BanknotesIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../hooks/useAuth'
import { Button } from '../ui/Button'

export const Navbar: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()
  const { user, signOut } = useAuth()
  const location = useLocation()
  
  const handleSignOut = async () => {
    await signOut()
  }
  
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center space-x-2">
            <BanknotesIcon className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              LoanMaster
            </span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isDark ? (
                <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              ) : (
                <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              )}
            </button>
            
            {user ? (
              <div className="flex items-center space-x-4">
                {location.pathname !== '/dashboard' && (
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                )}
                <div className="flex items-center space-x-2">
                  <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {user.email}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/auth">
                  <Button variant="outline" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth?mode=signup">
                  <Button variant="primary" size="sm">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}