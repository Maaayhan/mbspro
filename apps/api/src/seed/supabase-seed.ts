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
  // 原有數據
  {
    code: '23',
    title: 'Professional attendance by a general practitioner',
    description: 'Professional attendance by a general practitioner at consulting rooms',
    fee: 41.20,
    time_threshold: 20,
    flags: { telehealth: true, after_hours: false },
    mutually_exclusive_with: ['24', '25'],
    reference_docs: ['MBS Guidelines 2023', 'Clinical Notes']
  },
  {
    code: '24',
    title: 'Professional attendance by a general practitioner - after hours',
    description: 'Professional attendance by a general practitioner at consulting rooms after hours',
    fee: 82.40,
    time_threshold: 40,
    flags: { telehealth: false, after_hours: true },
    mutually_exclusive_with: ['23', '25'],
    reference_docs: ['MBS Guidelines 2023', 'After Hours Guidelines']
  },
  {
    code: '25',
    title: 'Professional attendance by a general practitioner - weekend',
    description: 'Professional attendance by a general practitioner at consulting rooms on weekend',
    fee: 123.60,
    time_threshold: 60,
    flags: { telehealth: false, after_hours: true, weekend: true },
    mutually_exclusive_with: ['23', '24'],
    reference_docs: ['MBS Guidelines 2023', 'Weekend Guidelines']
  },
  // 新增測試數據 - 各種醫療服務
  {
    code: '3',
    title: 'Professional attendance by a specialist physician',
    description: 'Professional attendance by a specialist physician in consulting rooms',
    fee: 156.80,
    time_threshold: 45,
    flags: { telehealth: true, specialist: true, urgent: false },
    mutually_exclusive_with: ['4', '5'],
    reference_docs: ['Specialist Guidelines 2023', 'Consultation Standards']
  },
  {
    code: '36',
    title: 'General practitioner consultation - urgent after hours',
    description: 'Urgent professional attendance by a general practitioner after hours for acute conditions',
    fee: 205.60,
    time_threshold: 60,
    flags: { telehealth: true, after_hours: true, urgent: true },
    mutually_exclusive_with: ['23', '24', '25'],
    reference_docs: ['Urgent Care Guidelines', 'Emergency Protocols']
  },
  {
    code: '721',
    title: 'Child health check - 4 year old',
    description: 'Health assessment for children aged 4 years including developmental screening',
    fee: 89.95,
    time_threshold: 30,
    flags: { pediatric: true, preventive: true, telehealth: false },
    mutually_exclusive_with: [],
    reference_docs: ['Pediatric Guidelines 2023', 'Child Health Schedule']
  },
  {
    code: '2713',
    title: 'Mental health consultation - psychologist',
    description: 'Professional attendance by a registered psychologist for mental health assessment',
    fee: 134.20,
    time_threshold: 50,
    flags: { mental_health: true, allied_health: true, telehealth: true },
    mutually_exclusive_with: [],
    reference_docs: ['Mental Health Guidelines', 'Psychology Board Standards']
  },
  {
    code: '10990',
    title: 'COVID-19 vaccination',
    description: 'Administration of COVID-19 vaccine including pre-vaccination assessment',
    fee: 0.00,
    time_threshold: 15,
    flags: { vaccination: true, preventive: true, bulk_billed: true },
    mutually_exclusive_with: [],
    reference_docs: ['COVID-19 Guidelines', 'Vaccine Protocols']
  },
  {
    code: '735',
    title: 'Home visit - general practitioner',
    description: 'Professional attendance by a general practitioner at the patient\'s place of residence',
    fee: 102.30,
    time_threshold: 40,
    flags: { home_visit: true, mobility_impaired: true, telehealth: false },
    mutually_exclusive_with: ['23', '24', '25'],
    reference_docs: ['Home Visit Guidelines', 'Domiciliary Care Standards']
  }
];

async function ensureTableExists() {
  // Rely on schema.sql being applied. Optionally, a noop select to verify access.
  const { error } = await supabase.from('mbs_items').select('code').limit(1);
  if (error) {
    console.warn('mbs_items table might not exist or is not accessible. Please run supabase/schema.sql in SQL Editor.');
  }
}

async function seedSupabase() {
  try {
    console.log('Starting Supabase seed (idempotent upsert)...');

    await ensureTableExists();

    // Upsert on primary key 'code' to be idempotent
    const { data, error } = await supabase
      .from('mbs_items')
      .upsert(sampleMbsItems, { onConflict: 'code' })
      .select();

    if (error) {
      console.error('Error upserting sample data:', error);
      process.exit(1);
    }

    console.log(`Upserted ${data?.length || 0} rows into mbs_items`);

    // Verify count >= 3
    const { count, error: countError } = await supabase
      .from('mbs_items')
      .select('code', { count: 'exact', head: true });

    if (countError) {
      console.warn('Could not verify row count:', countError);
    } else {
      console.log(`mbs_items row count: ${count}`);
    }

    console.log('Seed completed successfully!');
  } catch (error) {
    console.error('Unexpected error during seeding:', error);
    process.exit(1);
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
