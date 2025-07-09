import React from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'

const techStack = [
  { name: 'React', color: 'text-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  { name: 'Vite', color: 'text-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/20' },
  { name: 'TypeScript', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/20' },
  { name: 'Tailwind CSS', color: 'text-cyan-500', bg: 'bg-cyan-100 dark:bg-cyan-900/20' },
  { name: 'Supabase', color: 'text-green-500', bg: 'bg-green-100 dark:bg-green-900/20' },
  { name: 'Framer Motion', color: 'text-pink-500', bg: 'bg-pink-100 dark:bg-pink-900/20' },
  { name: 'Recharts', color: 'text-orange-500', bg: 'bg-orange-100 dark:bg-orange-900/20' },
  { name: 'Heroicons', color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-900/20' }
]

export const TechStack: React.FC = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section ref={ref} className="py-20 bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Built with Modern Technology
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Powered by the latest and greatest tools for performance, security, and developer experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {techStack.map((tech, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`${tech.bg} rounded-lg p-6 text-center hover:scale-105 transition-transform duration-300`}
            >
              <div className={`text-2xl font-bold ${tech.color} mb-2`}>
                {tech.name}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}