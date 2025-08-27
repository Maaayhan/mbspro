'use client'

import Link from 'next/link'
import { ArrowRightIcon, PlayIcon } from '@heroicons/react/24/outline'

export default function LandingPage() {
  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="relative z-10 px-6 pt-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600">
              <span className="text-lg font-bold text-white">M</span>
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">MBSPro</span>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
            <a href="#about" className="text-gray-600 hover:text-gray-900 font-medium">About</a>
            <a href="#contact" className="text-gray-600 hover:text-gray-900 font-medium">Contact</a>
          </nav>
        </div>
      </header>

      <div className="relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden">
          <svg className="absolute right-0 top-0 h-full w-full" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#0ea5e9', stopOpacity:0.1}} />
                <stop offset="100%" style={{stopColor:'#14b8a6', stopOpacity:0.05}} />
              </linearGradient>
            </defs>
            <circle cx="350" cy="50" r="100" fill="url(#grad1)" />
            <circle cx="50" cy="150" r="80" fill="url(#grad1)" />
            <circle cx="300" cy="250" r="120" fill="url(#grad1)" />
            <path d="M50,200 Q150,250 250,200 T450,200" stroke="#0ea5e9" strokeWidth="2" fill="none" opacity="0.1"/>
            <path d="M0,300 Q100,250 200,300 T400,300" stroke="#14b8a6" strokeWidth="2" fill="none" opacity="0.1"/>
          </svg>
        </div>

        {/* Main Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-8">
            {/* Left Column - Hero Content */}
            <div className="flex flex-col justify-center">
              <div className="max-w-2xl">
                <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                  <span className="block">MBSPro</span>
                  <span className="block text-primary-600">AI-Assisted, Ethical</span>
                  <span className="block">MBS Billing for GPs</span>
                </h1>
                <p className="mt-6 text-xl leading-8 text-gray-600">
                  Streamline your Medicare billing with AI-powered suggestions, 
                  compliance checks, and ethical guidelines. Designed specifically 
                  for Australian general practitioners.
                </p>
                <div className="mt-10 flex items-center gap-4">
                  <Link href="/dashboard" className="btn-primary flex items-center">
                    Get Started
                    <ArrowRightIcon className="ml-2 h-5 w-5" />
                  </Link>
                  <button className="btn-secondary flex items-center">
                    <PlayIcon className="mr-2 h-5 w-5" />
                    Watch Demo
                  </button>
                </div>
                
                {/* Features List */}
                <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">AI-Powered Suggestions</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">Compliance Monitoring</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">Ethical Guidelines</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-gray-700 font-medium">Real-time Validation</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Login Panel */}
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md">
                <div className="card">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                    <p className="mt-2 text-gray-600">Sign in to your MBSPro account</p>
                  </div>
                  
                  <form className="mt-8 space-y-6">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                        Email address
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="doctor@clinic.com.au"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-3 placeholder-gray-400 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                        placeholder="••••••••"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          id="remember-me"
                          name="remember-me"
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                          Remember me
                        </label>
                      </div>
                      <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-500">
                        Forgot password?
                      </a>
                    </div>

                    <div className="space-y-3">
                      <Link
                        href="/dashboard"
                        className="btn-primary w-full flex justify-center"
                      >
                        Sign In
                      </Link>
                      <Link
                        href="/suggestions"
                        className="btn-secondary w-full flex justify-center"
                      >
                        Try Demo
                      </Link>
                    </div>
                  </form>
                </div>
                
                {/* Trust indicators */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    Trusted by 500+ Australian GP practices (coming soon)
                  </p>
                  <div className="mt-2 flex justify-center space-x-4">
                    <div className="text-xs text-gray-400">🔒 256-bit SSL</div>
                    <div className="text-xs text-gray-400">✓ GDPR Compliant</div>
                    <div className="text-xs text-gray-400">🏥 Healthcare Approved</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2024 MBSPro. All rights reserved. | Privacy Policy | Terms of Service</p>
            <p className="mt-2">
              This platform provides AI-assisted suggestions for MBS billing. 
              Healthcare providers remain responsible for final billing decisions.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
