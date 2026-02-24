import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProfile() {
    // Try to insert a dummy profile to see the exact error
    const { data, error } = await supabase.from('profiles').insert([{ id: '00000000-0000-0000-0000-000000000000', full_name: 'Test', role: 'PO' }]);
    console.log(error);
}

checkProfile();
