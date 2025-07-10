import React from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import {
  CreditCardIcon,
  ChartPieIcon,
  CpuChipIcon,
  ClockIcon,
  ShieldCheckIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'

const features = [
  {
    icon: CreditCardIcon,
    title: 'Multi-Loan Management',
    description: 'Track all your loans in one place. Add home loans, personal loans, car loans, and more with detailed amortization schedules.',
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    icon: ChartPieIcon,
    title: 'Advanced Analytics',
    description: 'Visualize your debt journey with interactive charts, payment breakdowns, and projected debt-free dates.',
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    icon: CpuChipIcon,
    title: 'AI-Powered Optimization',
    description: 'Get personalized recommendations for prepayments, refinancing, and debt consolidation strategies.',
    gradient: 'from-green-500 to-teal-500'
  },
  {
    icon: ClockIcon,
    title: 'Prepayment Simulator',
    description: 'See how extra payments impact your loans. Calculate savings and find the optimal prepayment strategy.',
    gradient: 'from-orange-500 to-red-500'
  },
  {
    icon: ShieldCheckIcon,
    title: 'Bank-Grade Security',
    description: 'Your financial data is protected with enterprise-level encryption and privacy controls.',
    gradient: 'from-indigo-500 to-purple-500'
  },
  {
    icon: DevicePhoneMobileIcon,
    title: 'Mobile Optimized',
    description: 'Access your loan dashboard anywhere with our responsive design and PWA capabilities.',
    gradient: 'from-pink-500 to-rose-500'
  }
]

export const Features: React.FC = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section id="features" ref={ref} className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything You Need to Master Your Debt
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            From simple EMI calculations to complex debt optimization strategies, we've got you covered.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
              <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-lg flex items-center justify-center mb-6`}>
                <feature.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}