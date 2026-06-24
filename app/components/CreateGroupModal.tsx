'use client';
// CreateGroupModal — modal flow for spinning up a new group chat.
//
// The user picks 1–9 connections from their approved-DM list, types
// a group title, and we insert a row into `conversations` with
// kind='group'. The new row's participant_ids = [me, ...selected].
//
// Membership cap matches the DB constraint: groups are 2–10 members
// (the user counts as one). A creator who picks zero connections gets
// blocked with a friendly toast.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { Avatar } from './Avatar';

interface ConnectionOption {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  /** Called with the new conversation row id once the group is created. */
  onCreated: (conversationId: string) => void;
}

const MAX_MEMBERS = 10; // inclusive of the creator
const MAX_TITLE_LEN = 60;

export function CreateGroupModal({ open, onClose, currentUserId, onCreated }: Props) {
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<ConnectionOption[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  // Load the user's approved DM partners as the multi-select pool.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      // 1) Find all approved DM conversations the user is in
      const { data: dms, error: dmErr } = await supabase
        .from('conversations')
        .select('participant_ids, kind, status')
        .contains('participant_ids', [currentUserId])
        .eq('kind', 'dm')
        .eq('status', 'approved');
      if (cancelled) return;
      if (dmErr) {
        console.error('[create-group] dm load:', dmErr);
        setLoading(false);
        return;
      }

      // 2) Collect the OTHER user IDs from each DM
      const otherIds = Array.from(new Set(
        (dms ?? [])
          .flatMap((c: any) => c.participant_ids as string[])
          .filter((id) => id !== currentUserId)
      ));

      if (otherIds.length === 0) {
        setConnections([]);
        setLoading(false);
        return;
      }

      // 3) Resolve their public profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', otherIds);

      if (cancelled) return;
      const opts: ConnectionOption[] = (profiles ?? []).map((p: any) => ({
        user_id: p.user_id,
        username: p.username,
        avatar_url: p.avatar_url ?? null,
      }));
      opts.sort((a, b) => a.username.localeCompare(b.username));
      setConnections(opts);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, currentUserId]);

  // Reset form whenever the modal closes/opens.
  useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setTitle('');
      setSearch('');
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter((c) => c.username.toLowerCase().includes(q));
  }, [connections, search]);

  function toggleSelect(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        if (next.size + 1 >= MAX_MEMBERS) {
          toast.info(`Groups can have up to ${MAX_MEMBERS} people (including you).`);
          return prev;
        }
        next.add(userId);
      }
      return next;
    });
  }

  async function handleCreate() {
    if (selected.size === 0) {
      toast.error('Pick at least one person to add.');
      return;
    }
    if (!title.trim()) {
      toast.error('Give the group a name.');
      return;
    }
    setCreating(true);
    try {
      const participants = [currentUserId, ...Array.from(selected)];
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          kind: 'group',
          title: title.trim().slice(0, MAX_TITLE_LEN),
          participant_ids: participants,
          initiated_by: currentUserId,
          creator_id: currentUserId,
          status: 'approved', // groups are auto-approved by definition
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) {
        toast.success('Group created');
        onCreated(data.id);
        onClose();
      }
    } catch (e: any) {
      console.error('[create-group] insert failed:', e);
      toast.error(e?.message ?? 'Could not create the group.');
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create a group chat"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: 16,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 440,
          maxHeight: 'min(92vh, 760px)',
          background: 'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
          borderRadius: 24,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 22px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: 21,
            fontWeight: 900,
            color: '#1a1208',
            letterSpacing: '-0.5px',
          }}>
            New group
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(0,0,0,0.06)',
              border: 'none', color: '#1a1208',
              fontSize: 16, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            ✕
          </button>
        </div>

        {/* Group title */}
        <div style={{ padding: '0 22px 12px' }}>
          <label style={{
            display: 'block',
            fontSize: 11, fontWeight: 800,
            color: '#a07a4d', textTransform: 'uppercase',
            letterSpacing: '1.4px',
            marginBottom: 6,
          }}>
            Group name
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LEN))}
            placeholder="Coffee shop crew, Wednesday writing club…"
            maxLength={MAX_TITLE_LEN}
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'white',
              border: '1px solid rgba(200,149,108,0.3)',
              borderRadius: 12,
              fontSize: 16,
              fontFamily: 'inherit',
              outline: 'none',
              color: '#1a1208',
            }}
          />
          <div style={{ fontSize: 11, color: '#a89278', marginTop: 4 }}>
            {title.length}/{MAX_TITLE_LEN}
          </div>
        </div>

        {/* Pick members */}
        <div style={{
          padding: '4px 22px 8px',
          fontSize: 11, fontWeight: 800,
          color: '#a07a4d', textTransform: 'uppercase',
          letterSpacing: '1.4px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>Add members</span>
          <span style={{ color: '#c8956c' }}>
            {selected.size + 1}/{MAX_MEMBERS}
          </span>
        </div>

        <div style={{ padding: '0 22px 10px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your connections…"
            style={{
              width: '100%',
              padding: '9px 14px',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(200,149,108,0.25)',
              borderRadius: 100,
              fontSize: 16,
              fontFamily: 'inherit',
              outline: 'none',
              color: '#1a1208',
            }}
          />
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 18px 6px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: '#a89278', fontSize: 13 }}>
              Loading your connections…
            </div>
          ) : filtered.length === 0 ? (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: '#a89278',
              fontSize: 13,
              background: 'rgba(255,255,255,0.4)',
              borderRadius: 12,
              border: '1px dashed rgba(200,149,108,0.3)',
            }}>
              {search
                ? 'No connections match that name.'
                : 'Connect with a few creators first — they\'ll appear here.'}
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = selected.has(c.user_id);
              return (
                <button
                  key={c.user_id}
                  type="button"
                  onClick={() => toggleSelect(c.user_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    background: isSelected ? 'rgba(200,149,108,0.18)' : 'white',
                    border: `1px solid ${isSelected ? 'rgba(200,149,108,0.6)' : 'rgba(200,149,108,0.18)'}`,
                    borderRadius: 14,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <Avatar
                    src={c.avatar_url}
                    alt={c.username}
                    width={36}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1208' }}>
                      @{c.username}
                    </div>
                  </div>
                  <span style={{
                    width: 22, height: 22,
                    borderRadius: '50%',
                    background: isSelected ? '#c8956c' : 'transparent',
                    border: `2px solid ${isSelected ? '#c8956c' : '#c8956c66'}`,
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 900,
                  }}>
                    {isSelected ? '✓' : ''}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Create button */}
        <div style={{
          padding: '14px 22px 20px',
          borderTop: '1px solid rgba(200,149,108,0.12)',
        }}>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || selected.size === 0 || !title.trim()}
            style={{
              width: '100%',
              padding: 14,
              background: (creating || selected.size === 0 || !title.trim())
                ? 'rgba(200,149,108,0.4)'
                : 'linear-gradient(135deg, #c8956c, #ffb37c)',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 15,
              fontWeight: 900,
              cursor: (creating || selected.size === 0 || !title.trim()) ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
              letterSpacing: '0.4px',
            }}
          >
            {creating ? 'Creating…' :
              selected.size === 0 ? 'Add at least 1 person' :
              `Start group of ${selected.size + 1}`}
          </button>
        </div>
      </div>
    </div>
  );
}
