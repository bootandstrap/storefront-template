require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.log("No service role key provided in env, using hardcoded anon for fallback if public");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('config')
    .select('active_languages')
    .eq('tenant_id', 'b9cdb42e-dab4-4319-8a69-bc1e30b220e9')
    .single();

  console.log('Result:', JSON.stringify(data, null, 2));
  console.log('Error:', error);
}

check();
