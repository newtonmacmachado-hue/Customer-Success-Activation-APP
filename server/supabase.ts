import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment variables.');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
  throw new Error('Supabase URL and service role key are required.');
}

console.log('Initializing Supabase Service Role Client...');
console.log('URL:', supabaseUrl);
console.log('Key length:', supabaseKey.length);

export const supabase = createClient(supabaseUrl, supabaseKey);
