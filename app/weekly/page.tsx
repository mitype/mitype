'use client';
// Weekly Creative Prompt
// ----------------------
// One curated prompt per ISO week. Members write a single answer and can
// upvote each other's. The active prompt is derived from the week key
// (no admin tooling). Subscription-gated, same as /discover and /spotlight.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { Avatar } from '../components/Avatar';
import { Coachmark } from '../components/Coachmark';
import { Skeleton } from '../components/Skeleton';
import { sanitizeText } from '../lib/sanitize';
import { toast } from '../lib/toast';
import {
  currentWeekKey,
  getPromptForWeekKey,
  weekRangeLabel,
  MAX_ANSWER_LENGTH,
} from '../lib/weeklyPrompts';

interface AnswerRow {
  id: string;
  user_id: string;
  week_key: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

interface ProfileMini {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

interface DisplayAnswer {
  row: AnswerRow;
  profile: ProfileMini | null;
  voteCount: number;
  viewerHasVoted: boolean;
}

export default function WeeklyPromptPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<DisplayAnswer[]>([]);
  const [myAnswer, setMyAnswer] = useState<AnswerRow | null>(null);
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const weekKey = useMemo(() => currentWeekKey(), []);
  const prompt = useMemo(() => getPromptForWeekKey(weekKey), [weekKey]);
  const weekLabel = useMemo(() => weekRangeLabel(weekKey), [weekKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!authUser) {
        router.push('/login');
        return;
      }
      setUser(authUser);

      // Same subscription gate as the rest of the app.
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (cancelled) return;
      const isSubscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (!isSubscribed) {
        router.push('/subscription');
        return;
      }
      setAuthed(true);

      await loadFeed(authUser.id);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router, weekKey]);

