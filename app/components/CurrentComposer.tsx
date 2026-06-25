'use client';
// CurrentComposer — the textarea for writing a new Current (or reply).
//
// 500-char limit, soft mention hints, dark-glass treatment so it sits
// well on the ocean background. Calls onPosted with the new row when the
// insert succeeds so the parent feed can prepend it optimistically.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';

export const MAX_CURRENT_LENGTH = 500;

interface Props {
  viewerId: string;
  isSubscribed: boolean;
  /** When set, posts as a reply to this current id. */
  parentId?: string | null;
  /** Author of the parent current — used to fire a "you got a reply"
   *  notification on successful reply insert. */
  parentAuthorId?: string | null;
  /** Prefill the textarea (e.g. quick-reply with @username already filled). */
  prefill?: string;
  placeholder?: string;
  /** Called after a successful insert. Parent should refetch or prepend. */
  onPosted?: (newId: string) => void;
}

export function CurrentComposer({
  viewerId, isSubscribed, parentId = null, parentAuthorId = null,
  prefill = '', placeholder, onPosted,
}: Props) {
  const router = useRouter();
  const [body, setBody] = useState(prefill);
  const [posting, setPosting] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Auto-grow the textarea up to ~7 lines tall.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [body]);

  async function handlePost() {
    if (!isSubscribed) {
      router.push('/subscription');
      return;
    }
    const trimmed = body.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_CURRENT_LENGTH) {
      toast.error(`Currents are limited to ${MAX_CURRENT_LENGTH} characters.`);
      return;
    }
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('currents')
        .insert({
          user_id: viewerId,
          body: trimmed,
          parent_id: parentId,
        })
        .select('id')
        .single();
      if (error || !data) {
        toast.error(error?.message ?? 'Could not post your current.');
        return;
      }
      setBody('');
      toast.success(parentId ? 'Reply posted' : 'Posted to The Current');
      // Ping the parent author about the reply (never self-notify).
      if (parentId && parentAuthorId && parentAuthorId !== viewerId) {
        try {
          await supabase.from('notifications').insert({
            user_id: parentAuthorId,
            type: 'current_reply',
            title: 'Someone replied to your Current',
            body: trimmed.slice(0, 120),
            action_url: `/currents/${parentId}`,
          });
        } catch {
          // Non-fatal.
        }
      }
      onPosted?.(data.id);
    } catch (e: any) {
      console.error('[currents/composer] insert failed:', e);
      toast.error(e?.message ?? 'Could not post.');
    } finally {
      setPosting(false);
    }
  }

  const remaining = MAX_CURRENT_LENGTH - body.length;
  const tooLong = remaining < 0;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.18)',
        borderRadius: 18,
        padding: 14,
        backdropFilter: 'blur(10px)',
        color: 'white',
      }}
    >
      <textarea
        ref={ref}
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_CURRENT_LENGTH + 50))}
        placeholder={placeholder ?? "What's running through the Current?"}
        rows={3}
        className="mitype-current-composer-textarea"
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          resize: 'none',
          color: 'white',
          fontSize: 16,
          fontFamily: 'inherit',
          lineHeight: 1.5,
          padding: 0,
          minHeight: 60,
        }}
      />
      {/* Scoped placeholder color — the browser default gray is nearly
          invisible against the dark ocean background. */}
      <style>{`
        .mitype-current-composer-textarea::placeholder {
          color: rgba(255, 255, 255, 0.45);
        }
      `}</style>
      {/* Tiny mention hint — keeps users discovering the @biz/ and @goods/ syntax. */}
      <p style={{
        margin: '4px 0 8px',
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '0.2px',
      }}>
        Tip: tag people with <code style={hintCode}>@username</code>, businesses with <code style={hintCode}>@biz/handle</code>, or a Mi Home Goods listing with <code style={hintCode}>@goods/id</code>.
      </p>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: tooLong ? '#fda4af' : remaining < 50 ? '#fef08a' : 'rgba(255,255,255,0.6)',
        }}>
          {remaining}
        </span>
        <button
          type="button"
          onClick={handlePost}
          disabled={posting || !body.trim() || tooLong}
          style={{
            padding: '8px 18px',
            background: posting || !body.trim() || tooLong
              ? 'rgba(255,255,255,0.15)'
              : 'linear-gradient(135deg, #38bdf8, #0ea5e9)',
            border: 'none',
            borderRadius: 100,
            color: 'white',
            fontSize: 13,
            fontWeight: 800,
            cursor: posting || !body.trim() || tooLong ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.3px',
            boxShadow: posting || !body.trim() || tooLong
              ? 'none'
              : '0 8px 22px rgba(14,165,233,0.4)',
          }}
        >
          {posting ? 'Posting…' : (parentId ? 'Reply' : 'Drop')}
        </button>
      </div>
    </div>
  );
}

const hintCode: React.CSSProperties = {
  background: 'rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: '1px 5px',
  fontSize: 10.5,
  color: 'rgba(255,255,255,0.85)',
};
