// POST /api/admin/official/switch
//
// Lets an administrator sign in to the official @mitype profile.
//
// The official profile is a real account (so other members can follow,
// interact and message it like anyone else). It has no password anyone
// knows, so the only way into it is this route, which only works for a
// signed in admin. The first call creates the account if it does not
// exist yet. The route returns a one-time token the browser exchanges
// for a session.

import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../../lib/waveAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OFFICIAL_USERNAME = 'mitype';
const OFFICIAL_EMAIL = 'official@mitypeapp.com';
const OFFICIAL_BIO =
  'Welcome to Mitype, the social media that networks. Find your type, share your work, and connect with people who share your world.';

async function ensureOfficialUserId(origin: string): Promise<string> {
  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from('profiles')
    .select('user_id')
    .eq('username', OFFICIAL_USERNAME)
    .maybeSingle();
  if (existing?.user_id) return existing.user_id as string;

  // Find or create the auth account. Nobody ever learns this password.
  let userId: string | null = null;
  const created = await admin.auth.admin.createUser({
    email: OFFICIAL_EMAIL,
    password: randomBytes(32).toString('base64url'),
    email_confirm: true,
  });
  if (created.data?.user) {
    userId = created.data.user.id;
  } else {
    const list = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = list.data?.users.find((u) => u.email?.toLowerCase() === OFFICIAL_EMAIL)?.id ?? null;
  }
  if (!userId) throw new Error('Could not create the official account.');

  // Profile picture: the Mitype app icon, stored with the other avatars.
  let avatarUrl: string | null = null;
  try {
    const res = await fetch(`${origin}/icon-512.png`);
    if (res.ok) {
      const path = `${userId}/official-logo.png`;
      const up = await admin.storage
        .from('avatars')
        .upload(path, Buffer.from(await res.arrayBuffer()), { contentType: 'image/png', upsert: true });
      if (!up.error) avatarUrl = admin.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    }
  } catch {
    // The profile still works without a picture; an admin can add one.
  }

  const { error: profErr } = await admin.from('profiles').insert({
    user_id: userId,
    username: OFFICIAL_USERNAME,
    bio: OFFICIAL_BIO,
    avatar_url: avatarUrl,
    categories: [],
    zip_code: '',
    social_links: [],
    website_url: 'https://mitypeapp.com',
  });
  if (profErr) throw new Error('Could not create the official profile.');

  // Complimentary membership so the account can use every feature.
  await admin
    .from('subscriptions')
    .upsert({ user_id: userId, status: 'active' }, { onConflict: 'user_id' });

  return userId;
}

export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr ?? 'Unauthenticated' }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: me } = await admin
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!me?.is_admin) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    const officialId = await ensureOfficialUserId(req.nextUrl.origin);
    if (officialId === user.id) {
      return NextResponse.json({ error: 'Already on the official profile' }, { status: 400 });
    }

    const { data: officialUser } = await admin.auth.admin.getUserById(officialId);
    const email = officialUser?.user?.email;
    if (!email) {
      return NextResponse.json({ error: 'Official account is missing an email' }, { status: 500 });
    }

    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    const tokenHash = link?.properties?.hashed_token;
    if (linkErr || !tokenHash) {
      return NextResponse.json({ error: 'Could not start the session' }, { status: 500 });
    }

    return NextResponse.json({ tokenHash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
