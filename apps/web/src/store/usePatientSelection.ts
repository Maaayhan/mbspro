'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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

interface PatientSelectionStore {
  selectedPatient: Patient | null
  setSelectedPatient: (patient: Patient | null) => void
  clearSelection: () => void
}

export const usePatientSelection = create<PatientSelectionStore>()(
  persist(
    (set) => ({
      selectedPatient: null,
      setSelectedPatient: (patient) => set({ selectedPatient: patient }),
      clearSelection: () => set({ selectedPatient: null }),
    }),
    {
      name: 'patient-selection',
    }
  )
)