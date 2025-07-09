import React from 'react'
import { Hero } from '../components/landing/Hero'
import { Features } from '../components/landing/Features'
import { TechStack } from '../components/landing/TechStack'

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <TechStack />
    </div>
  )
}