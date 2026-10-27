// Client helpers for switching an administrator into the official
// @mitype profile and back. Only works for admins (the server checks).
//
// While acting as @mitype, the admin's own session is kept in
// localStorage so one tap returns them to their account.

import { supabase } from './supabaseClient';

const RETURN_KEY = 'mitype-admin-return';

export function isActingAsOfficial(): boolean {
  try {
    return !!window.localStorage.getItem(RETURN_KEY);
  } catch {
    return false;
  }
}

/** Forget the saved admin session (used on sign out). */
export function clearOfficialReturn(): void {
  try { window.localStorage.removeItem(RETURN_KEY); } catch { /* ignore */ }
}

export async function switchToOfficial(): Promise<void> {
  if (isActingAsOfficial()) return;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');

  const res = await fetch('/api/admin/official/switch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.tokenHash) {
    throw new Error(body.error ?? 'Could not open the official profile.');
  }

  window.localStorage.setItem(
    RETURN_KEY,
    JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }),
  );
  let { error } = await supabase.auth.verifyOtp({ token_hash: body.tokenHash, type: 'magiclink' });
  if (error) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: body.tokenHash, type: 'email' }));
  }
  if (error) {
    window.localStorage.removeItem(RETURN_KEY);
    throw new Error('Could not open the official profile.');
  }
  window.location.assign('/dashboard');
}

export async function switchBackFromOfficial(): Promise<void> {
  const raw = window.localStorage.getItem(RETURN_KEY);
  if (!raw) return;
  let saved: { access_token?: string; refresh_token?: string } = {};
  try { saved = JSON.parse(raw); } catch { /* fall through */ }
  window.localStorage.removeItem(RETURN_KEY);
  if (saved.access_token && saved.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: saved.access_token,
      refresh_token: saved.refresh_token,
    });
    if (!error) {
      window.location.assign('/dashboard');
      return;
    }
  }
  // The saved session expired: sign out so the admin can log in again.
  await supabase.auth.signOut();
  window.location.assign('/login');
}
