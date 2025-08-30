'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ClaimBuilderSelections {
  selectedPatientId: string
  selectedProviderId: string
  setSelectedPatient: (patientId: string) => void
  setSelectedProvider: (providerId: string) => void
  clear: () => void
}

export const useClaimBuilderSelections = create<ClaimBuilderSelections>()(
  persist(
    (set) => ({
      selectedPatientId: '',
      selectedProviderId: '',
      setSelectedPatient: (patientId) => set({ selectedPatientId: patientId }),
      setSelectedProvider: (providerId) => set({ selectedProviderId: providerId }),
      clear: () => set({ selectedPatientId: '', selectedProviderId: '' }),
    }),
    {
      name: 'mbspro-claim-builder-selections',
    }
  )
)
