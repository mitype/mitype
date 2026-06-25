// POST /api/wave/finalize
//
// Called by the client AFTER the video upload to Supabase Storage
// has completed successfully. Creates the wave_videos row with all
// metadata. This is the only path that creates videos — there's no
// way to insert into wave_videos without going through here.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../lib/waveAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_DURATION = 60; // seconds
const MAX_CAPTION_CHARS = 80; // matches MAX_CAPTION on /wave/create
const BUCKET = 'wave-videos';

export async function POST(req: NextRequest) {
  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr ?? 'Unauthenticated' }, { status: 401 });
    }

    const body = await req.json();
    const {
      storagePath,
      caption,
      category,
      durationSeconds,
      width,
      height,
      linkedListingId,
      linkedBusinessId,
    } = body as {
      storagePath?: string;
      caption?: string;
      category?: string;
      durationSeconds?: number;
      width?: number;
      height?: number;
      // Bridge features: optional pointer to one of the creator's own
      // Mi Home Goods listings or business profile. UI shows a chip on
      // the Wave feed that deep-links to the entity.
      linkedListingId?: string | null;
      linkedBusinessId?: string | null;
    };

    if (!storagePath || typeof storagePath !== 'string') {
      return NextResponse.json({ error: 'Missing storagePath' }, { status: 400 });
    }
    if (!storagePath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Storage path mismatch' }, { status: 403 });
    }
    if (durationSeconds && durationSeconds > MAX_DURATION) {
      return NextResponse.json(
        { error: `Videos must be ${MAX_DURATION} seconds or shorter` },
        { status: 400 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Confirm the upload actually exists in storage before creating the row.
    const { data: fileInfo, error: statErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(user.id, {
        search: storagePath.split('/').pop(),
        limit: 1,
      });
    if (statErr || !fileInfo?.length) {
      return NextResponse.json(
        { error: 'Upload not found in storage. Try again' },
        { status: 400 }
      );
    }

    // Optional linked entities — verify the creator actually owns them
    // before persisting (defense in depth, even though the picker only
    // surfaces their own listings/business).
    let safeLinkedListingId: string | null = null;
    if (linkedListingId) {
      const { data: l } = await supabaseAdmin
        .from('home_goods_listings')
        .select('id, seller_id')
        .eq('id', linkedListingId)
        .maybeSingle();
      if (l && l.seller_id === user.id) safeLinkedListingId = l.id;
    }
    let safeLinkedBusinessId: string | null = null;
    if (linkedBusinessId) {
      const { data: b } = await supabaseAdmin
        .from('business_profiles')
        .select('id, user_id')
        .eq('id', linkedBusinessId)
        .maybeSingle();
      if (b && b.user_id === user.id) safeLinkedBusinessId = b.id;
    }

    // Create the video row. expires_at defaults to now + 24h via the schema.
    const { data: video, error: insertErr } = await supabaseAdmin
      .from('wave_videos')
      .insert({
        user_id: user.id,
        storage_path: storagePath,
        caption: caption?.slice(0, MAX_CAPTION_CHARS) ?? null,
        category: category ?? null,
        duration_seconds: durationSeconds ?? null,
        width: width ?? null,
        height: height ?? null,
        linked_listing_id: safeLinkedListingId,
        linked_business_id: safeLinkedBusinessId,
      })
      .select('id, expires_at')
      .single();

    if (insertErr || !video) {
      console.error('[wave/finalize] insert error:', insertErr);
      return NextResponse.json({ error: 'Could not save video' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      videoId: video.id,
      expiresAt: video.expires_at,
    });
  } catch (err: any) {
    console.error('[wave/finalize] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
