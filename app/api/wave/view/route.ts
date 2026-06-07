// POST /api/wave/view — record that the viewer watched this video
// Fire-and-forget from the client. We also nudge view_count.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../lib/waveAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthedUser(req);
    if (!user) {
      // Silent fail — views aren't worth blocking on auth errors.
      return NextResponse.json({ success: false });
    }

    const { videoId } = await req.json();
    if (!videoId) {
      return NextResponse.json({ success: false });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Insert view record. Conflict means we already counted this viewer.
    const { error: viewErr } = await supabaseAdmin
      .from('wave_views')
      .upsert(
        { video_id: videoId, user_id: user.id },
        { onConflict: 'video_id,user_id', ignoreDuplicates: true }
      );

    if (!viewErr) {
      // Increment the counter only when this is a fresh view.
      const { data: justInserted } = await supabaseAdmin
        .from('wave_views')
        .select('viewed_at')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .single();
      if (justInserted) {
        await supabaseAdmin.rpc('increment_wave_view', { vid: videoId }).then(
          () => {},
          () => {
            // RPC may not exist — fall back to direct update.
            return supabaseAdmin
              .from('wave_videos')
              .update({ view_count: (justInserted as any).view_count ?? 0 })
              .eq('id', videoId);
          }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false });
  }
}
