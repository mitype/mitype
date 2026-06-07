// Shared auth helper for Wave API routes. Verifies the caller's
// Supabase session and returns their user record. Used by every
// /api/wave/* route handler.

import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function getAuthedUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or invalid authorization header' };
  }
  const accessToken = authHeader.slice(7);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { user: null, error: 'Server misconfigured (Supabase env vars)' };
  }

  // Use the anon client to resolve the access token into a user.
  // We don't use the admin client for this step — we want Supabase
  // to validate the token, not bypass auth.
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data?.user) {
    return { user: null, error: error?.message ?? 'Invalid session' };
  }

  return { user: data.user, error: null };
}
