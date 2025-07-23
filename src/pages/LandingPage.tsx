import React from 'react'
import { Hero } from '../components/landing/Hero'
import { Features } from '../components/landing/Features'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  HeartIcon,
  ShieldCheckIcon,
  SparklesIcon,
  EnvelopeIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      
      {/* Modern Footer Section */}
      <footer className="relative bg-gray-900 dark:bg-black text-white overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-full blur-2xl"></div>
          
          {/* Floating particles */}
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              animate={{
                y: [-20, 20, -20],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: Math.random() * 4 + 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
              className="absolute w-1 h-1 bg-blue-400/60 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          {/* Main footer content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Brand section */}
            <div className="md:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              >
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  FinanceManager
                </h3>
                <p className="text-gray-300 mb-6 max-w-md leading-relaxed">
                  Empowering you to take control of your financial journey with intelligent loan management and optimization tools.
                </p>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <ShieldCheckIcon className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-gray-300">Secure</span>
                  </div>
                  <div className="flex items-center space-x-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <SparklesIcon className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">AI-Powered</span>
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Quick links */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-3">
                  <li>
                    <Link to="/auth" className="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                      Get Started
                    </Link>
                  </li>
                  <li>
                    <a href="#features" className="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                      Features
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-300 hover:text-blue-400 transition-colors duration-200">
                      Support
                    </a>
                  </li>
                </ul>
              </motion.div>
            </div>
            
            {/* Contact */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h4 className="text-lg font-semibold mb-4">Get in Touch</h4>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    {/* <EnvelopeIcon className="w-5 h-5 text-blue-400" /> */}
                    {/* <span className="text-gray-300">support@loanmaster.com</span> */}
                  </div>
                  <div className="mt-4">
                    <Link 
                      to="/auth?mode=signup"
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full font-semibold hover:from-blue-500 hover:to-purple-500 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                    >
                      <span>Start Your Journey</span>
                      <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
          
          {/* Bottom section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center"
          >
            <p className="text-gray-400 text-sm mb-4 md:mb-0">
              © 2025 FinanceManager. All rights reserved.
            </p>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>Made with</span>
              <HeartIcon className="w-4 h-4 text-red-400 animate-pulse" />
              <span>for your financial freedom</span>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  )
}