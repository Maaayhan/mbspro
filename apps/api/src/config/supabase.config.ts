import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Determine which key to use (prefer service role for server-side operations)
const supabaseKeyToUse = supabaseServiceKey || supabaseAnonKey;

// Validate configuration
const isConfigured = Boolean(supabaseUrl && supabaseKeyToUse);

// Enhanced no-op client for better error handling
function createNoopClient(): Partial<SupabaseClient> {
  const error = new Error('Supabase is not configured. Please check your environment variables.');

  return {
    from: () => ({
      select: () => Promise.reject(error),
      insert: () => Promise.reject(error),
      update: () => Promise.reject(error),
      delete: () => Promise.reject(error),
      upsert: () => Promise.reject(error),
      limit: function() { return this; },
      order: function() { return this; },
      eq: function() { return this; },
      neq: function() { return this; },
      gt: function() { return this; },
      gte: function() { return this; },
      lt: function() { return this; },
      lte: function() { return this; },
      like: function() { return this; },
      ilike: function() { return this; },
      or: function() { return this; },
      and: function() { return this; },
      not: function() { return this; },
      is: function() { return this; },
      in: function() { return this; },
      contains: function() { return this; },
      containedBy: function() { return this; },
      range: function() { return this; },
      overlaps: function() { return this; },
      textSearch: function() { return this; },
      match: function() { return this; },
      filter: function() { return this; },
    }),
    rpc: () => Promise.reject(error),
    auth: {
      signUp: () => Promise.reject(error),
      signIn: () => Promise.reject(error),
      signOut: () => Promise.reject(error),
      getUser: () => Promise.reject(error),
      getSession: () => Promise.reject(error),
    },
    storage: {
      from: () => ({
        upload: () => Promise.reject(error),
        download: () => Promise.reject(error),
        remove: () => Promise.reject(error),
        list: () => Promise.reject(error),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
      }),
    },
  } as any;
}

// Create Supabase client with proper configuration
export const supabaseClient = isConfigured
  ? createClient(supabaseUrl as string, supabaseKeyToUse as string, {
      auth: {
        persistSession: false, // Server-side, don't persist sessions
        autoRefreshToken: false, // Disable auto refresh for server
      },
      global: {
        headers: {
          'x-application-name': 'mbspro-api',
        },
      },
      // Enable real-time subscriptions if needed
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : createNoopClient();

// Configuration object for easy access to settings
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  serviceKey: supabaseServiceKey,
  keyType: supabaseServiceKey ? 'service_role' : (supabaseAnonKey ? 'anon' : 'none'),
  enabled: isConfigured,
};

// Export individual values for convenience
export const supabaseEnabled = isConfigured;
export const supabaseUrlValue = supabaseUrl;
export const supabaseKeyValue = supabaseKeyToUse;
