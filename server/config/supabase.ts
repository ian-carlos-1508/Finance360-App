/* File: server/config/supabase.ts */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 1. Try loading .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// 2. Try loading .env.local (Common in Vite projects)
// This will fill in any variables not found in .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// 3. Debugging: Print status (Only in dev, remove for production)
// console.log("Backend Loading Supabase URL:", process.env.VITE_SUPABASE_URL ? "FOUND" : "MISSING");

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''; 
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL ERROR: Supabase URL or Key missing in backend.');
  console.error('   Ensure you have a .env or .env.local file in the root folder.');
  console.error('   Variables required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseKey);