'use client'

import { useState, useEffect } from 'react'
import { usePatientSelection } from '@/store/usePatientSelection'

interface Patient {
  id: string
  name: string
  age: number
  provider_type: 'GP' | 'Registrar' | 'NP' | 'Specialist'
  location: 'clinic' | 'home' | 'nursing_home' | 'hospital'
  consult_start: string
  consult_end: string
  hours_bucket: 'business' | 'after_hours' | 'public_holiday'
  referral_present: boolean
  selected_codes: string[]
  last_claimed_items: Array<{ code: string; at: string }>
}

interface PatientSelectorProps {
  onPatientChange?: (patient: Patient | null) => void
  selectedPatient?: Patient | null
}

export default function PatientSelector({ onPatientChange, selectedPatient: propSelectedPatient }: PatientSelectorProps) {
  // Use shared store if no props provided
  const { selectedPatient: storeSelectedPatient, setSelectedPatient: setStoreSelectedPatient } = usePatientSelection()
  const selectedPatient = propSelectedPatient ?? storeSelectedPatient
  const handlePatientChange = onPatientChange ?? setStoreSelectedPatient
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    loadPatients()
  }, [])

  const loadPatients = async () => {
    try {
      setLoading(true)
      setError(null)
      const apiBase = (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000').replace(/\/$/, '')
      const response = await fetch(`${apiBase}/api/patients`)
      
      if (!response.ok) {
        throw new Error(`Failed to load patients: ${response.status}`)
      }
      
      const data = await response.json()
      setPatients(data.patients || [])
    } catch (err) {
      console.error('Error loading patients:', err)
      setError(err instanceof Error ? err.message : 'Failed to load patients')
    } finally {
      setLoading(false)
    }
  }

  const handlePatientSelect = (patient: Patient) => {
    handlePatientChange(patient)
    setEditingPatient(null)
    setIsEditing(false)
  }

  const handleEditPatient = (patient: Patient) => {
    setEditingPatient({ ...patient })
    setIsEditing(true)
  }

  const handleSavePatient = () => {
    if (editingPatient) {
      handlePatientChange(editingPatient)
      setEditingPatient(null)
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingPatient(null)
    setIsEditing(false)
  }

  // Add keyboard escape key handler
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isEditing) {
        handleCancelEdit()
      }
    }

    if (isEditing) {
      document.addEventListener('keydown', handleEscapeKey)
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
      document.body.style.overflow = 'unset'
    }
  }, [isEditing])

  const updateEditingPatient = (field: keyof Patient, value: any) => {
    if (editingPatient) {
      setEditingPatient({ ...editingPatient, [field]: value })
    }
  }

  const updateLastClaimedItem = (index: number, field: 'code' | 'at', value: string) => {
    if (editingPatient && editingPatient.last_claimed_items) {
      const updatedItems = [...editingPatient.last_claimed_items]
      updatedItems[index] = { ...updatedItems[index], [field]: value }
      updateEditingPatient('last_claimed_items', updatedItems)
    }
  }

  const addLastClaimedItem = () => {
    if (editingPatient) {
      const newItem = { code: '', at: new Date().toISOString() }
      const updatedItems = [...(editingPatient.last_claimed_items || []), newItem]
      updateEditingPatient('last_claimed_items', updatedItems)
    }
  }

  const removeLastClaimedItem = (index: number) => {
    if (editingPatient && editingPatient.last_claimed_items) {
      const updatedItems = editingPatient.last_claimed_items.filter((_, i) => i !== index)
      updateEditingPatient('last_claimed_items', updatedItems)
    }
  }

  const updateSelectedCode = (index: number, value: string) => {
    if (editingPatient) {
      const updatedCodes = [...editingPatient.selected_codes]
      updatedCodes[index] = value
      updateEditingPatient('selected_codes', updatedCodes)
    }
  }

  const addSelectedCode = () => {
    if (editingPatient) {
      const updatedCodes = [...editingPatient.selected_codes, '']
      updateEditingPatient('selected_codes', updatedCodes)
    }
  }

  const removeSelectedCode = (index: number) => {
    if (editingPatient) {
      const updatedCodes = editingPatient.selected_codes.filter((_, i) => i !== index)
      updateEditingPatient('selected_codes', updatedCodes)
    }
  }

  if (loading) {
    return (
      <div className="card max-w-4xl mx-auto">
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading patients...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error Loading Patients</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
              <button
                onClick={loadPatients}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card max-w-4xl mx-auto">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Patient Selection & Context</h3>
        <p className="text-sm text-gray-600">
          Select a patient to test rule engine validation with their clinical context
        </p>
      </div>

      {/* Patient List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-700">Available Patients</h4>
          <div className="flex space-x-2">
            {selectedPatient && (
              <button
                onClick={() => handlePatientChange(null)}
                className="btn-secondary text-sm"
              >
                Clear Selection
              </button>
            )}
            <button
              onClick={loadPatients}
              className="btn-secondary text-sm"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {!selectedPatient && (
          <div className="mb-3 p-3 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <div className="text-center text-gray-600">
              <div className="text-sm font-medium">No Patient Selected</div>
              <div className="text-xs mt-1">Optional fields will not be populated for rule engine validation</div>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                selectedPatient?.id === patient.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handlePatientSelect(patient)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{patient.name}</div>
                  <div className="text-sm text-gray-600">
                    {patient.age}yo • {patient.provider_type} • {patient.location}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {patient.referral_present ? 'Has referral' : 'No referral'} • {patient.hours_bucket}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditPatient(patient)
                  }}
                  className="btn-secondary text-xs"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Patient Details */}
      {selectedPatient && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-medium text-gray-700">Selected Patient Context</h4>
            <button
              onClick={() => handleEditPatient(selectedPatient)}
              className="btn-secondary text-sm"
            >
              Edit Context
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-700">Patient Info</div>
              <div className="text-gray-600">
                <div>{selectedPatient.name} ({selectedPatient.age} years old)</div>
                <div>Provider: {selectedPatient.provider_type}</div>
                <div>Location: {selectedPatient.location}</div>
                <div>Referral: {selectedPatient.referral_present ? 'Present' : 'Not present'}</div>
                <div>Hours: {selectedPatient.hours_bucket}</div>
              </div>
            </div>
            
            <div>
              <div className="font-medium text-gray-700">Consultation</div>
              <div className="text-gray-600">
                <div>Start: {new Date(selectedPatient.consult_start).toLocaleString()}</div>
                <div>End: {new Date(selectedPatient.consult_end).toLocaleString()}</div>
                <div>Selected Codes: {selectedPatient.selected_codes.length > 0 ? selectedPatient.selected_codes.join(', ') : 'None'}</div>
                <div>Last Claims: {selectedPatient.last_claimed_items.length} items</div>
              </div>
            </div>
          </div>
        </div>
      )}

             {/* Edit Modal */}
       {isEditing && editingPatient && (
         <div className="fixed inset-0 z-50">
           <div className="absolute inset-0 bg-black/30" onClick={handleCancelEdit} />
           <div className="absolute inset-0 flex items-center justify-center p-4">
             <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
               {/* Fixed Header */}
               <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                 <h3 className="text-lg font-semibold text-gray-900">Edit Patient Context</h3>
                 <button
                   onClick={handleCancelEdit}
                   className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                   title="Close (Esc)"
                 >
                   <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                   </svg>
                 </button>
               </div>

               {/* Scrollable Content */}
               <div 
                 className="flex-1 overflow-y-auto p-6" 
                 style={{ 
                   maxHeight: '60vh',
                   scrollbarWidth: 'thin',
                   scrollbarColor: '#cbd5e0 #f7fafc'
                 }}
               >
                 <div className="space-y-4">
                   {/* Basic Info */}
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="form-label">Name</label>
                       <input
                         type="text"
                         className="form-input"
                         value={editingPatient.name}
                         onChange={(e) => updateEditingPatient('name', e.target.value)}
                       />
                     </div>
                     <div>
                       <label className="form-label">Age</label>
                       <input
                         type="number"
                         className="form-input"
                         value={editingPatient.age}
                         onChange={(e) => updateEditingPatient('age', parseInt(e.target.value))}
                       />
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="form-label">Provider Type</label>
                       <select
                         className="form-input"
                         value={editingPatient.provider_type}
                         onChange={(e) => updateEditingPatient('provider_type', e.target.value)}
                       >
                         <option value="GP">GP</option>
                         <option value="Registrar">Registrar</option>
                         <option value="NP">NP</option>
                         <option value="Specialist">Specialist</option>
                       </select>
                     </div>
                     <div>
                       <label className="form-label">Location</label>
                       <select
                         className="form-input"
                         value={editingPatient.location}
                         onChange={(e) => updateEditingPatient('location', e.target.value)}
                       >
                         <option value="clinic">Clinic</option>
                         <option value="home">Home</option>
                         <option value="nursing_home">Nursing Home</option>
                         <option value="hospital">Hospital</option>
                       </select>
                     </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="form-label">Hours Bucket</label>
                       <select
                         className="form-input"
                         value={editingPatient.hours_bucket}
                         onChange={(e) => updateEditingPatient('hours_bucket', e.target.value)}
                       >
                         <option value="business">Business Hours</option>
                         <option value="after_hours">After Hours</option>
                         <option value="public_holiday">Public Holiday</option>
                       </select>
                     </div>
                     <div className="flex items-center">
                       <label className="flex items-center">
                         <input
                           type="checkbox"
                           className="form-checkbox mr-2"
                           checked={editingPatient.referral_present}
                           onChange={(e) => updateEditingPatient('referral_present', e.target.checked)}
                         />
                         Referral Present
                       </label>
                     </div>
                   </div>

                   {/* Selected Codes */}
                   <div>
                     <div className="flex items-center justify-between mb-2">
                       <label className="form-label">Selected Codes</label>
                       <button
                         type="button"
                         onClick={addSelectedCode}
                         className="btn-secondary text-xs"
                       >
                         Add Code
                       </button>
                     </div>
                     <div className="space-y-2">
                       {editingPatient.selected_codes.map((code, index) => (
                         <div key={index} className="flex items-center gap-2">
                           <input
                             type="text"
                             className="form-input flex-1"
                             placeholder="Enter MBS code"
                             value={code}
                             onChange={(e) => updateSelectedCode(index, e.target.value)}
                           />
                           <button
                             type="button"
                             onClick={() => removeSelectedCode(index)}
                             className="btn-secondary text-xs"
                           >
                             Remove
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>

                   {/* Last Claimed Items */}
                   <div>
                     <div className="flex items-center justify-between mb-2">
                       <label className="form-label">Last Claimed Items</label>
                       <button
                         type="button"
                         onClick={addLastClaimedItem}
                         className="btn-secondary text-xs"
                       >
                         Add Item
                       </button>
                     </div>
                     <div className="space-y-2">
                       {editingPatient.last_claimed_items.map((item, index) => (
                         <div key={index} className="grid grid-cols-3 gap-2">
                           <input
                             type="text"
                             className="form-input"
                             placeholder="MBS code"
                             value={item.code}
                             onChange={(e) => updateLastClaimedItem(index, 'code', e.target.value)}
                           />
                           <input
                             type="datetime-local"
                             className="form-input"
                             value={item.at.slice(0, 16)}
                             onChange={(e) => updateLastClaimedItem(index, 'at', new Date(e.target.value).toISOString())}
                           />
                           <button
                             type="button"
                             onClick={() => removeLastClaimedItem(index)}
                             className="btn-secondary text-xs"
                           >
                             Remove
                           </button>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               </div>

               {/* Fixed Footer with Action Buttons */}
               <div className="border-t border-gray-200 bg-gray-50 p-6 rounded-b-lg">
                 <div className="flex justify-between items-center">
                   <button
                     onClick={handleCancelEdit}
                     className="text-gray-500 hover:text-gray-700 underline text-sm"
                     title="Close without saving (Esc)"
                   >
                     Close without saving
                   </button>
                   <div className="flex space-x-3">
                     <button
                       onClick={handleCancelEdit}
                       className="btn-secondary"
                     >
                       Cancel
                     </button>
                     <button
                       onClick={handleSavePatient}
                       className="btn-primary"
                     >
                       Save Changes
                     </button>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  )
}
