'use client';
// Daily Spark dashboard card.
//
// Renders the "one hand-picked profile per day" card. On mount, asks the
// dailySpark library for today's pick (creating it if needed). The user
// can edit the suggested opener, hit "Send" to fire it off as a message
// request, view the full profile, or dismiss the card for the day.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import {
  getOrPickTodaysSpark,
  dismissSpark,
  type DailySpark,
} from '../lib/dailySpark';
import { normalizePrompts } from '../lib/profilePrompts';
import { Avatar } from './Avatar';
import { toast } from '../lib/toast';

interface DailySparkCardProps {
  userId: string;
}

export function DailySparkCard({ userId }: DailySparkCardProps) {
  const [loading, setLoading] = useState(true);
  const [spark, setSpark] = useState<DailySpark | null>(null);
  const [opener, setOpener] = useState('');
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await getOrPickTodaysSpark(userId);
        if (cancelled) return;
        setSpark(result);
        setOpener(result?.opener ?? '');
        if (result?.dismissed_at) setDismissed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Loading shimmer — same vibe as the rest of the dashboard.
  if (loading) {
    return (
      <div style={cardShellStyle}>
        <p style={eyebrowStyle}>✨ Daily Spark</p>
        <p style={{ color: '#a89278', fontSize: 14, margin: 0 }}>
          Picking today's spark…
        </p>
      </div>
    );
  }

  // No eligible candidates — friendly empty state, not an error.
  if (!spark) {
    return (
      <div style={cardShellStyle}>
        <p style={eyebrowStyle}>✨ Daily Spark</p>
        <p style={{ color: '#1a1208', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>
          No spark today.
        </p>
        <p style={{ color: '#a89278', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          We'll have a fresh hand-picked profile for you tomorrow. In the
          meantime, head to <Link href="/discover" style={linkInlineStyle}>Discover</Link>{' '}
          or browse <Link href="/spotlight" style={linkInlineStyle}>Spotlight</Link>.
        </p>
      </div>
    );
  }

  // User dismissed today's pick — collapsed state.
  if (dismissed) {
    return (
      <div style={cardShellStyle}>
        <p style={eyebrowStyle}>✨ Daily Spark</p>
        <p style={{ color: '#a89278', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
          Skipped for today. A new spark drops tomorrow.
        </p>
      </div>
    );
  }

  const profile = spark.profile;
  const prompts = normalizePrompts(profile.profile_prompts);
  const featuredPrompt = prompts[0] ?? null;

  async function handleSendOpener() {
    if (!opener.trim() || sending || !spark) return;
    setSending(true);

    const targetId = spark.spark_user_id;

    try {
      // 1. Record a right-swipe so this person is no longer in the discover
      //    pool either. Idempotent thanks to upsert on (user_id, target_user_id).
      await supabase.from('matches').upsert({
        user_id: userId,
        target_user_id: targetId,
        direction: 'right',
      });

      // 2. Find or create the conversation. Status starts as 'pending' since
      //    the recipient hasn't approved yet.
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, status')
        .contains('participant_ids', [userId, targetId])
        .maybeSingle();

      let conversationId = existing?.id ?? null;

      if (!conversationId) {
        const { data: created, error: convoErr } = await supabase
          .from('conversations')
          .insert({
            participant_ids: [userId, targetId],
            initiated_by: userId,
            status: 'pending',
          })
          .select('id')
          .single();

        if (convoErr || !created) {
          toast.error("Couldn't start the conversation. Try again.");
          setSending(false);
          return;
        }
        conversationId = created.id;
      }

      // 3. Send the opener. If the convo is pending and we already have a
      //    message in there from us, the messages page enforces a 1-message
      //    limit — but if we just created it, we're good.
      const { error: msgErr } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: userId,
        content: opener.trim(),
      });

      if (msgErr) {
        toast.error("Couldn't send the message. Try again.");
        setSending(false);
        return;
      }

      toast.success('Opener sent ✨');
      router.push('/messages');
    } catch {
      toast.error('Something went wrong. Try again.');
      setSending(false);
    }
  }

  async function handleSkip() {
    if (!spark) return;
    setDismissed(true); // optimistic
    await dismissSpark(spark.id);
  }

  return (
    <div style={cardShellStyle}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <p style={eyebrowStyle}>✨ Daily Spark</p>
        <button
          type="button"
          onClick={handleSkip}
          aria-label="Skip today's spark"
          style={skipButtonStyle}
        >
          Skip
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <Link
          href={profile.username ? `/profile/${profile.username}` : '#'}
          style={{ textDecoration: 'none', flexShrink: 0 }}
          aria-label={`View @${profile.username}'s profile`}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#f0e8df',
              overflow: 'hidden',
              border: '2px solid rgba(200,149,108,0.25)',
            }}
          >
            <Avatar
              src={profile.avatar_url}
              alt={profile.username ? `@${profile.username}` : 'User'}
              width={64}
              height={64}
              fallbackFontSize={28}
              sizes="64px"
            />
          </div>
        </Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={profile.username ? `/profile/${profile.username}` : '#'}
            style={{
              color: '#1a1208',
              textDecoration: 'none',
              fontSize: 18,
              fontWeight: 800,
              display: 'inline-block',
              marginBottom: 2,
            }}
          >
            @{profile.username}
          </Link>
          {Array.isArray(profile.categories) && profile.categories.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {profile.categories.slice(0, 3).map((c) => (
                <span key={c} style={chipStyle}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Highlighted prompt, if any — gives them context for the opener. */}
      {featuredPrompt && (
        <div style={promptCardStyle}>
          <p
            style={{
              color: '#c8956c',
              fontWeight: 700,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: '0 0 6px',
            }}
          >
            {featuredPrompt.prompt}
          </p>
          <p style={{ color: '#1a1208', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
            {featuredPrompt.answer}
          </p>
        </div>
      )}

      {/* Editable suggested opener. */}
      <label
        htmlFor="daily-spark-opener"
        style={{
          color: '#a89278',
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          display: 'block',
          marginBottom: 6,
        }}
      >
        Suggested opener (edit before sending)
      </label>
      <textarea
        id="daily-spark-opener"
        value={opener}
        onChange={(e) => setOpener(e.target.value)}
        rows={3}
        maxLength={500}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 14,
          border: '1px solid rgba(200,149,108,0.25)',
          background: '#faf6f0',
          fontSize: 14,
          color: '#1a1208',
          fontFamily: 'inherit',
          resize: 'vertical',
          lineHeight: 1.5,
          outline: 'none',
          marginBottom: 14,
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleSendOpener}
          disabled={sending || !opener.trim()}
          aria-label="Send opener as a message request"
          style={{
            padding: '12px 22px',
            background: sending || !opener.trim() ? '#d4a882' : '#c8956c',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 14,
            fontWeight: 700,
            cursor: sending || !opener.trim() ? 'not-allowed' : 'pointer',
            flex: '1 1 auto',
            minWidth: 140,
          }}
        >
          {sending ? 'Sending…' : 'Send opener ✨'}
        </button>
        {profile.username && (
          <Link
            href={`/profile/${profile.username}`}
            style={{
              padding: '12px 22px',
              background: 'rgba(200,149,108,0.1)',
              color: '#c8956c',
              border: '1px solid rgba(200,149,108,0.25)',
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 700,
              textDecoration: 'none',
              textAlign: 'center',
              flex: '0 0 auto',
            }}
          >
            View profile
          </Link>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles (inline so the card matches the rest of the dashboard's "no global
// CSS" pattern)
// ---------------------------------------------------------------------------

const cardShellStyle: React.CSSProperties = {
  background:
    'linear-gradient(135deg, rgba(255,243,236,0.9) 0%, rgba(255,248,236,0.95) 100%)',
  border: '1px solid rgba(200,149,108,0.25)',
  borderRadius: 24,
  padding: '24px 28px',
  marginBottom: 32,
  boxShadow: '0 4px 20px rgba(200,149,108,0.08)',
};

const eyebrowStyle: React.CSSProperties = {
  color: '#c8956c',
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  margin: 0,
};

const skipButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid rgba(200,149,108,0.3)',
  color: '#a89278',
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 100,
  padding: '6px 14px',
  cursor: 'pointer',
};

const linkInlineStyle: React.CSSProperties = {
  color: '#c8956c',
  fontWeight: 700,
  textDecoration: 'underline',
};

const chipStyle: React.CSSProperties = {
  background: 'rgba(200,149,108,0.12)',
  border: '1px solid rgba(200,149,108,0.2)',
  color: '#c8956c',
  padding: '3px 10px',
  borderRadius: 100,
  fontSize: 11,
  fontWeight: 600,
};

const promptCardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(200,149,108,0.18)',
  borderRadius: 14,
  padding: '14px 16px',
  marginBottom: 18,
};
