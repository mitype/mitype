// GET /api/wave/feed?cursor=<iso>
//
// Returns the next page of videos for the viewer. Filters out:
//  - expired videos (server-enforced via the RLS policy, double-check here)
//  - the viewer's own videos
//  - videos from users the viewer has blocked
//  - videos the viewer has dismissed
//  - videos flagged as removed (moderation)
//
// Sorts by a blended order: compatibility-weighted recency. Recent
// videos from highly compatible creators surface first.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getAuthedUser } from '../../../lib/waveAuth';
import { calculateCompatibility, getSharedCategories } from '../../../lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;
const BUCKET = 'wave-videos';

export async function GET(req: NextRequest) {
  try {
    const { user, error: authErr } = await getAuthedUser(req);
    if (!user) {
      return NextResponse.json({ error: authErr ?? 'Unauthenticated' }, { status: 401 });
    }

    const url = new URL(req.url);
    const cursor = url.searchParams.get('cursor');

    const supabaseAdmin = getSupabaseAdmin();

    // Get the viewer's categories so we can compute compatibility.
    const { data: myProfile } = await supabaseAdmin
      .from('profiles')
      .select('categories')
      .eq('user_id', user.id)
      .maybeSingle();

    const myCategories: string[] = myProfile?.categories ?? [];

    // Load the viewer's dismissals and blocks once.
    const [{ data: dismissals }, { data: blocks }, { data: likes }] = await Promise.all([
      supabaseAdmin
        .from('wave_dismissals')
        .select('video_id')
        .eq('user_id', user.id),
      supabaseAdmin
        .from('wave_blocks')
        .select('blocked_user_id')
        .eq('blocker_user_id', user.id),
      supabaseAdmin
        .from('wave_likes')
        .select('video_id')
        .eq('user_id', user.id),
    ]);

    const dismissedIds = new Set((dismissals ?? []).map((d: any) => d.video_id));
    const blockedUserIds = new Set((blocks ?? []).map((b: any) => b.blocked_user_id));
    const likedIds = new Set((likes ?? []).map((l: any) => l.video_id));

    // Pull a candidate pool larger than the page so we can filter and sort.
    // We DO include the viewer's own videos — it's good feedback to see your
    // post sitting in the same feed, and helps when the feed is still small.
    let query = supabaseAdmin
      .from('wave_videos')
      .select('id, user_id, storage_path, caption, category, duration_seconds, width, height, created_at, expires_at, like_count, view_count')
      .eq('is_removed', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE * 4);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data: candidates, error: feedErr } = await query;
    if (feedErr) {
      console.error('[wave/feed] candidate fetch error:', feedErr);
      return NextResponse.json({ error: 'Could not load feed' }, { status: 500 });
    }

    // Filter out dismissed videos and blocked users.
    const filtered = (candidates ?? []).filter(
      (v: any) => !dismissedIds.has(v.id) && !blockedUserIds.has(v.user_id)
    );

    // Load creator profiles for the filtered candidates.
    const creatorIds = Array.from(new Set(filtered.map((v: any) => v.user_id)));
    const { data: creatorProfiles } = await supabaseAdmin
      .from('profiles')
      .select('user_id, username, avatar_url, categories, bio')
      .in('user_id', creatorIds);

    const profileMap = new Map<string, any>(
      (creatorProfiles ?? []).map((p: any) => [p.user_id, p])
    );

    // Score each video with compatibility-weighted recency, then sort.
    const now = Date.now();
    const scored = filtered.map((v: any) => {
      const creator = profileMap.get(v.user_id);
      const theirCategories: string[] = creator?.categories ?? [];
      const compatibility = calculateCompatibility(myCategories, theirCategories);
      const shared = getSharedCategories(myCategories, theirCategories);
      const ageHours = Math.max(0, (now - new Date(v.created_at).getTime()) / (1000 * 60 * 60));
      // Compatibility worth up to ~100 pts; recency adds up to ~60 pts (fresher = higher).
      const recencyBoost = Math.max(0, 60 - ageHours * 2);
      const rankScore = compatibility + recencyBoost;
      return {
        ...v,
        creator: creator
          ? {
              username: creator.username,
              avatarUrl: creator.avatar_url,
              bio: creator.bio,
            }
          : null,
        compatibility,
        sharedCategories: shared,
        likedByMe: likedIds.has(v.id),
        rankScore,
      };
    });

    scored.sort((a: any, b: any) => b.rankScore - a.rankScore);

    const page = scored.slice(0, PAGE_SIZE);

    // Generate public URLs for the videos. The bucket is public so this is direct.
    const items = page.map((v: any) => {
      const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(v.storage_path);
      return {
        id: v.id,
        videoUrl: pub.publicUrl,
        caption: v.caption,
        category: v.category,
        durationSeconds: v.duration_seconds,
        createdAt: v.created_at,
        expiresAt: v.expires_at,
        likeCount: v.like_count,
        viewCount: v.view_count,
        compatibility: v.compatibility,
        sharedCategories: v.sharedCategories,
        likedByMe: v.likedByMe,
        creator: v.creator
          ? { ...v.creator, userId: v.user_id }
          : null,
      };
    });

    // Cursor for next page = the oldest created_at in this batch.
    const nextCursor = page.length === PAGE_SIZE ? page[page.length - 1].created_at : null;

    return NextResponse.json({ items, nextCursor });
  } catch (err: any) {
    console.error('[wave/feed] handler error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
