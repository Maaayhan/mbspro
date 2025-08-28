'use client';

import { useState, useEffect } from 'react';
import type { Patient, Practitioner } from '@mbspro/shared';

// Note: In a real app, you would use Supabase client with anon key
// For now, we'll use mock data that matches the expected structure

// Mock data matching database UUIDs - in production, replace with real Supabase queries
const mockPatients: Patient[] = [
  {
    id: '26c29bc9-ae3f-4e23-acc9-66a42188420f',
    full_name: 'Olivia Brown',
    gender: 'female',
    dob: '1990-04-18',
    medicare_number: '3012345678',
    phone: '+61 3 9666 1234',
    address: '50 Swanston St, Melbourne VIC 3000, AU'
  },
  {
    id: 'a6afa436-e07e-4eb0-aa8b-ae43123b129c',
    full_name: 'Liam Smith',
    gender: 'male',
    dob: '1982-09-05',
    medicare_number: '3012345679',
    phone: '+61 3 9666 2345',
    address: '200 Bourke St, Melbourne VIC 3000, AU'
  },
  {
    id: 'aeafbb88-22eb-4bd4-b751-1027e1d5ccb3',
    full_name: 'Charlotte Wilson',
    gender: 'female',
    dob: '1975-11-22',
    medicare_number: '3012345680',
    phone: '+61 3 9666 3456',
    address: '75 Lonsdale St, Melbourne VIC 3000, AU'
  },
  {
    id: '3109d3f5-4381-4b37-bcc7-6a0e738d9620',
    full_name: 'Ethan Taylor',
    gender: 'male',
    dob: '2015-06-10',
    medicare_number: '3012345681',
    phone: '+61 3 9666 4567',
    address: '12 Flinders St, Melbourne VIC 3000, AU'
  },
  {
    id: '39465d9a-6fec-4f20-81b3-9218a8195edf',
    full_name: 'Margaret Harris',
    gender: 'female',
    dob: '1947-02-14',
    medicare_number: '3012345682',
    phone: '+61 3 9666 5678',
    address: '88 Elizabeth St, Melbourne VIC 3000, AU'
  },
  {
    id: 'a500634a-3d30-4893-853e-2c43b3ef2b44',
    full_name: 'Wei Zhang',
    gender: 'male',
    dob: '1980-11-30',
    medicare_number: '3012345683',
    phone: '+61 3 9666 6789',
    address: '120 La Trobe St, Melbourne VIC 3000, AU'
  },
  {
    id: 'f77f155e-e963-4ac3-9fa8-045ec7bc9b2d',
    full_name: 'Sophie Clarke',
    gender: 'female',
    dob: '1996-07-12',
    medicare_number: '3012345684',
    phone: '+61 3 9666 7890',
    address: '15 Queen St, Melbourne VIC 3000, AU'
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
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate API call
    const fetchPatients = async () => {
      try {
        setLoading(true);
        // In a real app, this would be:
        // const { data, error } = await supabase.from('mbs_patients').select('id, full_name, gender, dob, medicare_number');
        
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        setPatients(mockPatients);
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
