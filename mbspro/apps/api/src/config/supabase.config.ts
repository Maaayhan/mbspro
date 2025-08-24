import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// When env vars are missing (local dev without Supabase), provide a no-op client
function createNoopClient() {
  const noopResult = Promise.resolve({ data: [], error: new Error('Supabase is not configured') });
  return {
    from: () => ({
      select: () => ({
        limit: () => ({ data: [], error: new Error('Supabase is not configured') }),
      }),
    }),
    rpc: async () => ({ data: [], error: new Error('Supabase is not configured') }),
  } as any;
}

export const supabaseEnabled = Boolean(supabaseUrl && supabaseKey);
export const supabaseClient = supabaseEnabled
  ? createClient(supabaseUrl as string, supabaseKey as string)
  : createNoopClient();

export const supabaseConfig = {
  url: supabaseUrl,
  key: supabaseKey,
  enabled: supabaseEnabled,
};