  /**
   * Pulls every answer for this week, attaches author profiles + vote info,
   * and updates state. Called on mount and after any write.
   */
  async function loadFeed(uid: string) {
    const { data: rows } = await supabase
      .from('creative_prompt_answers')
      .select('id, user_id, week_key, answer, created_at, updated_at')
      .eq('week_key', weekKey)
      .order('created_at', { ascending: true });

    const answerRows: AnswerRow[] = (rows ?? []) as AnswerRow[];
    const mine = answerRows.find((r) => r.user_id === uid) ?? null;
    setMyAnswer(mine);
    if (mine && !editing) setDraft(mine.answer);

    if (answerRows.length === 0) {
      setAnswers([]);
      return;
    }

    const userIds = [...new Set(answerRows.map((r) => r.user_id))];
    const answerIds = answerRows.map((r) => r.id);

    const [profilesRes, votesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds),
      supabase
        .from('creative_prompt_votes')
        .select('answer_id, voter_id')
        .in('answer_id', answerIds),
    ]);

    const profileMap = new Map<string, ProfileMini>();
    (profilesRes.data ?? []).forEach((p: any) => {
      if (p?.user_id) profileMap.set(p.user_id, p as ProfileMini);
    });

    // Tally votes per answer + remember which ones the viewer has voted on.
    const voteCounts = new Map<string, number>();
    const viewerVoted = new Set<string>();
    (votesRes.data ?? []).forEach((v: any) => {
      voteCounts.set(v.answer_id, (voteCounts.get(v.answer_id) ?? 0) + 1);
      if (v.voter_id === uid) viewerVoted.add(v.answer_id);
    });

    const display: DisplayAnswer[] = answerRows.map((row) => ({
      row,
      profile: profileMap.get(row.user_id) ?? null,
      voteCount: voteCounts.get(row.id) ?? 0,
      viewerHasVoted: viewerVoted.has(row.id),
    }));

    // Rank by votes desc, then earliest first as a tiebreaker so newcomers
    // who post early aren't perpetually buried.
    display.sort((a, b) => {
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.row.created_at.localeCompare(b.row.created_at);
    });

    setAnswers(display);
  }

  // ---- Submit / edit own answer -----------------------------------------

  async function handleSubmit() {
    if (!user || !draft.trim() || submitting) return;
    if (draft.trim().length > MAX_ANSWER_LENGTH) return;
    setSubmitting(true);

    if (myAnswer) {
      // Update existing answer (RLS allows update of own row).
      const { error } = await supabase
        .from('creative_prompt_answers')
        .update({
          answer: draft.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', myAnswer.id);

      if (error) {
        toast.error("Couldn't save your answer. Try again.");
        setSubmitting(false);
        return;
      }
      toast.success('Answer updated ✨');
    } else {
      // Insert new answer for this week.
      const { error } = await supabase
        .from('creative_prompt_answers')
        .insert({
          user_id: user.id,
          week_key: weekKey,
          answer: draft.trim(),
        });

      if (error) {
        toast.error("Couldn't post your answer. Try again.");
        setSubmitting(false);
        return;
      }
      toast.success('Posted ✨');
    }

    setEditing(false);
    await loadFeed(user.id);
    setSubmitting(false);
  }

  async function handleDeleteOwn() {
    if (!user || !myAnswer) return;
    const ok = window.confirm(
      'Delete your answer? You can post a new one this week if you change your mind.'
    );
    if (!ok) return;
    const { error } = await supabase
      .from('creative_prompt_answers')
      .delete()
      .eq('id', myAnswer.id);
    if (error) {
      toast.error("Couldn't delete. Try again.");
      return;
    }
    setMyAnswer(null);
    setDraft('');
    setEditing(false);
    await loadFeed(user.id);
  }

  // ---- Vote toggle ------------------------------------------------------

  async function toggleVote(answerId: string, currentlyVoted: boolean) {
    if (!user) return;

    // Optimistic update — reflect the change immediately, roll back on error.
    setAnswers((prev) =>
      prev.map((a) =>
        a.row.id === answerId
          ? {
              ...a,
              viewerHasVoted: !currentlyVoted,
              voteCount: a.voteCount + (currentlyVoted ? -1 : 1),
            }
          : a
      )
    );

    if (currentlyVoted) {
      const { error } = await supabase
        .from('creative_prompt_votes')
        .delete()
        .eq('voter_id', user.id)
        .eq('answer_id', answerId);
      if (error) {
        toast.error("Couldn't remove vote.");
        await loadFeed(user.id);
      }
    } else {
      const { error } = await supabase
        .from('creative_prompt_votes')
        .insert({ voter_id: user.id, answer_id: answerId });
      if (error) {
        toast.error("Couldn't vote.");
        await loadFeed(user.id);
      }
    }
  }

  if (!authed && loading) return <PageSkeleton weekLabel={weekLabel} promptText={prompt.text} />;

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        paddingBottom: 80,
      }}
    >

      <Coachmark storageKey="mitype-coachmark-weekly-v1" title="The Weekly prompt">
        Each week we drop a creative prompt. Post <strong>one answer</strong> —
        upvote the ones you love, and the highest-voted rises to the top.
        Fresh prompt every Monday.
      </Coachmark>

      {/* Nav */}
      <nav
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 40px',
          borderBottom: '1px solid rgba(200,149,108,0.15)',
          background: 'rgba(250,246,240,0.9)',
          backdropFilter: 'blur(10px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Link
          href="/dashboard"
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: '#c8956c',
            letterSpacing: '-1px',
            textDecoration: 'none',
          }}
        >
          mitype
        </Link>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={navLinkStyle}>Dashboard</Link>
          <Link href="/discover" style={navLinkStyle}>Discover</Link>
          <Link href="/spotlight" style={navLinkStyle}>Spotlight</Link>
          <Link
            href="/weekly"
            style={{ ...navLinkStyle, color: '#c8956c', background: 'rgba(200,149,108,0.1)' }}
          >
            Weekly
          </Link>
          <Link href="/messages" style={navLinkStyle}>Messages</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px 0' }}>
        {/* Hero */}
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(255,243,236,0.95) 0%, rgba(255,248,236,0.95) 100%)',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 28,
            padding: '32px 32px 28px',
            marginBottom: 28,
            boxShadow: '0 4px 24px rgba(200,149,108,0.08)',
          }}
        >
          <p
            style={{
              color: '#c8956c',
              fontSize: 12,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              margin: '0 0 12px',
            }}
          >
            ✨ Weekly Creative Prompt · {weekLabel}
          </p>
          <h1
            style={{
              fontSize: 34,
              fontWeight: 900,
              color: '#1a1208',
              letterSpacing: '-0.5px',
              lineHeight: 1.15,
              margin: '0 0 12px',
            }}
          >
            {prompt.text}
          </h1>
          <p style={{ color: '#8a7560', fontSize: 15, lineHeight: 1.5, margin: 0 }}>
            {prompt.tagline}
          </p>
        </div>

        {/* Compose / your-answer area */}
        <ComposeBlock
          loading={loading}
          myAnswer={myAnswer}
          editing={editing}
          draft={draft}
          submitting={submitting}
          onChangeDraft={setDraft}
          onStartEdit={() => {
            setEditing(true);
            setDraft(myAnswer?.answer ?? '');
          }}
          onCancelEdit={() => {
            setEditing(false);
            setDraft(myAnswer?.answer ?? '');
          }}
          onSubmit={handleSubmit}
          onDelete={handleDeleteOwn}
        />

        {/* Community feed */}
        <div style={{ marginTop: 36 }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#1a1208',
              marginBottom: 4,
            }}
          >
            Community answers
          </h2>
          <p style={{ color: '#a89278', fontSize: 13, margin: '0 0 20px' }}>
            Ranked by upvotes. Tap an avatar to view a profile.
          </p>

          {loading && <FeedSkeleton />}

          {!loading && answers.length === 0 && (
            <div
              style={{
                background: 'white',
                border: '1px dashed rgba(200,149,108,0.3)',
                borderRadius: 20,
                padding: '40px 24px',
                textAlign: 'center',
                color: '#a89278',
              }}
            >
              <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
              <p style={{ fontSize: 14, margin: 0 }}>
                No answers yet this week. Be the first.
              </p>
            </div>
          )}

          {!loading && answers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {answers.map((a) => (
                <AnswerCard
                  key={a.row.id}
                  data={a}
                  isMine={!!user && a.row.user_id === user.id}
                  onToggleVote={() => toggleVote(a.row.id, a.viewerHasVoted)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ===========================================================================
// Subcomponents
// ===========================================================================

interface ComposeBlockProps {
  loading: boolean;
  myAnswer: AnswerRow | null;
  editing: boolean;
  draft: string;
  submitting: boolean;
  onChangeDraft: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmit: () => void;
  onDelete: () => void;
}

function ComposeBlock({
  loading,
  myAnswer,
  editing,
  draft,
  submitting,
  onChangeDraft,
  onStartEdit,
  onCancelEdit,
  onSubmit,
  onDelete,
}: ComposeBlockProps) {
  if (loading) {
    return (
      <div
        style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.18)',
          borderRadius: 20,
          padding: 24,
        }}
      >
        <Skeleton width="40%" height={14} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={80} radius={12} />
      </div>
    );
  }

  const remaining = MAX_ANSWER_LENGTH - draft.trim().length;
  const overLimit = remaining < 0;
  const showEditor = !myAnswer || editing;

  // Static read-only display when the user has already answered + isn't editing.
  if (!showEditor && myAnswer) {
    return (
      <div
        style={{
          background: 'white',
          border: '1px solid rgba(200,149,108,0.18)',
          borderRadius: 20,
          padding: '20px 24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <p
            style={{
              color: '#c8956c',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              margin: 0,
            }}
          >
            ✓ Your answer
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={onStartEdit}
              aria-label="Edit your answer"
              style={smallButtonStyle}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={onDelete}
              aria-label="Delete your answer"
              style={{ ...smallButtonStyle, color: '#c07070', borderColor: 'rgba(220,100,100,0.25)' }}
            >
              Delete
            </button>
          </div>
        </div>
        <p
          style={{
            color: '#1a1208',
            fontSize: 15,
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {sanitizeText(myAnswer.answer)}
        </p>
      </div>
    );
  }

  // Editor mode (no existing answer, or "Edit" was tapped).
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid rgba(200,149,108,0.18)',
        borderRadius: 20,
        padding: '20px 24px',
      }}
    >
      <p
        style={{
          color: '#c8956c',
          fontSize: 12,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          margin: '0 0 12px',
        }}
      >
        {myAnswer ? 'Editing your answer' : 'Your answer'}
      </p>
      <textarea
        value={draft}
        onChange={(e) => onChangeDraft(e.target.value)}
        rows={5}
        maxLength={MAX_ANSWER_LENGTH + 50 /* let them type past, validate on submit */}
        placeholder="Take your time. A few honest sentences beats a clever one-liner."
        style={{
          width: '100%',
          padding: '14px 16px',
          borderRadius: 14,
          border: `1px solid ${overLimit ? '#c07070' : 'rgba(200,149,108,0.25)'}`,
          background: '#faf6f0',
          fontSize: 15,
          color: '#1a1208',
          fontFamily: 'inherit',
          resize: 'vertical',
          lineHeight: 1.6,
          outline: 'none',
          marginBottom: 10,
          boxSizing: 'border-box',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <p
          style={{
            color: overLimit ? '#c07070' : '#a89278',
            fontSize: 12,
            margin: 0,
          }}
        >
          {overLimit
            ? `${Math.abs(remaining)} characters over the limit`
            : `${remaining} characters left`}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          {myAnswer && (
            <button
              type="button"
              onClick={onCancelEdit}
              aria-label="Cancel edit"
              style={smallButtonStyle}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || !draft.trim() || overLimit}
            aria-label={myAnswer ? 'Save answer' : 'Post answer'}
            style={{
              padding: '10px 22px',
              background: submitting || !draft.trim() || overLimit ? '#d4a882' : '#c8956c',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 14,
              fontWeight: 700,
              cursor:
                submitting || !draft.trim() || overLimit ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting
              ? 'Saving…'
              : myAnswer
              ? 'Save changes'
              : 'Post answer ✨'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AnswerCardProps {
  data: DisplayAnswer;
  isMine: boolean;
  onToggleVote: () => void;
}

function AnswerCard({ data, isMine, onToggleVote }: AnswerCardProps) {
  const { row, profile, voteCount, viewerHasVoted } = data;
  const username = profile?.username ?? 'unknown';
  return (
    <article
      style={{
        background: 'white',
        border: '1px solid rgba(200,149,108,0.15)',
        borderRadius: 20,
        padding: '18px 20px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
      }}
    >
      <Link
        href={profile ? `/profile/${username}` : '#'}
        aria-label={`View @${username}'s profile`}
        style={{ textDecoration: 'none', flexShrink: 0 }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: '#f0e8df',
            overflow: 'hidden',
            border: '1px solid rgba(200,149,108,0.2)',
          }}
        >
          <Avatar
            src={profile?.avatar_url ?? null}
            alt={`@${username}`}
            width={44}
            height={44}
            fallbackFontSize={20}
            sizes="44px"
          />
        </div>
      </Link>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 6,
            flexWrap: 'wrap',
          }}
        >
          <Link
            href={profile ? `/profile/${username}` : '#'}
            style={{
              color: '#1a1208',
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
            }}
          >
            @{username}
          </Link>
          {isMine && (
            <span
              style={{
                background: 'rgba(200,149,108,0.12)',
                color: '#c8956c',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 100,
              }}
            >
              You
            </span>
          )}
        </div>
        <p
          style={{
            color: '#1a1208',
            fontSize: 14,
            lineHeight: 1.6,
            margin: 0,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {sanitizeText(row.answer)}
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleVote}
        disabled={isMine}
        aria-label={
          isMine
            ? "You can't vote on your own answer"
            : viewerHasVoted
            ? 'Remove your upvote'
            : 'Upvote this answer'
        }
        title={isMine ? "Can't vote on your own" : viewerHasVoted ? 'Remove upvote' : 'Upvote'}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          minWidth: 56,
          padding: '8px 10px',
          borderRadius: 14,
          background: viewerHasVoted ? '#c8956c' : 'white',
          border: `1px solid ${viewerHasVoted ? '#c8956c' : 'rgba(200,149,108,0.25)'}`,
          color: viewerHasVoted ? 'white' : '#c8956c',
          fontSize: 13,
          fontWeight: 700,
          cursor: isMine ? 'not-allowed' : 'pointer',
          opacity: isMine ? 0.5 : 1,
          flexShrink: 0,
        }}
      >
        <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>
          ▲
        </span>
        <span style={{ fontSize: 12, lineHeight: 1 }}>{voteCount}</span>
      </button>
    </article>
  );
}

function PageSkeleton({ weekLabel, promptText }: { weekLabel: string; promptText: string }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
        padding: '40px 24px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div
          style={{
            background:
              'linear-gradient(135deg, rgba(255,243,236,0.95) 0%, rgba(255,248,236,0.95) 100%)',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 28,
            padding: '32px',
            marginBottom: 28,
          }}
        >
          <p style={{ color: '#c8956c', fontSize: 12, fontWeight: 800, letterSpacing: '1.5px', margin: '0 0 12px' }}>
            ✨ WEEKLY CREATIVE PROMPT · {weekLabel}
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: '#1a1208', margin: 0, lineHeight: 1.15 }}>
            {promptText}
          </h1>
        </div>
        <FeedSkeleton />
      </div>
    </main>
  );
}

function FeedSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.15)',
            borderRadius: 20,
            padding: '18px 20px',
            display: 'flex',
            gap: 14,
          }}
        >
          <Skeleton width={44} height={44} radius={22} />
          <div style={{ flex: 1 }}>
            <Skeleton width="30%" height={12} style={{ marginBottom: 8 }} />
            <Skeleton width="100%" height={14} style={{ marginBottom: 6 }} />
            <Skeleton width="80%" height={14} />
          </div>
          <Skeleton width={56} height={48} radius={14} />
        </div>
      ))}
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  color: '#8a7560',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: 100,
};

const smallButtonStyle: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  border: '1px solid rgba(200,149,108,0.3)',
  borderRadius: 100,
  color: '#8a7560',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
