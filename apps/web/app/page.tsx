'use client'

import { useState, useEffect } from 'react'
import type { SuggestRequest, SuggestResponse, RagRequest, RagResponse, RagResult, SuggestCandidate } from '../lib/types'

// Convert RAG API response to our internal format
const convertRagToSuggest = (ragResponse: RagResponse): SuggestResponse => {
  const candidates: SuggestCandidate[] = ragResponse.results.map((result: RagResult) => {
    // Handle both single itemNum and multiple itemNums
    const code = result.itemNum || (result.itemNums ? result.itemNums.join(', ') : 'Unknown');
    
    return {
      code,
      title: result.title,
      score: result.match_score,
      short_explain: result.match_reason,
      feature_hits: [`Fee: $${result.fee}`, `Benefit: $${result.benefit}`]
    };
  });

  return {
    candidates,
    signals: {
      duration: 0,
      mode: 'rag',
      after_hours: false,
      chronic: false
    }
  };
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const [note, setNote] = useState('')
  const [topN, setTopN] = useState<number>(5)
  const [response, setResponse] = useState<SuggestResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [showJson, setShowJson] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!note.trim()) {
      setError('Please enter a clinical note')
      return
    }

    setLoading(true)
    setError(null)
    setResponse(null)
    setStatus(null)
    setLatencyMs(null)

    try {
      // Call external RAG API
      const ragApiUrl = 'https://bedrock-rag-api.onrender.com/rag/query'
      const requestBody: RagRequest = {
        query: note.trim(),
        top: topN > 0 ? topN : 5,
      }

      const started = performance.now()
      const res = await fetch(ragApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      setStatus(res.status)
      const elapsed = performance.now() - started
      setLatencyMs(Math.round(elapsed))

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(
          errorData?.message || `HTTP ${res.status}: ${res.statusText}`
        )
      }

      const ragData: RagResponse = await res.json()
      // Convert RAG response to our internal format
      const convertedData = convertRagToSuggest(ragData)
      setResponse(convertedData)
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
    setStatus(null)
    setLatencyMs(null)
  }

  return (
    <div className="space-y-8">
      {/* Form Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          MBS Item Suggestions
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">
              Clinical Note
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter clinical scenario or consultation notes here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={6}
              disabled={loading}
            />
            <div className="mt-2 text-sm text-gray-500">
              Example: "30 minute telehealth consultation for chronic diabetes management and medication review"
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
            <div className="flex-1">
              <label htmlFor="topN" className="block text-sm font-medium text-gray-700 mb-2">
                Number of Suggestions
              </label>
              <select
                id="topN"
                value={topN}
                onChange={(e) => setTopN(parseInt(e.target.value))}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={1}>1 suggestion</option>
                <option value={3}>3 suggestions</option>
                <option value={5}>5 suggestions</option>
              </select>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || !note.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Get Suggestions'}
              </button>
              
              <button
                type="button"
                onClick={clearForm}
                disabled={loading}
                className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white font-medium py-2 px-6 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:cursor-not-allowed"
              >
                Clear
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Status Section */}
      {(status !== null || latencyMs !== null) && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              {status !== null && (
                <span className={`font-medium ${status === 200 || status === 201 ? 'text-green-600' : 'text-red-600'}`}>
                  Status: {status}
                </span>
              )}
              {latencyMs !== null && (
                <span>Response time: {latencyMs}ms</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Section */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {response && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Suggestions
              </h3>
              <div className="text-sm text-gray-600">
                From <code className="bg-gray-100 px-1 rounded">POST /rag/query</code> 
              </div>
            </div>

            <button
              onClick={() => setShowJson(!showJson)}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded"
            >
              {showJson ? 'Hide JSON' : 'Show JSON'}
            </button>
          </div>

          {showJson ? (
            <pre className="bg-gray-50 p-4 rounded-md overflow-auto text-sm">
              {JSON.stringify(response, null, 2)}
            </pre>
          ) : (
            <div className="space-y-4">
              {response.candidates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No suggestions found for this query.</p>
                </div>
              ) : (
                response.candidates.map((candidate, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-semibold text-blue-600">
                            {candidate.code}
                          </span>
                          <span className="text-sm bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                            Score: {candidate.score.toFixed(3)}
                          </span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2">
                          {candidate.title}
                        </h4>
                        {candidate.short_explain && (
                          <p className="text-sm text-gray-600 mb-2">
                            {candidate.short_explain}
                          </p>
                        )}
                        {candidate.feature_hits && candidate.feature_hits.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {candidate.feature_hits.map((hit, hitIndex) => (
                              <span
                                key={hitIndex}
                                className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                              >
                                {hit}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">
              RAG Integration Active
            </h3>
            <div className="mt-1 text-sm text-green-700">
              This application is now powered by an external RAG (Retrieval-Augmented Generation) API that provides
              real-time MBS item suggestions based on clinical scenarios. The system retrieves relevant information
              and generates accurate recommendations with match scores and explanations.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}