'use client'

import { useState } from 'react'
import type { SuggestRequest, SuggestResponse } from '@mbspro/shared'

export default function HomePage() {
  const [note, setNote] = useState('')
  const [topN, setTopN] = useState<number>(5)
  const [response, setResponse] = useState<SuggestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!note.trim()) {
      setError('Please enter a clinical note')
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
      const requestBody: SuggestRequest = {
        note: note.trim(),
        topN: topN > 0 ? topN : undefined,
      }

      const response = await fetch(`${apiBase}/api/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(
          errorData?.message || `HTTP ${response.status}: ${response.statusText}`
        )
      }

      const data: SuggestResponse = await response.json()
      setResponse(data)
    } catch (err) {
      console.error('Error calling /suggest:', err)
      setError(err instanceof Error ? err.message : 'Failed to get suggestions')
    } finally {
      setLoading(false)
    }
  }

  const clearForm = () => {
    setNote('')
    setTopN(5)
    setResponse(null)
    setError(null)
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          MBS Item Suggestions
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Enter your clinical notes or SOAP documentation to receive AI-powered MBS item suggestions
        </p>
      </div>

      {/* Input Form */}
      <div className="card max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="clinical-note" className="form-label">
              Clinical Notes / SOAP Documentation
            </label>
            <textarea
              id="clinical-note"
              rows={8}
              className="form-textarea"
              placeholder="Enter your clinical notes here... 

Example:
- Patient presents with chronic lower back pain
- Duration: 6 months, worsening over past 2 weeks  
- Physical examination shows limited range of motion
- Discussed treatment options and pain management strategies
- Prescribed physiotherapy and reviewed in 2 weeks"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={loading}
            />
            <div className="mt-1 text-sm text-gray-500">
              {note.length} characters
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-4 space-y-4 sm:space-y-0">
            <div className="flex-1">
              <label htmlFor="top-n" className="form-label">
                Maximum Suggestions
              </label>
              <select
                id="top-n"
                className="form-textarea"
                value={topN}
                onChange={(e) => setTopN(parseInt(e.target.value))}
                disabled={loading}
              >
                <option value={3}>3 suggestions</option>
                <option value={5}>5 suggestions</option>
                <option value={10}>10 suggestions</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={clearForm}
                className="btn-secondary"
                disabled={loading}
              >
                Clear
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !note.trim()}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Getting Suggestions...
                  </span>
                ) : (
                  'Get Suggestions'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Error State */}
      {error && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error
                </h3>
                <div className="mt-1 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Panel */}
      {response && (
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                API Response
              </h3>
              <div className="text-sm text-gray-600">
                Showing results from: <code className="bg-gray-100 px-1 rounded">POST /api/suggest</code>
              </div>
            </div>

            {/* Pretty JSON Display */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 overflow-auto">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>

            {/* Response Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Candidates:</span>
                  <span className="ml-2 text-gray-900">
                    {response.candidates?.length || 0}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Signals:</span>
                  <span className="ml-2 text-gray-900">
                    {response.signals ? 'Yes' : 'None'}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Status:</span>
                  <span className="ml-2 text-green-600">Success</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day-1 Info */}
      <div className="max-w-4xl mx-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Day-1 Prototype Information
              </h3>
              <div className="mt-1 text-sm text-blue-700">
                This is a minimal working prototype. The suggestion endpoint currently returns an empty candidates array 
                as a placeholder. Future iterations will implement the actual AI-powered suggestion logic.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
