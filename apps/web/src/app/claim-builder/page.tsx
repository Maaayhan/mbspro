'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import DocumentViewer from '@/components/DocumentViewer'
import { useClaimDraft } from '@/store/useClaimDraft'
import { usePatients, usePractitioners } from '@/hooks/useSupabaseData'
import { useDocumentGeneration } from '@/hooks/useDocumentGeneration'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import type { GenerateDocResponse } from '@mbspro/shared'

// Types
interface ClaimItem {
  code: string
  title: string
  fee: number
  quantity: number
  date: string
  modifiers: string[]
}

interface ComplianceCheck {
  category: string
  status: 'pass' | 'warning' | 'fail'
  message: string
  details: string
}

export default function ClaimBuilderPage() {
  const { draft, clear } = useClaimDraft()
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  
  // Document generation state
  const [generatedDoc, setGeneratedDoc] = useState<GenerateDocResponse | null>(null)
  const [showDocViewer, setShowDocViewer] = useState(false)
  
  // Loading states for different document types
  const [referralLoading, setReferralLoading] = useState(false)
  const [carePlanLoading, setCarePlanLoading] = useState(false)
  
  // Data hooks
  const { patients, loading: patientsLoading } = usePatients()
  const { practitioners, loading: practitionersLoading } = usePractitioners()
  const { generateDocument, loading: docLoading, error: docError } = useDocumentGeneration({
    onSuccess: (doc) => {
      setGeneratedDoc(doc)
      setShowDocViewer(true)
      setReferralLoading(false)
      setCarePlanLoading(false)
    },
    onError: (error) => {
      alert(`Failed to generate document: ${error}`)
      setReferralLoading(false)
      setCarePlanLoading(false)
    }
  })

  // Add this useEffect to monitor draft.notes
  useEffect(() => {
    console.log('Current draft notes:', draft.notes);
  }, [draft.notes]);

  // Check for expired draft on mount
  useEffect(() => {
    if (draft.meta?.updatedAt) {
      const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
      if (draft.meta.updatedAt < threeDaysAgo) {
        clear() // Auto-clear expired draft
      }
    }
  }, [draft.meta?.updatedAt, clear])

  // Use items from global draft, or empty array if no draft
  const claimItems: ClaimItem[] = draft.selected.length > 0 
    ? draft.selected.map(item => ({
        code: item.code,
        title: item.title,
        fee: parseFloat(item.fee || '0'),
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        modifiers: []
      }))
    : []

  // Use quick rules from global draft, or fallback to sample data
  const complianceChecks: ComplianceCheck[] = draft.quickRules.length > 0
    ? draft.quickRules.map(rule => ({
        category: rule.name,
        status: rule.status === 'ok' ? 'pass' : rule.status,
        message: rule.reason,
        details: `Quick check: ${rule.id}`
      }))
    : [
        {
          category: 'Documentation',
          status: 'pass',
          message: 'All required clinical notes are present',
          details: 'SOAP notes complete with assessment and plan'
        },
        {
          category: 'Time Intervals',
          status: 'pass',
          message: 'Appropriate intervals between services',
          details: 'No conflicts with previous claims'
        },
        {
          category: 'Clinical Indicators',
          status: 'warning',
          message: 'Verify chest X-ray clinical justification',
          details: 'Ensure symptoms support imaging requirement'
        },
        {
          category: 'Patient Demographics',
          status: 'pass',
          message: 'Patient age and eligibility confirmed',
          details: 'Medicare number validated'
        }
      ]

  const handleSubmitClaim = () => {
    // Simulate successful claim submission
    alert('Claim submitted successfully!')
    clear() // Clear draft after successful submission
  }

  const generateJSON = () => {
    return JSON.stringify({
      claim: {
        claimId: "CLM-2024-001523",
        provider: {
          id: "GP12345",
          name: "Dr. Sarah Smith",
          practice: "City Medical Centre"
        },
        patient: {
          id: "PT78901",
          medicare: "2123456781",
          name: "John Patterson",
          dob: "1978-03-15"
        },
        items: claimItems.map(item => ({
          code: item.code,
          description: item.title,
          fee: item.fee,
          quantity: item.quantity,
          serviceDate: item.date
        })),
        totalFee: claimItems.reduce((sum, item) => sum + (item.fee * item.quantity), 0),
        submissionDate: new Date().toISOString().split('T')[0]
      }
    }, null, 2)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
      case 'fail':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'fail':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateJSON())
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy JSON:', err)
    }
  }

  const handleGenerateDocument = async (docType: 'referral' | 'care_plan') => {
    if (!selectedPatient || !selectedProvider) {
      alert('Please select a patient and provider')
      return
    }

    if (!draft.notes) {
      alert('Please add clinical notes')
      return
    }

    if (draft.selected.length === 0) {
      alert('Please select at least one MBS item')
      return
    }

    // Reset loading states and set the specific loading state
    setReferralLoading(docType === 'referral')
    setCarePlanLoading(docType === 'care_plan')

    try {
      await generateDocument({
        docType,
        patientId: selectedPatient,
        practitionerId: selectedProvider,
        clinicalNotes: draft.notes,
        selectedItems: draft.selected.map(item => ({
          code: item.code,
          title: item.title,
          fee: item.fee,
          description: item.description
        })),
        extras: {}
      })
    } catch (error) {
      console.error('Document generation error:', error)
      alert(`Document generation failed: ${error}`)
      setReferralLoading(false)
      setCarePlanLoading(false)
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Claim Builder</h1>
            <p className="text-gray-600">Review and finalize your Medicare claim</p>
          </div>
          <div className="flex space-x-3">
            <button 
              onClick={() => handleGenerateDocument('referral')}
              disabled={referralLoading}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <DocumentTextIcon className="mr-2 h-4 w-4" />
              {referralLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </div>
              ) : (
                'Generate Referral'
              )}
            </button>
            <button 
              onClick={() => handleGenerateDocument('care_plan')}
              disabled={carePlanLoading}
              className="btn-secondary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ClipboardDocumentListIcon className="mr-2 h-4 w-4" />
              {carePlanLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </div>
              ) : (
                'Generate Care Plan'
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Clinical Notes Summary - Always show if there are selected items */}
            {(draft.notes || draft.selected.length > 0) && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Your Clinical Notes</h2>
                  <Link
                    href="/suggestions"
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    ← Back to Suggestions
                  </Link>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                  {draft.notes ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{draft.notes}</p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No clinical notes entered yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Patient & Provider Selection */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient & Provider Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                  <select 
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    disabled={patientsLoading}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {patientsLoading ? 'Loading patients...' : 'Select patient...'}
                    </option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name} 
                        {patient.medicare_number && ` (Medicare: ${patient.medicare_number})`}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                  <select 
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    disabled={practitionersLoading}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {practitionersLoading ? 'Loading practitioners...' : 'Select provider...'}
                    </option>
                    {practitioners.map((practitioner) => (
                      <option key={practitioner.id} value={practitioner.id}>
                        {practitioner.full_name}
                        {practitioner.specialty && ` (${practitioner.specialty})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Claim Items Table */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Claim Items</h2>
                <div className="flex space-x-2">
                  <Link
                    href="/suggestions"
                    className="inline-flex items-center px-3 py-2 border border-primary-600 text-sm font-medium rounded-md text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    AI Suggestions
                  </Link>
                  <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                    <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                    Manual Import
                  </button>
                </div>
              </div>
              
              {claimItems.length === 0 ? (
                <div className="text-center py-12">
                  <DocumentDuplicateIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items selected</h3>
                  <p className="text-gray-500 mb-4">Go to AI Suggestions or Manual Import to select MBS items for your claim</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">MBS Code</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Description</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Fee</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Qty</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Date</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claimItems.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-3 px-2">
                            <span className="bg-primary-100 text-primary-800 text-sm font-medium px-2 py-1 rounded">
                              {item.code}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-900">{item.title}</td>
                          <td className="py-3 px-2 text-sm text-gray-900">${item.fee.toFixed(2)}</td>
                          <td className="py-3 px-2">
                            <input 
                              type="number" 
                              defaultValue={item.quantity} 
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-3 px-2">
                            <input 
                              type="date" 
                              defaultValue={item.date} 
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-3 px-2 text-sm font-medium text-gray-900">
                            ${(item.fee * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-gray-300">
                        <td colSpan={7} className="py-3 px-2 text-sm font-medium text-gray-900">
                          Total Claim Value:
                        </td>
                        <td className="py-3 px-2 text-lg font-bold text-gray-900">
                          ${claimItems.reduce((sum, item) => sum + (item.fee * item.quantity), 0).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Compliance Check Panel */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Check</h3>
              
              <div className="space-y-3">
                {complianceChecks.map((check, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${getStatusColor(check.status)}`}>
                    <div className="flex items-start space-x-3">
                      {getStatusIcon(check.status)}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900">{check.category}</h4>
                        <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{check.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Overall Status */}
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-800">Ready to Submit</span>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Claim passes all compliance checks with 1 minor warning to review.
                </p>
              </div>
            </div>

            {/* JSON Preview */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Claim Preview</h3>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center space-x-1 text-primary-600 hover:text-primary-700"
                >
                  <DocumentDuplicateIcon className="h-4 w-4" />
                  <span className="text-sm">Copy JSON</span>
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 max-h-80 overflow-y-auto">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                  {generateJSON()}
                </pre>
              </div>
              
              <div className="mt-4 space-y-2">
                <button 
                  onClick={handleSubmitClaim}
                  className="btn-primary w-full"
                >
                  Submit Claim
                </button>
                <button className="btn-secondary w-full">
                  Save as Draft
                </button>
                <button
                  onClick={clear}
                  className="w-full text-center text-sm text-red-600 hover:text-red-700 py-2"
                >
                  🗑️ Discard Draft
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Document Viewer Modal */}
        {generatedDoc && (
          <DocumentViewer
            document={generatedDoc}
            isOpen={showDocViewer}
            onClose={() => setShowDocViewer(false)}
          />
        )}

        {/* Error Display */}
        {docError && (
          <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
            <div className="flex items-start">
              <XCircleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-medium text-red-800">Document Generation Failed</h3>
                <p className="text-sm text-red-700 mt-1">{docError}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
