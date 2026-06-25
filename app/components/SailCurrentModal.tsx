'use client';
// SailCurrentModal — opens when a user taps the boat icon on a current.
//
// Lists the viewer's existing 1:1 conversations so they can "sail" the
// current's body + link into one of those threads as a fresh message.
// We only show direct conversations (status='accepted' or 'active'),
// not group rooms — sailing into a public room would feel like spam.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { Avatar } from './Avatar';

interface ConversationRow {
  id: string;
  participant_ids: string[];
  status: string;
}
interface DisplayRow {
  conversation_id: string;
  other_user_id: string;
  other_username: string;
  other_avatar_url: string | null;
}

interface Props {
  open: boolean;
  viewerId: string;
  currentId: string;
  currentBody: string;
  currentAuthorUsername: string | null;
  onClose: () => void;
}

export function SailCurrentModal({
  open, viewerId, currentId, currentBody, currentAuthorUsername, onClose,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const { data: convos } = await supabase
          .from('conversations')
          .select('id, participant_ids, status')
          .contains('participant_ids', [viewerId])
          .neq('status', 'rejected')
          .limit(80);
        const valid = (convos ?? []).filter((c: ConversationRow) =>
          c.participant_ids && c.participant_ids.length === 2,
        );
        if (valid.length === 0) {
          setRows([]);
          setLoading(false);
          return;
        }
        const otherIds = Array.from(new Set(
          valid.map((c: ConversationRow) => c.participant_ids.find((id) => id !== viewerId)!),
        ));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, username, avatar_url')
          .in('user_id', otherIds);
        const profMap = new Map<string, any>(
          (profiles ?? []).map((p: any) => [p.user_id, p]),
        );
        const display = valid.map((c: ConversationRow) => {
          const otherId = c.participant_ids.find((id) => id !== viewerId)!;
          const p = profMap.get(otherId);
          return {
            conversation_id: c.id,
            other_user_id: otherId,
            other_username: p?.username ?? 'mitype member',
            other_avatar_url: p?.avatar_url ?? null,
          };
        });
        setRows(display);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, viewerId]);

  async function sail(row: DisplayRow) {
    setSending(row.conversation_id);
    try {
      const snippet = currentBody.length > 200
        ? currentBody.slice(0, 197) + '…'
        : currentBody;
      const fromLine = currentAuthorUsername
        ? `Sailed a current from @${currentAuthorUsername}:`
        : 'Sailed a current:';
      const url = `${typeof window !== 'undefined' ? window.location.origin : ''}/currents/${currentId}`;
      const content = `${fromLine}\n\n"${snippet}"\n\n${url}`;
      const { error } = await supabase.from('messages').insert({
        conversation_id: row.conversation_id,
        sender_id: viewerId,
        content,
      });
      if (error) {
        toast.error(error.message ?? 'Could not sail the current.');
        return;
      }
      toast.success(`Sailed to @${row.other_username}`);
      onClose();
      // Optional: jump to that thread so the sender sees the result.
      router.push(`/messages?user=${row.other_user_id}`);
    } catch (e: any) {
      console.error('[sail-current] failed:', e);
      toast.error(e?.message ?? 'Could not sail the current.');
    } finally {
      setSending(null);
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sail this current to a friend"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 3000, padding: 16,
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 460,
          maxHeight: 'min(86vh, 720px)',
          background: 'linear-gradient(180deg, #0a2540 0%, #051324 100%)',
          color: 'white',
          border: '1px solid rgba(56,189,248,0.35)',
          borderRadius: 22,
          boxShadow: '0 32px 70px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '20px 22px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <p style={{
              margin: 0,
              fontSize: 11, fontWeight: 800,
              letterSpacing: '1.4px', textTransform: 'uppercase',
              color: '#7dd3fc',
            }}>
              Sail this current
            </p>
            <h2 style={{
              margin: '6px 0 0',
              fontSize: 18, fontWeight: 900,
              letterSpacing: '-0.3px',
              color: 'white',
            }}>
              Pick someone to send it to
            </h2>
          </div>
          <button
            type="button" onClick={onClose} aria-label="Close"
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: 'none',
              color: 'white', fontSize: 16, cursor: 'pointer', flexShrink: 0,
              fontFamily: 'inherit',
            }}
          >✕</button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto', padding: '12px 14px 18px',
        }}>
          {loading ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', padding: 24 }}>
              Loading your conversations…
            </p>
          ) : rows.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.65)', textAlign: 'center', padding: 24, fontSize: 13 }}>
              No direct conversations yet. Message someone first, then come back to sail this current.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {rows.map((row) => (
                <button
                  key={row.conversation_id}
                  type="button"
                  onClick={() => sail(row)}
                  disabled={sending !== null}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: 10,
                    background: sending === row.conversation_id
                      ? 'rgba(125,211,252,0.18)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 14,
                    cursor: sending ? 'wait' : 'pointer',
                    color: 'white',
                    fontFamily: 'inherit',
                    textAlign: 'left',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    overflow: 'hidden', background: '#0a2540',
                    flexShrink: 0,
                  }}>
                    <Avatar
                      src={row.other_avatar_url}
                      alt={row.other_username}
                      width={38}
                      height={38}
                      fallbackFontSize={16}
                      sizes="38px"
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 14, fontWeight: 800, color: 'white',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      @{row.other_username}
                    </div>
                  </div>
                  <span aria-hidden="true" style={{
                    color: '#7dd3fc', fontSize: 18, fontWeight: 800,
                  }}>
                    {sending === row.conversation_id ? '⏳' : '⛵'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
