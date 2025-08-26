#!/usr/bin/env ts-node

/**
 * Supabase Seed Script for MBSPro
 * Populates the mbs_items table with sample data
 * 
 * Usage: pnpm seed:supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Resolve and load items from unified JSON under data/mbs_seed.json
function resolveSeedFile(): string {
  const override = process.env.SEED_JSON_PATH;
  const candidates = [
    // Explicit override
    override ? path.resolve(process.cwd(), override) : null,
    // Common locations
    path.resolve(process.cwd(), 'data', 'mbs_seed.json'),
    // Repo root: ../../../../ from src/seed/
    path.resolve(__dirname, '../../../..', 'data', 'mbs_seed.json'),
    // Inside API folder (optional local data copy): ../../ from src/seed/
    path.resolve(__dirname, '../..', 'data', 'mbs_seed.json'),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  console.error('Missing data file. Tried paths:\n' + candidates.map((p) => ` - ${p}`).join('\n'));
  process.exit(1);
}

function loadSeedItems(): any[] {
  const file = resolveSeedFile();
  console.log(`Using seed JSON: ${file}`);
  const raw = fs.readFileSync(file, 'utf-8');
  const json = JSON.parse(raw);
  if (!Array.isArray(json)) {
    console.error('Seed JSON must be an array of items');
    process.exit(1);
  }
  // Map fields to Supabase schema keys
  return json.map((it) => ({
    code: it.code,
    title: it.title,
    description: it.desc ?? it.description ?? '',
    fee: it.fee ?? 0,
    time_threshold: it.timeThreshold ?? it.time_threshold ?? null,
    flags: it.flags ?? {},
    mutually_exclusive_with: it.mutuallyExclusiveWith ?? it.mutually_exclusive_with ?? [],
    reference_docs: it.references ?? it.reference_docs ?? [],
  }));
}

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

    // Load from unified JSON, then upsert on primary key 'code'
    const sampleMbsItems = loadSeedItems();
    console.log(`Loaded ${sampleMbsItems.length} items from data/mbs_seed.json`);

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
