import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://oobhaujlvroozusovnba.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_2MS0IK07uH-V47qiWvjF2Q_R7joAZXQ';

  return createBrowserClient(supabaseUrl, supabaseKey);
}

export const supabase = createClient();
