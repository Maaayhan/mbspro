'use client';

import { useState, useEffect } from 'react';
import type { Patient, Practitioner } from '@mbspro/shared';

// Test patient interface for rule engine testing
export interface TestPatient {
  id: string;
  name: string;
  age: number;
  medicare_number?: string;
  provider_type: 'GP' | 'Registrar' | 'NP' | 'Specialist';
  location: 'clinic' | 'home' | 'nursing_home' | 'hospital';
  consult_start: string;
  consult_end: string;
  hours_bucket: 'business' | 'after_hours' | 'public_holiday';
  referral_present: boolean;
  selected_codes: string[];
  last_claimed_items: Array<{ code: string; at: string }>;
}

// Essential test patients for rule engine scenarios
const mockTestPatients: TestPatient[] = [
  // Business hours GP consultation
  {
    id: '26c29bc9-ae3f-4e23-acc9-66a42188420f',
    name: 'Olivia Brown',
    age: 34,
    medicare_number: '3012345678',
    provider_type: 'GP',
    location: 'clinic',
    consult_start: '2024-01-15T09:00:00Z',
    consult_end: '2024-01-15T09:30:00Z',
    hours_bucket: 'business',
    referral_present: false,
    selected_codes: ['23'],
    last_claimed_items: [
      { code: '23', at: '2024-01-10T14:30:00Z' }
    ]
  },
  // After-hours specialist with referral
  {
    id: 'a6afa436-e07e-4eb0-aa8b-ae43123b129c',
    name: 'Liam Smith',
    age: 42,
    medicare_number: '3012345679',
    provider_type: 'Specialist',
    location: 'hospital',
    consult_start: '2024-01-15T18:00:00Z',
    consult_end: '2024-01-15T18:45:00Z',
    hours_bucket: 'after_hours',
    referral_present: true,
    selected_codes: ['92479'],
    last_claimed_items: [
      { code: '92479', at: '2024-01-01T15:00:00Z' }
    ]
  },
  // Nursing home NP consultation
  {
    id: 'aeafbb88-22eb-4bd4-b751-1027e1d5ccb3',
    name: 'Charlotte Wilson',
    age: 49,
    medicare_number: '3012345680',
    provider_type: 'NP',
    location: 'nursing_home',
    consult_start: '2024-01-15T11:00:00Z',
    consult_end: '2024-01-15T11:20:00Z',
    hours_bucket: 'business',
    referral_present: false,
    selected_codes: ['721'],
    last_claimed_items: [
      { code: '721', at: '2024-01-01T10:00:00Z' },
      { code: '721', at: '2024-01-08T14:00:00Z' }
    ]
  },
  // Home visit after-hours
  {
    id: '39465d9a-6fec-4f20-81b3-9218a8195edf',
    name: 'Margaret Harris',
    age: 77,
    medicare_number: '3012345682',
    provider_type: 'GP',
    location: 'home',
    consult_start: '2024-01-15T20:00:00Z',
    consult_end: '2024-01-15T20:25:00Z',
    hours_bucket: 'after_hours',
    referral_present: false,
    selected_codes: ['92121'],
    last_claimed_items: []
  },
  // Pediatric patient
  {
    id: '3109d3f5-4381-4b37-bcc7-6a0e738d9620',
    name: 'Ethan Taylor',
    age: 9,
    medicare_number: '3012345681',
    provider_type: 'GP',
    location: 'clinic',
    consult_start: '2024-01-15T16:00:00Z',
    consult_end: '2024-01-15T16:15:00Z',
    hours_bucket: 'business',
    referral_present: false,
    selected_codes: [],
    last_claimed_items: []
  },
  // Registrar consultation
  {
    id: 'a500634a-3d30-4893-853e-2c43b3ef2b44',
    name: 'Wei Zhang',
    age: 44,
    medicare_number: '3012345683',
    provider_type: 'Registrar',
    location: 'clinic',
    consult_start: '2024-01-15T13:00:00Z',
    consult_end: '2024-01-15T13:25:00Z',
    hours_bucket: 'business',
    referral_present: false,
    selected_codes: [],
    last_claimed_items: []
  },
  // Frequency limit test case
  {
    id: 'f77f155e-e963-4ac3-9fa8-045ec7bc9b2d',
    name: 'Sophie Clarke',
    age: 28,
    medicare_number: '3012345684',
    provider_type: 'Specialist',
    location: 'clinic',
    consult_start: '2024-01-15T10:00:00Z',
    consult_end: '2024-01-15T10:15:00Z',
    hours_bucket: 'business',
    referral_present: true,
    selected_codes: [],
    last_claimed_items: [
      { code: '91827', at: '2024-01-01T14:00:00Z' },
      { code: '91827', at: '2024-01-08T16:00:00Z' },
      { code: '91827', at: '2024-01-12T09:00:00Z' }
    ]
  }
];

