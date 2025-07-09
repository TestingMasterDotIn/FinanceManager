import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { useAuth } from './hooks/useAuth'
import { Navbar } from './components/layout/Navbar'
import { LandingPage } from './pages/LandingPage'
import { AuthForm } from './components/auth/AuthForm'
import { Dashboard } from './pages/Dashboard'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }
  
  return user ? <>{children}</> : <Navigate to="/auth" />
}

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthForm />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  )
}

export default App