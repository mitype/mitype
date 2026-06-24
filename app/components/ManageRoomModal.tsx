'use client';
// ManageRoomModal — moderation surface for rooms.
//
// Opens when a member taps the room title in the chat header. Behavior
// depends on the viewer's role:
//
//   - Member (default): sees the daily prompt + member list. Can leave
//     the room (button at the bottom).
//   - Moderator (creator OR in moderator_ids): also gets the
//     "Set/clear daily prompt" form, and a small × next to each member
//     row to kick them.
//
// Used for both rooms AND groups — for groups, the daily prompt is
// hidden (groups don't surface a prompt) but member management still
// works. The component infers behavior from `convo.kind`.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { Avatar } from './Avatar';
import { roomCategoryEmoji, roomCategoryLabel } from '../lib/roomCategories';

interface MemberProfile {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  convo: any; // the full conversation row
  currentUserId: string;
  /** Called after the viewer leaves the convo so the page can drop selection. */
  onLeft?: () => void;
  /** Called when the room title / prompt / members change so the caller can refresh. */
  onChanged?: () => void;
}

const MAX_PROMPT_LEN = 200;

export function ManageRoomModal({ open, onClose, convo, currentUserId, onLeft, onChanged }: Props) {
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const isModerator =
    convo?.creator_id === currentUserId ||
    (convo?.moderator_ids ?? []).includes(currentUserId);
  const isCreator = convo?.creator_id === currentUserId;
  const isRoom = convo?.kind === 'room';
  const isGroup = convo?.kind === 'group';

  useEffect(() => {
    if (!open || !convo) return;
    setPrompt(convo.daily_prompt ?? '');
    let cancelled = false;
    (async () => {
      setLoading(true);
      const ids: string[] = convo.participant_ids ?? [];
      if (ids.length === 0) {
        setMembers([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', ids);
      if (cancelled) return;
      const map = new Map<string, MemberProfile>(
        (data ?? []).map((p: any) => [p.user_id, p])
      );
      // Preserve participant_ids order
      const ordered = ids
        .map((id) => map.get(id))
        .filter((m): m is MemberProfile => !!m);
      setMembers(ordered);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, convo]);

  async function saveDailyPrompt() {
    if (!isModerator) return;
    setSavingPrompt(true);
    try {
      const trimmed = prompt.trim().slice(0, MAX_PROMPT_LEN);
      const { error } = await supabase
        .from('conversations')
        .update({
          daily_prompt: trimmed.length > 0 ? trimmed : null,
          daily_prompt_set_at: trimmed.length > 0 ? new Date().toISOString() : null,
        })
        .eq('id', convo.id);
      if (error) throw error;
      toast.success(trimmed.length > 0 ? 'Prompt set' : 'Prompt cleared');
      onChanged?.();
    } catch (e: any) {
      console.error('[manage-room] prompt save:', e);
      toast.error(e?.message ?? 'Could not save the prompt.');
    } finally {
      setSavingPrompt(false);
    }
  }

  async function kickMember(memberId: string) {
    if (!isModerator) return;
    if (memberId === convo.creator_id) {
      toast.error("You can't remove the room creator.");
      return;
    }
    if (memberId === currentUserId) {
      toast.error('Use the Leave button instead.');
      return;
    }
    if (!confirm('Remove this member from the room?')) return;
    setBusyId(memberId);
    try {
      const newIds = convo.participant_ids.filter((id: string) => id !== memberId);
      const newMods = (convo.moderator_ids ?? []).filter((id: string) => id !== memberId);
      const { error } = await supabase
        .from('conversations')
        .update({ participant_ids: newIds, moderator_ids: newMods, updated_at: new Date().toISOString() })
        .eq('id', convo.id);
      if (error) throw error;
      setMembers((prev) => prev.filter((m) => m.user_id !== memberId));
      toast.success('Member removed');
      onChanged?.();
    } catch (e: any) {
      console.error('[manage-room] kick:', e);
      toast.error(e?.message ?? 'Could not remove that member.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleLeave() {
    if (isCreator) {
      toast.error("The creator can't leave. Delete the room from the inbox instead.");
      return;
    }
    if (!confirm(`Leave ${convo.title || 'this conversation'}?`)) return;
    setLeaving(true);
    try {
      const newIds = convo.participant_ids.filter((id: string) => id !== currentUserId);
      const newMods = (convo.moderator_ids ?? []).filter((id: string) => id !== currentUserId);
      const { error } = await supabase
        .from('conversations')
        .update({ participant_ids: newIds, moderator_ids: newMods, updated_at: new Date().toISOString() })
        .eq('id', convo.id);
      if (error) throw error;
      toast.success('Left');
      onLeft?.();
      onClose();
    } catch (e: any) {
      console.error('[manage-room] leave:', e);
      toast.error(e?.message ?? 'Could not leave.');
    } finally {
      setLeaving(false);
    }
  }

  if (!open || !convo) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isRoom ? 'Manage room' : 'Manage group'}
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
          <div style={{ minWidth: 0 }}>
            <h2 style={{
              margin: 0,
              fontSize: 20,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: '-0.5px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {convo.title || (isRoom ? 'Room' : 'Group')}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#7a6a4f' }}>
              {isRoom
                ? `${roomCategoryEmoji(convo.category)} ${roomCategoryLabel(convo.category)} · ${members.length} members`
                : `${members.length} members`}
            </p>
          </div>
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
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 22px 14px',
          display: 'flex', flexDirection: 'column', gap: 18,
        }}>
          {/* Room description (read-only for now) */}
          {isRoom && convo.description && (
            <div>
              <SectionLabel>About this room</SectionLabel>
              <p style={{
                margin: 0,
                fontSize: 13, color: '#5b4a36', lineHeight: 1.5,
              }}>
                {convo.description}
              </p>
            </div>
          )}

          {/* Daily prompt (rooms only) */}
          {isRoom && (
            <div>
              <SectionLabel>
                Daily prompt
                {!isModerator && <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.7 }}>(moderator only)</span>}
              </SectionLabel>
              {isModerator ? (
                <>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LEN))}
                    placeholder="Set a daily discussion prompt to spark conversation…"
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      background: 'white',
                      border: '1px solid rgba(200,149,108,0.3)',
                      borderRadius: 12,
                      fontSize: 14,
                      outline: 'none',
                      color: '#1a1208',
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      minHeight: 64,
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 6,
                  }}>
                    <span style={{ fontSize: 11, color: '#a89278' }}>
                      {prompt.length}/{MAX_PROMPT_LEN}
                    </span>
                    <button
                      type="button"
                      onClick={saveDailyPrompt}
                      disabled={savingPrompt}
                      style={{
                        padding: '6px 14px',
                        background: 'linear-gradient(135deg, #c8956c, #ffb37c)',
                        color: 'white',
                        border: 'none',
                        borderRadius: 100,
                        fontSize: 12, fontWeight: 800,
                        cursor: savingPrompt ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {savingPrompt ? 'Saving…' : prompt.trim().length === 0 ? 'Clear' : 'Save prompt'}
                    </button>
                  </div>
                </>
              ) : (
                <p style={{
                  margin: 0,
                  padding: '10px 14px',
                  background: convo.daily_prompt
                    ? 'rgba(255,213,168,0.18)'
                    : 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(200,149,108,0.2)',
                  borderRadius: 12,
                  fontSize: 13,
                  color: convo.daily_prompt ? '#5b4a36' : '#a89278',
                  fontStyle: convo.daily_prompt ? 'normal' : 'italic',
                }}>
                  {convo.daily_prompt || 'No prompt set right now.'}
                </p>
              )}
            </div>
          )}

          {/* Member list */}
          <div>
            <SectionLabel>Members ({members.length})</SectionLabel>
            {loading ? (
              <p style={{ fontSize: 12, color: '#a89278' }}>Loading…</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {members.map((m) => {
                  const memberIsCreator = m.user_id === convo.creator_id;
                  const memberIsMod = !memberIsCreator && (convo.moderator_ids ?? []).includes(m.user_id);
                  const isMe = m.user_id === currentUserId;
                  const canKick = isModerator && !memberIsCreator && !isMe;
                  return (
                    <div
                      key={m.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        background: 'white',
                        border: '1px solid rgba(200,149,108,0.18)',
                        borderRadius: 12,
                      }}
                    >
                      <Avatar src={m.avatar_url} alt={`@${m.username}`} width={32} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1208' }}>
                          @{m.username}{isMe && <span style={{ color: '#a89278', fontWeight: 400, marginLeft: 4 }}>· you</span>}
                        </div>
                        {(memberIsCreator || memberIsMod) && (
                          <div style={{ fontSize: 10, color: '#c8956c', fontWeight: 800, letterSpacing: '0.5px' }}>
                            {memberIsCreator ? 'CREATOR' : 'MODERATOR'}
                          </div>
                        )}
                      </div>
                      {canKick && (
                        <button
                          type="button"
                          onClick={() => kickMember(m.user_id)}
                          disabled={busyId === m.user_id}
                          aria-label={`Remove @${m.username}`}
                          title="Remove from room"
                          style={{
                            width: 26, height: 26,
                            background: 'rgba(220,90,90,0.1)',
                            border: '1px solid rgba(220,90,90,0.3)',
                            borderRadius: '50%',
                            color: '#c07070',
                            fontSize: 13,
                            cursor: busyId === m.user_id ? 'wait' : 'pointer',
                            fontFamily: 'inherit',
                            flexShrink: 0,
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Leave button — non-creators only */}
        {!isCreator && (
          <div style={{
            padding: '14px 22px 20px',
            borderTop: '1px solid rgba(200,149,108,0.12)',
          }}>
            <button
              type="button"
              onClick={handleLeave}
              disabled={leaving}
              style={{
                width: '100%',
                padding: 12,
                background: 'rgba(220,90,90,0.08)',
                color: '#c07070',
                border: '1px solid rgba(220,90,90,0.3)',
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 800,
                cursor: leaving ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {leaving ? 'Leaving…' : (isGroup ? 'Leave group' : 'Leave room')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800,
      color: '#a07a4d', textTransform: 'uppercase',
      letterSpacing: '1.4px',
      marginBottom: 8,
    }}>
      {children}
    </div>
  );
}
