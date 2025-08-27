'use client'

import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

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
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')

  const claimItems: ClaimItem[] = [
    {
      code: '23',
      title: 'Consultation - Level A',
      fee: 41.40,
      quantity: 1,
      date: '2024-01-15',
      modifiers: []
    },
    {
      code: '11700',
      title: 'Electrocardiography',
      fee: 26.55,
      quantity: 1,
      date: '2024-01-15',
      modifiers: []
    },
    {
      code: '58503',
      title: 'Chest X-ray',
      fee: 73.60,
      quantity: 1,
      date: '2024-01-15',
      modifiers: []
    }
  ]

  const complianceChecks: ComplianceCheck[] = [
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
            <button className="btn-secondary flex items-center">
              <DocumentTextIcon className="mr-2 h-4 w-4" />
              Generate Referral
            </button>
            <button className="btn-secondary flex items-center">
              <ClipboardDocumentListIcon className="mr-2 h-4 w-4" />
              Generate Care Plan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient & Provider Selection */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Patient & Provider Details</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
                  <select 
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select patient...</option>
                    <option value="john-patterson">John Patterson (Medicare: 2123456781)</option>
                    <option value="mary-wilson">Mary Wilson (Medicare: 3234567892)</option>
                    <option value="david-brown">David Brown (Medicare: 4345678903)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
                  <select 
                    value={selectedProvider}
                    onChange={(e) => setSelectedProvider(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Select provider...</option>
                    <option value="dr-smith">Dr. Sarah Smith (Provider: GP12345)</option>
                    <option value="dr-jones">Dr. Michael Jones (Provider: GP12346)</option>
                    <option value="dr-davis">Dr. Emily Davis (Provider: GP12347)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Claim Items Table */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Claim Items</h2>
              
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
                      <td colSpan={5} className="py-3 px-2 text-sm font-medium text-gray-900">
                        Total Claim Value:
                      </td>
                      <td className="py-3 px-2 text-lg font-bold text-gray-900">
                        ${claimItems.reduce((sum, item) => sum + (item.fee * item.quantity), 0).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
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
                <button className="btn-primary w-full">
                  Submit Claim
                </button>
                <button className="btn-secondary w-full">
                  Save as Draft
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Items:</span>
                  <span className="text-sm font-medium text-gray-900">{claimItems.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Value:</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${claimItems.reduce((sum, item) => sum + (item.fee * item.quantity), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Patient Rebate:</span>
                  <span className="text-sm font-medium text-gray-900">$95.20</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gap Payment:</span>
                  <span className="text-sm font-medium text-gray-900">$46.35</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
