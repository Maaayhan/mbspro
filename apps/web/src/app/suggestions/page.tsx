'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { useClaimDraft } from '@/store/useClaimDraft'
import { runQuickRules } from '@/lib/quickRules'
import { 
  MicrophoneIcon, 
  SparklesIcon,
  ClockIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  TrashIcon
} from '@heroicons/react/24/outline'

// Types
interface SuggestCandidate {
  code: string
  title: string
  score: number
  score_breakdown?: Record<string, number>
  feature_hits?: string[]
  short_explain?: string
  rule_results?: any[]
  compliance?: 'green' | 'amber' | 'red'
}

interface SuggestResponse {
  candidates: SuggestCandidate[]
  signals?: {
    duration: number
    mode: string
    after_hours: boolean
    chronic: boolean
  }
}

export default function SuggestionsPage() {
  const { draft, setNotes, addItem, removeItem, setQuickRules, clear } = useClaimDraft()
  const [soapNotes, setSoapNotes] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestCandidate[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedExplain, setExpandedExplain] = useState<string | null>(null)

  // Initialize notes from draft and check for expired draft
  useEffect(() => {
    if (draft.meta?.updatedAt) {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
      if (draft.meta.updatedAt < threeDaysAgo) {
        clear() // Auto-clear expired draft
      } else {
        setSoapNotes(draft.notes || '')
      }
    }
  }, [draft.meta?.updatedAt, draft.notes, clear])

  // Handle notes change: update both local state and global draft
  const onNotesChange = (v: string) => {
    setSoapNotes(v)
    setNotes(v)
  }

  // Handle Accept: add to global draft and run quick rules
  const handleAccept = (s: SuggestCandidate) => {
    const newItem = { 
      code: s.code, 
      title: s.title, 
      fee: s.feature_hits?.find(f => f.startsWith('Fee:'))?.replace('Fee: $', '') || '0.00',
      description: s.title,
      score: s.score
    }
    addItem(newItem)
    const updatedItems = [...draft.selected, newItem]
    const results = runQuickRules({ notes: draft.notes || soapNotes, items: updatedItems })
    setQuickRules(results)
  }

  // Handle Remove: remove from global draft and re-run quick rules
  const handleRemove = (code: string) => {
    removeItem(code)
    const updatedItems = draft.selected.filter(i => i.code !== code)
    const results = runQuickRules({ notes: draft.notes || soapNotes, items: updatedItems })
    setQuickRules(results)
  }

  // Quick compliance status for UI
  const quickStatus = useMemo(() => {
    if (!draft.quickRules?.length) return null
    const hasFail = draft.quickRules.some(r => r.status === 'fail')
    const hasWarn = draft.quickRules.some(r => r.status === 'warning')
    return hasFail ? 'red' : hasWarn ? 'amber' : 'green'
  }, [draft.quickRules])

  const sampleSOAP = `S: 45-year-old patient presents with chest pain and shortness of breath for 2 days. Pain is sharp, worse with deep breathing. No fever, no cough. History of hypertension.

O: Vital signs stable. Heart rate 88 bpm, BP 140/85. Chest clear to auscultation. No peripheral edema. ECG shows normal sinus rhythm.

A: Chest pain, likely musculoskeletal. Rule out cardiac causes.

P: Order ECG, chest X-ray. Prescribe anti-inflammatory. Follow up in 1 week if symptoms persist.`


  const handleGetSuggestions = async () => {
    setIsLoading(true)
    setError('')
    setShowSuggestions(false)
    
    try {
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000').replace(/\/$/, '')
      const response = await fetch(`${apiBase}/api/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          note: soapNotes.trim(),
          topN: 5
        }),
      })

      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data: SuggestResponse = await response.json()
      setSuggestions(data.candidates || [])
      setShowSuggestions(true)
    } catch (err: any) {
      console.error('Error getting suggestions:', err)
      setError(err.message || 'Failed to fetch suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  const getTotalFee = () => {
    return draft.selected.reduce((total, item) => {
      const fee = item.fee ? parseFloat(item.fee) : 0
      return total + fee
    }, 0).toFixed(2)
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content - Input and Suggestions */}
          <div className="lg:col-span-3 space-y-6">
            {/* Input Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Clinical Notes Input</h2>
                <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-700">
                  <MicrophoneIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Voice Input</span>
                </button>
              </div>
              
              <textarea
                value={soapNotes}
                onChange={(e) => onNotesChange(e.target.value)}
                placeholder={sampleSOAP}
                className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              />
              
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Characters: {soapNotes.length}</span>
                  <span>•</span>
                  <span>Voice input available</span>
                </div>
                
                <button
                  onClick={handleGetSuggestions}
                  disabled={isLoading}
                  className="btn-primary flex items-center disabled:opacity-50"
                >
                  <SparklesIcon className="mr-2 h-5 w-5" />
                  {isLoading ? (
                    <div className="flex items-center">
                      <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </div>
                  ) : (
                    'Get AI Suggestions'
                  )}
                </button>
              </div>
            </div>

            {/* Suggestions Section */}
            {showSuggestions && (
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-gray-900">MBS Code Suggestions</h2>
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <SparklesIcon className="h-4 w-4" />
                    <span>AI Confidence: 89%</span>
                  </div>
                </div>

                <div className="grid gap-4">
                  {suggestions.map((suggestion, index) => (
                    <div key={suggestion.code} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2.5 py-0.5 rounded">
                              {suggestion.code}
                            </span>
                            <h3 className="font-medium text-gray-900">{suggestion.title}</h3>
                            <span className="text-lg font-semibold text-gray-900">
                              ${suggestion.feature_hits?.find(f => f.startsWith('Fee:'))?.replace('Fee: $', '') || '0.00'}
                            </span>
                            {suggestion.compliance === 'amber' && (
                              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded">
                                Review Required
                              </span>
                            )}
                            {suggestion.compliance === 'red' && (
                              <span className="bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded">
                                Attention Required
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 text-sm mt-1">
                            {suggestion.feature_hits?.filter(f => !f.startsWith('Fee:')).join(', ')}
                          </p>
                          {/* TODO: get description from actual code */}
                          {/* <p className="text-gray-500 text-xs mt-2">{suggestion.short_explain}</p> */}
                          
                          <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
                            <div className="flex items-center">
                              <div className={`w-2 h-2 rounded-full mr-1 ${
                                suggestion.score > 0.75 ? 'bg-green-400' : suggestion.score > 0.4 ? 'bg-yellow-400' : 'bg-red-400'
                              }`}></div>
                              <span>Score: {(suggestion.score).toFixed(3)}</span>
                            </div>
                            {suggestion.score_breakdown && Object.entries(suggestion.score_breakdown).map(([key, value]) => (
                              <div key={key} className="flex items-center">
                                <span>{key}: {(value).toFixed(3)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleAccept(suggestion)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1 rounded-md flex items-center"
                          >
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Accept
                          </button>
                          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-md flex items-center">
                            <ArrowPathIcon className="h-3 w-3 mr-1" />
                            Swap
                          </button>
                          <button 
                            onClick={() => setExpandedExplain(expandedExplain === suggestion.code ? null : suggestion.code)}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-3 py-1 rounded-md flex items-center"
                          >
                            <InformationCircleIcon className="h-3 w-3 mr-1" />
                            Explain
                          </button>
                        </div>
                      </div>
                      
                      {/* Expanded Explanation */}
                      {expandedExplain === suggestion.code && suggestion.short_explain && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="bg-blue-50 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">AI Explanation</h4>
                            <p className="text-sm text-blue-800">{suggestion.short_explain}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Compliance Notice */}
                <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <InformationCircleIcon className="h-5 w-5 text-amber-400 mt-0.5 mr-3" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Compliance Check</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        All suggested codes comply with MBS guidelines. Please verify clinical documentation 
                        supports the selected items before proceeding.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Selected Items */}
          <div className="lg:col-span-1">
            <div className="card sticky top-20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selected Items</h3>
              
              {draft.selected.length === 0 ? (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No items selected yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.selected.map((item) => (
                    <div key={item.code} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-0.5 rounded">
                              {item.code}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              ${item.fee || '0.00'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">{item.title}</p>
                        </div>
                        <button
                          onClick={() => handleRemove(item.code)}
                          className="text-gray-400 hover:text-red-500 ml-2"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="border-t border-gray-200 pt-3 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">Total Fee:</span>
                      <span className="text-lg font-semibold text-gray-900">${getTotalFee()}</span>
                    </div>
                  </div>

                  {/* Quick Compliance Check */}
                  {draft.quickRules?.length > 0 && (
                    <div className={`mt-4 p-3 rounded-lg border ${quickStatus === 'green'
                        ? 'bg-green-50 border-green-200'
                        : quickStatus === 'amber'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                      }`}>
                      <div className="text-sm font-medium text-gray-900 mb-2">
                        Compliance (Quick Check)
                      </div>
                      <ul className="space-y-1 text-xs">
                        {draft.quickRules.map((r) => (
                          <li key={r.id} className="flex items-start">
                            <span className={`mt-1 mr-2 inline-block w-2 h-2 rounded-full ${
                              r.status === 'ok' ? 'bg-green-500' : r.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="text-gray-700">{r.id} — {r.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <Link
                    href="/claim-builder"
                    className="btn-primary w-full mt-4 flex justify-center"
                  >
                    Proceed to Claim
                  </Link>

                  {/* Draft Controls */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={clear}
                      className="w-full text-center text-sm text-red-600 hover:text-red-700 py-1"
                    >
                      🗑️ Clear Draft
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
