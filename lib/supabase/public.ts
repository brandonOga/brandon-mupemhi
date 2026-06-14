import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env';

// Cookieless anonymous client for public reads. Because it never touches
// request cookies, pages that use it stay statically cacheable (ISR), and
// RLS still restricts it to published rows.
export function createPublicClient() {
  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
