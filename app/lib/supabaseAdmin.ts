import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-only Supabase client using the service role key.
// This bypasses Row Level Security so our webhook can write to the
// `subscriptions` table on behalf of a user.
//
// NEVER import this file into any client component. It must only be
// used inside API route handlers, server actions, or server components.
//
// The client is created lazily on first use so that build-time module
// loading doesn't fail when the env var isn't available yet.
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_supabaseAdmin) return _supabaseAdmin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Supabase admin client is missing env vars. Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  _supabaseAdmin = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseAdmin;
}
