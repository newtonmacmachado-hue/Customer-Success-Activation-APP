import { createClient } from '@supabase/supabase-js';

// @ts-ignore
const env = import.meta.env;
const supabaseUrl = env?.VITE_SUPABASE_URL || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined);
const supabaseAnonKey = env?.VITE_SUPABASE_ANON_KEY || (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined);

export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey);
};

let supabase: ReturnType<typeof createClient> | null = null;

if (isSupabaseConfigured()) {
  supabase = createClient(supabaseUrl!, supabaseAnonKey!);
}

export { supabase };
