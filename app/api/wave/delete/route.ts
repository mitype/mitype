// POST /api/wave/delete
//
// Lets a creator delete their OWN Wave video — but only within 1 hour
// of posting it. This intentionally narrow window prevents creators
// from working around the 3-video-per-24h posting cap by deleting and
// re-uploading repeatedly.
//
// Mechanism:
//  - Soft-delete via is_removed = true (so the row still counts toward
//    the 24-hour upload limit enforced in /api/wave/upload-url, which
//    does not filter by is_removed).
//  - Hard-delete the underlying storage file to free space.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../lib/waveAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DELETE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const BUCKET = 'wave-videos';

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

    // Fetch the video row and verify ownership + window.
    const { data: video, error: fetchErr } = await supabaseAdmin
      .from('wave_videos')
      .select('id, user_id, storage_path, created_at, is_removed')
      .eq('id', videoId)
      .maybeSingle();

    if (fetchErr) {
      console.error('[wave/delete] fetch error:', fetchErr);
      return NextResponse.json({ error: 'Could not load video' }, { status: 500 });
    }
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    if (video.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own videos' },
        { status: 403 }
      );
    }
    if (video.is_removed) {
      // Already gone — treat as a no-op success so the client can
      // refresh its UI without confusion.
      return NextResponse.json({ success: true });
    }

    const ageMs = Date.now() - new Date(video.created_at).getTime();
    if (ageMs > DELETE_WINDOW_MS) {
      return NextResponse.json(
        {
          error:
            'This video is more than an hour old — it can no longer be deleted. It will auto-expire 24 hours after posting.',
        },
        { status: 403 }
      );
    }

    // Soft-delete the row (preserves the 24h post-count for rate limiting)
    const { error: updateErr } = await supabaseAdmin
      .from('wave_videos')
      .update({ is_removed: true })
      .eq('id', videoId);
    if (updateErr) {
      console.error('[wave/delete] update error:', updateErr);
      return NextResponse.json({ error: 'Could not delete video' }, { status: 500 });
    }

    // Best-effort hard-delete of the storage object. Don't fail the
    // request if this errors — the soft-delete is the source of truth.
    if (video.storage_path) {
      const { error: storageErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .remove([video.storage_path]);
      if (storageErr) {
        console.warn('[wave/delete] storage remove warning:', storageErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[wave/delete] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
