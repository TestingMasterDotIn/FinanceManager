import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  ChartBarIcon, 
  CalculatorIcon, 
  SparklesIcon, 
  ShieldCheckIcon 
} from '@heroicons/react/24/outline'
import { Button } from '../ui/Button'

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900" />
      
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-gradient-to-r from-pink-400/20 to-yellow-400/20 rounded-full blur-3xl"
        />
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="space-y-8"
        >
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white">
            Master Your{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Debt Journey
            </span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Optimize your loans, track payments, and become debt-free faster with AI-powered insights and beautiful analytics.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="px-8 py-3">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="px-8 py-3">
                Sign In
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16">
            {[
              { icon: ChartBarIcon, title: 'Smart Analytics', desc: 'Visual debt tracking' },
              { icon: CalculatorIcon, title: 'EMI Calculator', desc: 'Instant calculations' },
              { icon: SparklesIcon, title: 'AI Optimization', desc: 'Smart recommendations' },
              { icon: ShieldCheckIcon, title: 'Secure & Private', desc: 'Your data protected' }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <feature.icon className="h-12 w-12 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}