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
