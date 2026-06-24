'use client';
// EndorsementsSection — renders a creator's endorsements on their
// profile page, plus an "Endorse" button for connected viewers.
//
// Behavior:
//   - Anyone can READ endorsements (RLS allows it).
//   - Only an authenticated viewer with an approved DM to this creator
//     can leave an endorsement. The RLS policy enforces that on the
//     server side; we just hide the UI for everyone else.
//   - One endorsement per endorser→endorsed pair. Re-saving updates.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { Avatar } from './Avatar';

interface EndorserProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface Endorsement {
  id: string;
  endorser_id: string;
  body: string;
  created_at: string;
  endorser?: EndorserProfile | null;
}

interface Props {
  profileUserId: string;
  profileUsername: string;
  /** The current viewer's user id (or null if signed out). */
  viewerId: string | null;
  /** True if viewer is the profile owner (so they can't endorse themselves). */
  isOwnProfile: boolean;
}

const MAX_BODY = 240;

export function EndorsementsSection({ profileUserId, profileUsername, viewerId, isOwnProfile }: Props) {
  const [endorsements, setEndorsements] = useState<Endorsement[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEndorse, setCanEndorse] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [myExistingId, setMyExistingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('profile_endorsements')
        .select('id, endorser_id, body, created_at')
        .eq('endorsed_id', profileUserId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (cancelled) return;

      const rows: Endorsement[] = (data ?? []).map((r: any) => ({
        id: r.id,
        endorser_id: r.endorser_id,
        body: r.body,
        created_at: r.created_at,
      }));

      // Resolve endorser profiles in one batched query.
      if (rows.length > 0) {
        const ids = Array.from(new Set(rows.map((r) => r.endorser_id)));
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', ids);
        const map = new Map<string, EndorserProfile>(
          (profs ?? []).map((p: any) => [p.user_id, p])
        );
        for (const r of rows) {
          r.endorser = map.get(r.endorser_id) ?? null;
        }
      }
      setEndorsements(rows);
      // If viewer already has one for this creator, capture it for the editor.
      if (viewerId) {
        const mine = rows.find((r) => r.endorser_id === viewerId);
        if (mine) {
          setMyExistingId(mine.id);
          setDraft(mine.body);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profileUserId, viewerId]);

  // Check whether viewer has an approved DM with the profile owner.
  // That's the gate for the endorsement form.
  useEffect(() => {
    if (!viewerId || isOwnProfile) { setCanEndorse(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [viewerId, profileUserId])
        .eq('kind', 'dm')
        .eq('status', 'approved')
        .limit(1);
      if (cancelled) return;
      setCanEndorse((data ?? []).length > 0);
    })();
    return () => { cancelled = true; };
  }, [viewerId, profileUserId, isOwnProfile]);

  async function save() {
    if (!viewerId) return;
    const body = draft.trim().slice(0, MAX_BODY);
    if (body.length === 0) {
      toast.error('Write a short endorsement first.');
      return;
    }
    setSaving(true);
    try {
      if (myExistingId) {
        const { error } = await supabase
          .from('profile_endorsements')
          .update({ body, updated_at: new Date().toISOString() })
          .eq('id', myExistingId);
        if (error) throw error;
        toast.success('Endorsement updated');
        setEndorsements((prev) =>
          prev.map((e) => e.id === myExistingId ? { ...e, body } : e));
      } else {
        const { data, error } = await supabase
          .from('profile_endorsements')
          .insert({
            endorser_id: viewerId,
            endorsed_id: profileUserId,
            body,
          })
          .select('id, endorser_id, body, created_at')
          .single();
        if (error) throw error;
        toast.success('Endorsement posted');
        if (data) {
          setMyExistingId(data.id);
          // Pull viewer profile for the new row.
          const { data: me } = await supabase
            .from('profiles')
            .select('user_id, username, avatar_url')
            .eq('user_id', viewerId)
            .maybeSingle();
          setEndorsements((prev) => [
            {
              id: data.id,
              endorser_id: data.endorser_id,
              body: data.body,
              created_at: data.created_at,
              endorser: me ?? null,
            },
            ...prev,
          ]);
        }
      }
      setEditorOpen(false);
    } catch (e: any) {
      console.error('[endorsements] save:', e);
      toast.error(e?.message ?? 'Could not save the endorsement.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteMine() {
    if (!myExistingId) return;
    if (!confirm('Remove your endorsement?')) return;
    try {
      const { error } = await supabase
        .from('profile_endorsements')
        .delete()
        .eq('id', myExistingId);
      if (error) throw error;
      setEndorsements((prev) => prev.filter((e) => e.id !== myExistingId));
      setMyExistingId(null);
      setDraft('');
      toast.success('Endorsement removed');
    } catch (e: any) {
      console.error('[endorsements] delete:', e);
      toast.error(e?.message ?? 'Could not delete.');
    }
  }

  return (
    <section style={{
      marginTop: 32,
      padding: 24,
      background: 'white',
      border: '1px solid rgba(200,149,108,0.2)',
      borderRadius: 24,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 10,
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 800,
          color: '#1a1208',
          letterSpacing: '-0.3px',
        }}>
          Endorsements
          {endorsements.length > 0 && (
            <span style={{ color: '#a89278', fontWeight: 600, marginLeft: 8, fontSize: 14 }}>
              ({endorsements.length})
            </span>
          )}
        </h3>
        {canEndorse && !editorOpen && (
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #c8956c, #ffb37c)',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 6px 16px rgba(200,149,108,0.3)',
            }}
          >
            {myExistingId ? 'Edit yours' : 'Endorse'}
          </button>
        )}
      </div>

      {editorOpen && (
        <div style={{
          padding: 14,
          background: 'rgba(255,213,168,0.12)',
          border: '1px solid rgba(200,149,108,0.25)',
          borderRadius: 16,
          marginBottom: 16,
        }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
            placeholder={`What makes @${profileUsername} a great creator to work with?`}
            rows={3}
            style={{
              width: '100%',
              padding: '11px 14px',
              borderRadius: 12,
              border: '1px solid rgba(200,149,108,0.3)',
              background: 'white',
              fontSize: 16,
              color: '#1a1208',
              outline: 'none',
              fontFamily: 'inherit',
              resize: 'vertical',
              minHeight: 70,
              boxSizing: 'border-box',
            }}
          />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 8,
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 11, color: '#a89278' }}>{draft.length}/{MAX_BODY}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {myExistingId && (
                <button
                  type="button"
                  onClick={deleteMine}
                  style={{
                    padding: '7px 14px',
                    background: 'transparent',
                    color: '#c07070',
                    border: '1px solid rgba(220,90,90,0.3)',
                    borderRadius: 100,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                style={{
                  padding: '7px 14px',
                  background: 'transparent',
                  color: '#8a7560',
                  border: '1px solid rgba(200,149,108,0.3)',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving || draft.trim().length === 0}
                style={{
                  padding: '7px 16px',
                  background: saving || draft.trim().length === 0
                    ? 'rgba(200,149,108,0.4)'
                    : 'linear-gradient(135deg, #c8956c, #ffb37c)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: saving ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {saving ? 'Saving…' : myExistingId ? 'Update' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p style={{ color: '#a89278', fontSize: 13 }}>Loading…</p>
      ) : endorsements.length === 0 ? (
        <p style={{
          margin: 0,
          padding: 14,
          color: '#a89278',
          fontSize: 13,
          background: 'rgba(255,255,255,0.5)',
          border: '1px dashed rgba(200,149,108,0.3)',
          borderRadius: 12,
        }}>
          {isOwnProfile
            ? 'No endorsements yet. Connections you message can leave one.'
            : `No endorsements yet for @${profileUsername}.`}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {endorsements.map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex',
                gap: 12,
                padding: 14,
                background: 'rgba(255,213,168,0.08)',
                border: '1px solid rgba(200,149,108,0.18)',
                borderRadius: 14,
              }}
            >
              <Avatar
                src={e.endorser?.avatar_url ?? null}
                alt={e.endorser?.username ?? 'creator'}
                width={36}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#1a1208',
                  marginBottom: 4,
                }}>
                  @{e.endorser?.username ?? 'creator'}
                </div>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#5b4a36',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}>
                  "{e.body}"
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
