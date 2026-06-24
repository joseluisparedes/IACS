import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_URL : undefined) ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_URL : undefined) ||
  'https://gftvhbhckrzkgpchnfjm.supabase.co'
) as string;

const supabaseAnonKey = (
  (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_SUPABASE_ANON_KEY : undefined) ||
  (typeof process !== 'undefined' ? process.env.SUPABASE_ANON_KEY : undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmdHZoYmhja3J6a2dwY2huZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1OTU4NDEsImV4cCI6MjA5NjE3MTg0MX0.errqmsEdDxGXA4DAqLihOvy1qzMpg14CzxD_NywLUZU'
) as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
