import { createClient } from '@supabase/supabase-js';

// Server-only Supabase client using the service role key.
// This bypasses Row Level Security so our webhook can write to the
// `subscriptions` table on behalf of a user.
//
// NEVER import this file into any client component. It must only be
// used inside API route handlers, server actions, or server components.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
