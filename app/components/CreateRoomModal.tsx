'use client';
// CreateRoomModal — modal flow for spinning up a new public or
// invite-only room.
//
// Differences from CreateGroupModal:
//   - You don't pick members upfront. The creator is the only initial
//     participant; others join via Discover (public) or invite (private).
//   - You set: title (required), short description (required, up to
//     280 chars), category (required, picked from ROOM_CATEGORIES),
//     and a visibility toggle (public ↔ invite-only).
//   - On success it inserts a `conversations` row with kind='room',
//     status='approved', creator + participant_ids = [me], and the
//     creator's id pre-populated in moderator_ids.

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { ROOM_CATEGORIES, type RoomCategoryEntry } from '../lib/roomCategories';

interface Props {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  /** Called with the new conversation row id once the room is created. */
  onCreated: (conversationId: string) => void;
}

const MAX_TITLE_LEN = 60;
const MAX_DESC_LEN = 280;

export function CreateRoomModal({ open, onClose, currentUserId, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RoomCategoryEntry | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setDescription('');
      setCategory(null);
      setIsPublic(true);
    }
  }, [open]);

  const valid = title.trim().length > 0
    && description.trim().length > 0
    && !!category;

  async function handleCreate() {
    if (!valid) {
      toast.error('Title, description, and category are all required.');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          kind: 'room',
          title: title.trim().slice(0, MAX_TITLE_LEN),
          description: description.trim().slice(0, MAX_DESC_LEN),
          category: category!.key,
          is_public: isPublic,
          participant_ids: [currentUserId],
          initiated_by: currentUserId,
          creator_id: currentUserId,
          moderator_ids: [currentUserId],
          status: 'approved',
        })
        .select('id')
        .single();
      if (error) throw error;
      if (data?.id) {
        toast.success('Room created');
        onCreated(data.id);
        onClose();
      }
    } catch (e: any) {
      console.error('[create-room] insert failed:', e);
      toast.error(e?.message ?? 'Could not create the room.');
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create a room"
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
          maxWidth: 460,
          maxHeight: 'min(92vh, 820px)',
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
          <div>
            <h2 style={{
              margin: 0,
              fontSize: 21,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: '-0.5px',
            }}>
              New room
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#7a6a4f' }}>
              A persistent space where creators with a shared interest can hang out.
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

        {/* Form */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 22px 14px',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* Title */}
          <div>
            <FieldLabel>Room name</FieldLabel>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LEN))}
              placeholder="LA filmmakers, Etsy starters, home bakers PNW…"
              maxLength={MAX_TITLE_LEN}
              style={fieldStyle}
            />
            <CharCount value={title.length} max={MAX_TITLE_LEN} />
          </div>

          {/* Description */}
          <div>
            <FieldLabel>What is this room about?</FieldLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC_LEN))}
              placeholder="A few sentences explaining the vibe. Who should join? What gets posted?"
              rows={3}
              style={{ ...fieldStyle, fontFamily: 'inherit', resize: 'vertical', minHeight: 80 }}
            />
            <CharCount value={description.length} max={MAX_DESC_LEN} />
          </div>

          {/* Category picker */}
          <div>
            <FieldLabel>Category</FieldLabel>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 6,
            }}>
              {ROOM_CATEGORIES.map((c) => {
                const active = category?.key === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 10px',
                      background: active
                        ? 'linear-gradient(135deg, #c8956c, #ffb37c)'
                        : 'white',
                      border: active
                        ? '1px solid #c8956c'
                        : '1px solid rgba(200,149,108,0.25)',
                      borderRadius: 100,
                      color: active ? 'white' : '#5b4a36',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={c.tagline}
                  >
                    <span aria-hidden="true" style={{ fontSize: 14 }}>{c.emoji}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>
                  </button>
                );
              })}
            </div>
            {category && (
              <p style={{ fontSize: 11, color: '#a07a4d', marginTop: 6 }}>
                {category.tagline}
              </p>
            )}
          </div>

          {/* Visibility */}
          <div>
            <FieldLabel>Visibility</FieldLabel>
            <div style={{ display: 'flex', gap: 8 }}>
              <VisibilityToggle
                label="Public"
                desc="Anyone on Mitype can find and join."
                active={isPublic}
                onClick={() => setIsPublic(true)}
              />
              <VisibilityToggle
                label="Invite only"
                desc="Members can only join via your invite."
                active={!isPublic}
                onClick={() => setIsPublic(false)}
              />
            </div>
          </div>
        </div>

        {/* Create button */}
        <div style={{
          padding: '14px 22px 20px',
          borderTop: '1px solid rgba(200,149,108,0.12)',
        }}>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating || !valid}
            style={{
              width: '100%',
              padding: 14,
              background: (creating || !valid)
                ? 'rgba(200,149,108,0.4)'
                : 'linear-gradient(135deg, #c8956c, #ffb37c)',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 15,
              fontWeight: 900,
              cursor: (creating || !valid) ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 8px 22px rgba(200,149,108,0.4)',
              letterSpacing: '0.4px',
            }}
          >
            {creating ? 'Creating…' : `Create ${isPublic ? 'public' : 'private'} room`}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{
      display: 'block',
      fontSize: 11, fontWeight: 800,
      color: '#a07a4d', textTransform: 'uppercase',
      letterSpacing: '1.4px',
      marginBottom: 6,
    }}>
      {children}
    </label>
  );
}

function CharCount({ value, max }: { value: number; max: number }) {
  return (
    <div style={{
      fontSize: 11,
      color: value > max * 0.9 ? '#dc2626' : '#a89278',
      marginTop: 4,
    }}>
      {value}/{max}
    </div>
  );
}

function VisibilityToggle({ label, desc, active, onClick }: {
  label: string; desc: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 14px',
        background: active
          ? 'linear-gradient(135deg, rgba(200,149,108,0.18), rgba(255,179,124,0.12))'
          : 'white',
        border: active
          ? '1.5px solid #c8956c'
          : '1px solid rgba(200,149,108,0.25)',
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: active ? '#5b4a36' : '#1a1208', marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: '#8a7560', lineHeight: 1.3 }}>
        {desc}
      </div>
    </button>
  );
}

const fieldStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  background: 'white',
  border: '1px solid rgba(200,149,108,0.3)',
  borderRadius: 12,
  fontSize: 16,
  outline: 'none',
  color: '#1a1208',
};