const mockPractitioners: Practitioner[] = [
  {
    id: 'abe6e810-ec14-4bee-80d6-58bbff45e4bc',
    full_name: 'Dr Emily Johnson',
    specialty: 'General Practice',
    hpii: '8003612222222222',
    phone: '+61 3 9650 1111'
  },
  {
    id: 'fb252455-c9b1-4696-83a7-9fd7657bea99',
    full_name: 'Dr Daniel Wright',
    specialty: 'General Practice',
    hpii: '8003613333333333',
    phone: '+61 3 9650 2222'
  },
  {
    id: '883e4ead-f6bb-41d0-a968-3e49db455447',
    full_name: 'Mia Collins, NP',
    specialty: 'Nurse Practitioner',
    hpii: '8003614444444444',
    phone: '+61 3 9650 3333'
  },
  {
    id: '876550c7-492c-44d0-80b3-bb2d949eca6b',
    full_name: 'Dr Priya Patel',
    specialty: 'Cardiology',
    hpii: '8003615555555555',
    phone: '+61 3 9650 4444'
  },
  {
    id: 'ef41234c-b1d1-4bdc-b348-b647b9198f9c',
    full_name: 'Dr Ahmed Youssef',
    specialty: 'Respiratory & Sleep',
    hpii: '8003616666666666',
    phone: '+61 3 9650 5555'
  },
  {
    id: 'c40c3d11-af13-4763-93c1-ba95dc93b89e',
    full_name: 'Dr Sarah Nguyen',
    specialty: 'Obstetrics & Gynaecology',
    hpii: '8003617777777777',
    phone: '+61 3 9650 6666'
  },
  {
    id: 'd1676b40-7df2-4f1f-98b6-94c769e3ea71',
    full_name: 'Grace Thompson, MPsych(Clin)',
    specialty: 'Clinical Psychology',
    hpii: '8003618888888888',
    phone: '+61 3 9650 7777'
  },
  {
    id: 'aad7d1d4-6c27-45ef-9c02-6b4d9f340184',
    full_name: 'Emily Park, APD',
    specialty: 'Dietetics',
    hpii: '8003619999999999',
    phone: '+61 3 9650 8888'
  }
];

export function usePatients() {
  const [patients, setPatients] = useState<TestPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        setPatients(mockTestPatients);
        setError(null);
      } catch (err) {
        setError('Failed to load patients');
        console.error('Error fetching patients:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  return { patients, loading, error };
}

// Alias for backward compatibility
export const useTestPatients = usePatients;

export function usePractitioners() {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchPractitioners = async () => {
      try {
        setLoading(true);
        // In a real app, this would be:
        // const { data, error } = await supabase.from('mbs_practitioners').select('id, full_name, specialty, hpii');
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        setPractitioners(mockPractitioners);
        setError(null);
      } catch (err) {
        setError('Failed to load practitioners');
        console.error('Error fetching practitioners:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPractitioners();
  }, []);

  return { practitioners, loading, error };
}
