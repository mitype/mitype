// POST /api/wave/undismiss — reverse a recent Skip.
//
// Deletes the user's dismissal row for a given video, restoring its
// eligibility to appear in their feed. Used by the 5-second "Undo
// skip" toast on the Wave feed page.

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

    const { videoId } = (await req.json()) as { videoId?: string };
    if (!videoId || typeof videoId !== 'string') {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from('wave_dismissals')
      .delete()
      .eq('video_id', videoId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[wave/undismiss] delete error:', error);
      return NextResponse.json({ error: 'Could not undo skip' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[wave/undismiss] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
