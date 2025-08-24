#!/usr/bin/env ts-node

/**
 * Supabase Seed Script for MBSPro
 * Populates the mbs_items table with sample data
 * 
 * Usage: pnpm seed:supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sampleMbsItems = [
  {
    code: '23',
    title: 'Professional attendance by a general practitioner',
    description: 'Professional attendance by a general practitioner at consulting rooms',
    fee: 41.20,
    time_threshold: 20,
    flags: { telehealth: true, after_hours: false },
    mutually_exclusive_with: ['24', '25'],
    reference_materials: ['MBS Guidelines 2023', 'Clinical Notes']
  },
  {
    code: '24',
    title: 'Professional attendance by a general practitioner - after hours',
    description: 'Professional attendance by a general practitioner at consulting rooms after hours',
    fee: 82.40,
    time_threshold: 40,
    flags: { telehealth: false, after_hours: true },
    mutually_exclusive_with: ['23', '25'],
    reference_materials: ['MBS Guidelines 2023', 'After Hours Guidelines']
  },
  {
    code: '25',
    title: 'Professional attendance by a general practitioner - weekend',
    description: 'Professional attendance by a general practitioner at consulting rooms on weekend',
    fee: 123.60,
    time_threshold: 60,
    flags: { telehealth: false, after_hours: true, weekend: true },
    mutually_exclusive_with: ['23', '24'],
    reference_materials: ['MBS Guidelines 2023', 'Weekend Guidelines']
  },
  {
    code: '36',
    title: 'Professional attendance by a general practitioner - home visit',
    description: 'Professional attendance by a general practitioner at patient\'s home',
    fee: 82.40,
    time_threshold: 40,
    flags: { home_visit: true, after_hours: false },
    mutually_exclusive_with: ['23', '24', '25'],
    reference_materials: ['MBS Guidelines 2023', 'Home Visit Guidelines']
  },
  {
    code: '44',
    title: 'Professional attendance by a general practitioner - emergency',
    description: 'Professional attendance by a general practitioner in emergency situation',
    fee: 123.60,
    time_threshold: 60,
    flags: { emergency: true, after_hours: true },
    mutually_exclusive_with: ['23', '24', '25', '36'],
    reference_materials: ['MBS Guidelines 2023', 'Emergency Guidelines']
  }
];

async function seedSupabase() {
  try {
    console.log('Starting Supabase seed...');

    // Clear existing data
    const { error: deleteError } = await supabase
      .from('mbs_items')
      .delete()
      .neq('code', ''); // Delete all rows

    if (deleteError) {
      console.error('Error clearing existing data:', deleteError);
      return;
    }

    console.log('Cleared existing data');

    // Insert sample data
    const { data, error } = await supabase
      .from('mbs_items')
      .insert(sampleMbsItems)
      .select();

    if (error) {
      console.error('Error inserting sample data:', error);
      return;
    }

    console.log(`Successfully seeded ${data?.length || 0} MBS items`);
    console.log('Seed completed successfully!');

  } catch (error) {
    console.error('Unexpected error during seeding:', error);
  }
}

// Run the seed function
seedSupabase()
  .then(() => {
    console.log('Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed script failed:', error);
    process.exit(1);
  });
