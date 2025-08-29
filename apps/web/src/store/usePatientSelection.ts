'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TestPatient } from '@/hooks/useSupabaseData'

interface PatientSelectionStore {
  selectedPatient: TestPatient | null
  setSelectedPatient: (patient: TestPatient | null) => void
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