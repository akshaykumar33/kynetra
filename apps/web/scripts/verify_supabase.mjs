import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oobhaujlvroozusovnba.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_2MS0IK07uH-V47qiWvjF2Q_R7joAZXQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log(`[Supabase Verification] Connecting to ${supabaseUrl}...`);

  const tables = ['districts', 'buildings', 'floors', 'interactive_nodes', 'organizations', 'users'];
  let allHealthy = true;

  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact' }).limit(3);
    if (error) {
      console.log(`❌ Table '${table}': ${error.message}`);
      allHealthy = false;
    } else {
      console.log(`✅ Table '${table}': Ready! Found ${count ?? data?.length ?? 0} records.`);
    }
  }

  if (allHealthy) {
    console.log('\n🎉 All Supabase tables and data verified successfully!');
  } else {
    console.log('\n⚠️ Tables not yet found. Please run the SQL migration script in your Supabase SQL Editor.');
  }
}

verify();
