async function check() {
  const dotenv = await import('dotenv');
  const { createClient } = await import('@supabase/supabase-js');
  dotenv.config({ path: '.env.local' });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data, error } = await supabase
    .from('config')
    .select('active_languages')
    .eq('tenant_id', 'b9cdb42e-dab4-4319-8a69-bc1e30b220e9')
    .single();

  process.stdout.write(`Result: ${JSON.stringify(data, null, 2)}\n`);
  process.stdout.write(`Error: ${JSON.stringify(error)}\n`);
}

check().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
