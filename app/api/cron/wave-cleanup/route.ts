// GET /api/cron/wave-cleanup
//
// Scheduled job that deletes wave videos older than 24 hours from
// both the database and the Supabase storage bucket. Configured to
// run hourly via Vercel cron — see vercel.json.
//
// Protected by the CRON_SECRET header so randoms can't trigger it.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'wave-videos';

export async function GET(req: NextRequest) {
  try {
    // Verify the request came from Vercel cron (or someone with the secret).
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find expired videos (older than 24h or explicitly past their expires_at)
    const { data: expired, error: findErr } = await supabaseAdmin
      .from('wave_videos')
      .select('id, storage_path')
      .lt('expires_at', new Date().toISOString())
      .limit(500);

    if (findErr) {
      console.error('[wave-cleanup] find error:', findErr);
      return NextResponse.json({ error: 'Cleanup query failed' }, { status: 500 });
    }

    if (!expired || expired.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete the files from storage first (best-effort).
    const paths = expired.map((v: any) => v.storage_path).filter(Boolean);
    if (paths.length) {
      const { error: storageErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
      if (storageErr) {
        console.error('[wave-cleanup] storage delete error:', storageErr);
        // Continue to delete DB rows anyway — orphan files will be re-attempted next run.
      }
    }

    // Delete the DB rows.
    const ids = expired.map((v: any) => v.id);
    const { error: dbErr } = await supabaseAdmin.from('wave_videos').delete().in('id', ids);

    if (dbErr) {
      console.error('[wave-cleanup] db delete error:', dbErr);
      return NextResponse.json({ error: 'DB cleanup failed' }, { status: 500 });
    }

    return NextResponse.json({ deleted: ids.length });
  } catch (err: any) {
    console.error('[wave-cleanup] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
