// POST /api/push/send
//
// Called by the database (never by a browser) whenever a member should
// get a phone notification. The request must carry the shared secret in
// the `x-push-secret` header. For each phone the member has turned
// notifications on for, we send a web push. Phones that have gone away
// (uninstalled, permission revoked) are cleaned up automatically.

import { timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function secretMatches(given: string | null): boolean {
  const expected = process.env.PUSH_SEND_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!secretMatches(req.headers.get('x-push-secret'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:support@mitypeapp.com';
  if (!publicKey || !privateKey) {
    return NextResponse.json({ error: 'Push is not configured' }, { status: 500 });
  }

  let body: { user_id?: string; title?: string; body?: string; url?: string; tag?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  if (!body.user_id || !body.title) {
    return NextResponse.json({ error: 'Missing user_id or title' }, { status: 400 });
  }

  // Only same-site paths, so a notification can never send someone elsewhere.
  const url = typeof body.url === 'string' && body.url.startsWith('/') && !body.url.startsWith('//')
    ? body.url
    : '/dashboard';

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const admin = getSupabaseAdmin();
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', body.user_id);

  const payload = JSON.stringify({
    title: String(body.title).slice(0, 120),
    body: String(body.body ?? '').slice(0, 240),
    url,
    tag: body.tag ? String(body.tag).slice(0, 60) : undefined,
  });

  let sent = 0;
  const dead: string[] = [];
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        sent += 1;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(s.id as string);
      }
    }),
  );

  if (dead.length) {
    await admin.from('push_subscriptions').delete().in('id', dead);
  }
  return NextResponse.json({ sent, removed: dead.length });
}
