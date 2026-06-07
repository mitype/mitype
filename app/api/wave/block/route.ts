// POST /api/wave/block — block a creator. Their videos won't show in your feed.

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

    const { blockedUserId } = await req.json();
    if (!blockedUserId) {
      return NextResponse.json({ error: 'Missing blockedUserId' }, { status: 400 });
    }
    if (blockedUserId === user.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('wave_blocks').upsert(
      { blocker_user_id: user.id, blocked_user_id: blockedUserId },
      { onConflict: 'blocker_user_id,blocked_user_id', ignoreDuplicates: true }
    );

    if (error) {
      return NextResponse.json({ error: 'Could not block user' }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
