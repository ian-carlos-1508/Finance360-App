import { createClient } from '@supabase/supabase-js';

// Get our environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Error checking: Ensure the variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be set in .env.local');
}

// Create and export the Supabase client
// This 'supabase' object is our gateway to the database.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);