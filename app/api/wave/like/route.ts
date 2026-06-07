// POST /api/wave/like — toggle like on a video

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../lib/waveAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr ?? 'Unauthenticated' }, { status: 401 });
    }

    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Check if already liked. If yes, unlike. If no, like.
    const { data: existing } = await supabaseAdmin
      .from('wave_likes')
      .select('video_id')
      .eq('video_id', videoId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from('wave_likes')
        .delete()
        .eq('video_id', videoId)
        .eq('user_id', user.id);
      if (error) {
        return NextResponse.json({ error: 'Could not unlike' }, { status: 500 });
      }
      return NextResponse.json({ liked: false });
    }

    const { error } = await supabaseAdmin
      .from('wave_likes')
      .insert({ video_id: videoId, user_id: user.id });
    if (error) {
      return NextResponse.json({ error: 'Could not like' }, { status: 500 });
    }
    return NextResponse.json({ liked: true });
  } catch (err: any) {
    console.error('[wave/like] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
