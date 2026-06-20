// GET /api/cron/message-media-cleanup
//
// Hourly cron that deletes expired message attachments (photos +
// voice notes) from the message-media storage bucket and clears the
// URL fields on the corresponding messages so the chat bubble shows
// the "expired" placeholder.
//
// The message row itself is preserved — only the media is removed —
// so the conversation history stays continuous.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BUCKET = 'message-media';

export async function GET(req: NextRequest) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Find expired attachments — message rows whose attachment_expires_at
    // has passed but still have a storage_path set.
    const { data: expired, error: findErr } = await supabaseAdmin
      .from('messages')
      .select('id, attachment_storage_path')
      .lt('attachment_expires_at', new Date().toISOString())
      .not('attachment_storage_path', 'is', null)
      .limit(500);

    if (findErr) {
      console.error('[message-media-cleanup] find error:', findErr);
      return NextResponse.json({ error: 'Cleanup query failed' }, { status: 500 });
    }
    if (!expired || expired.length === 0) {
      return NextResponse.json({ deleted: 0 });
    }

    // Delete files from storage (best-effort).
    const paths = expired
      .map((m: any) => m.attachment_storage_path)
      .filter((p: string | null) => !!p) as string[];
    if (paths.length) {
      const { error: storageErr } = await supabaseAdmin.storage.from(BUCKET).remove(paths);
      if (storageErr) {
        console.warn('[message-media-cleanup] storage delete warn:', storageErr);
        // Continue — DB clear is the source of truth.
      }
    }

    // Clear the attachment fields on the messages — but DON'T delete
    // the row. The conversation history remains intact; the bubble
    // just shows the "expired" placeholder.
    const ids = expired.map((m: any) => m.id);
    const { error: updErr } = await supabaseAdmin
      .from('messages')
      .update({
        attachment_url: null,
        attachment_storage_path: null,
      })
      .in('id', ids);

    if (updErr) {
      console.error('[message-media-cleanup] update error:', updErr);
      return NextResponse.json({ error: 'DB clear failed' }, { status: 500 });
    }

    return NextResponse.json({ deleted: ids.length });
  } catch (err: any) {
    console.error('[message-media-cleanup] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
