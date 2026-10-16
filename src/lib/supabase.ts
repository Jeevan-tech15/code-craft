import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ccuqmxgpfvzgwyfsagif.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjdXFteGdwZnZ6Z3d5ZnNhZ2lmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNDM5MzQsImV4cCI6MjEwNzYxOTkzNH0.Y1Te4sRVD51I0lACk1GOR7DwP6hO9Idn3t_seNGwCbA';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabase();
