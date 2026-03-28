import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin(email: string, password: string) {
  console.log(`Testing login for: ${email}`);
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error(`Login failed for ${email}:`, error.message, error.status);
  } else {
    console.log(`Login SUCCESS for ${email}! User ID:`, data.user.id);
    
    // Check profile
    const { data: profile, error: pError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (pError) {
      console.error(`Profile fetch FAILED:`, pError.message);
    } else {
      console.log(`Profile fetch SUCCESS:`, profile.name, 'Role:', profile.role);
    }
  }
}

async function run() {
  await testLogin('ajeu.valverde@gmail.com', 'ajeu122132');
  console.log('---');
  await testLogin('paty@gmail.com', '122132');
}

run();
