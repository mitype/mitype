// POST /api/wave/dismiss — never show this video to me again

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
    const { error } = await supabaseAdmin
      .from('wave_dismissals')
      .upsert(
        { video_id: videoId, user_id: user.id },
        { onConflict: 'video_id,user_id', ignoreDuplicates: true }
      );

    if (error) {
      return NextResponse.json({ error: 'Could not dismiss' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[wave/dismiss] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
