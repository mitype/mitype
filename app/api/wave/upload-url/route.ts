// POST /api/wave/upload-url
//
// Grants a signed upload URL so the client can upload the video
// directly to Supabase Storage without proxying through our server.
// Enforces the 3-video-per-24h post limit BEFORE issuing the URL.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../lib/waveAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAILY_POST_LIMIT = 3;
const BUCKET = 'wave-videos';

export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr ?? 'Unauthenticated' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check how many videos this user has posted in the last 24h
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countErr } = await supabaseAdmin
      .from('wave_videos')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', since);

    if (countErr) {
      console.error('[wave/upload-url] count error:', countErr);
      return NextResponse.json({ error: 'Could not verify post limit' }, { status: 500 });
    }

    if ((count ?? 0) >= DAILY_POST_LIMIT) {
      return NextResponse.json(
        {
          error: `You've reached your daily limit of ${DAILY_POST_LIMIT} posts. Come back tomorrow!`,
          limitReached: true,
        },
        { status: 429 }
      );
    }

    // Generate a path like `<user_id>/<uuid>.mp4`. We append .mp4 by
    // default but Supabase keeps the actual content-type the client uploads.
    const objectName = `${user.id}/${crypto.randomUUID()}.mp4`;

    const { data, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(objectName);

    if (signErr || !data) {
      console.error('[wave/upload-url] sign error:', signErr);
      return NextResponse.json({ error: 'Could not create upload URL' }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      token: data.token,
      path: data.path,
      remainingPostsToday: DAILY_POST_LIMIT - (count ?? 0) - 1,
    });
  } catch (err: any) {
    console.error('[wave/upload-url] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
