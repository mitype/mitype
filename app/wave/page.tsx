'use client';
// /wave — The Wave feed.
//
// Vertical full-bleed scroll of creator videos. Snap-scrolling so each
// video locks to viewport on swipe. Currently-visible video autoplays.
// First-time users see the tutorial overlay.
//
// Mobile-first; on desktop the player is centered with phone-shaped
// constraints for a TikTok-like experience.

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { WaveTutorial } from '../components/WaveTutorial';
import { toast } from '../lib/toast';

interface WaveItem {
  id: string;
  videoUrl: string;
  caption: string | null;
  category: string | null;
  durationSeconds: number | null;
  createdAt: string;
  expiresAt: string;
  likeCount: number;
  viewCount: number;
  compatibility: number;
  sharedCategories: string[];
  likedByMe: boolean;
  creator: {
    userId: string;
    username: string;
    avatarUrl: string | null;
    bio: string | null;
  } | null;
}

export default function WavePage() {
  const router = useRouter();
  // Optional category scope read from the URL — if present, the feed is
  // narrowed to videos tagged with this category. Used when entering
  // The Wave from the Discover category filter
  // (e.g. `/wave?category=🍕 Food Blogger`). Read from window.location
  // instead of useSearchParams to avoid the Next 16 Suspense requirement.
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<WaveItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  // Audio handling. We want videos to play with sound by default, but
  // every mobile browser (especially iOS Safari) requires muted autoplay
  // until the user has interacted with the page. We start with sound
  // enabled IF this device has already tapped-to-enable in a previous
  // session (cached in localStorage); otherwise we'll briefly fall back
  // to muted, show a one-tap "🔊 Enable sound" nudge, and flip the flag
  // forever once they tap.
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [menuVideoId, setMenuVideoId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Fetch helper that includes the current session's access token.
  const apiFetch = useCallback(async (path: string, init?: RequestInit) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    return fetch(path, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  }, []);

  // Initial load: check auth, check tutorial flag, load first page of feed.
  useEffect(() => {
    (async () => {
      // Read the optional `?category=` URL filter before we kick off
      // the first feed load so the filter is applied from the start.
      const cat = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('category')
        : null;
      setCategoryFilter(cat);

      // If the user has ever tapped to enable sound on this device,
      // start with sound on so the very first video plays with audio.
      if (typeof window !== 'undefined' && window.localStorage.getItem('mitype-wave-sound') === '1') {
        setSoundEnabled(true);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);

      const { data: profile } = await supabase
        .from('profiles')
        .select('wave_tutorial_seen')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!profile?.wave_tutorial_seen) {
        setShowTutorial(true);
      }

      await loadFeedWithFilter(null, cat);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFeed(cur: string | null) {
    return loadFeedWithFilter(cur, categoryFilter);
  }

  // Internal: lets the initial mount call this synchronously with the
  // category value it just read from the URL, without waiting for the
  // state update to flush.
  async function loadFeedWithFilter(cur: string | null, cat: string | null) {
    const qs = new URLSearchParams();
    if (cur) qs.set('cursor', cur);
    if (cat) qs.set('category', cat);
    const queryString = qs.toString();
    const res = await apiFetch(`/api/wave/feed${queryString ? `?${queryString}` : ''}`);
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? 'Could not load feed');
      return;
    }
    setItems((prev) => (cur ? [...prev, ...(json.items ?? [])] : (json.items ?? [])));
    setCursor(json.nextCursor ?? null);
    setHasMore(Boolean(json.nextCursor));
  }

  async function handleTutorialDone() {
    setShowTutorial(false);
    if (user) {
      await supabase
        .from('profiles')
        .update({ wave_tutorial_seen: true })
        .eq('user_id', user.id);
    }
  }

  // IntersectionObserver-driven autoplay: the currently-visible video plays,
  // every other video pauses and rewinds. We try to play with sound on,
  // and fall back to muted-autoplay + a "tap to enable sound" prompt only
  // if the browser blocks audio autoplay (iOS Safari, etc.).
  useEffect(() => {
    if (!containerRef.current || items.length === 0) return;

    async function playWithSoundFallback(el: HTMLVideoElement) {
      el.muted = !soundEnabled;
      try {
        await el.play();
      } catch {
        // Audio autoplay blocked — fall back to muted autoplay and
        // surface the one-tap prompt to enable sound.
        try {
          el.muted = true;
          await el.play();
          setNeedsSoundTap(true);
        } catch {
          // Some other reason; ignore.
        }
      }
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute('data-video-id');
          const el = videoRefs.current.get(id ?? '');
          if (!el || !id) continue;
          if (entry.isIntersecting && entry.intersectionRatio > 0.65) {
            setActiveId(id);
            playWithSoundFallback(el);
            // Fire-and-forget view tracking.
            apiFetch('/api/wave/view', {
              method: 'POST',
              body: JSON.stringify({ videoId: id }),
            }).catch(() => {});
          } else {
            el.pause();
            el.currentTime = 0;
          }
        }
      },
      { root: containerRef.current, threshold: [0.65] }
    );
    const nodes = containerRef.current.querySelectorAll('[data-video-id]');
    nodes.forEach((n) => observer.observe(n));

    // Infinite scroll: load more when nearing the bottom.
    const sentinel = containerRef.current.querySelector('[data-sentinel]');
    let loadObserver: IntersectionObserver | null = null;
    if (sentinel && hasMore && cursor) {
      loadObserver = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadFeed(cursor);
        }
      }, { root: containerRef.current });
      loadObserver.observe(sentinel);
    }

    return () => {
      observer.disconnect();
      loadObserver?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, soundEnabled, cursor, hasMore]);

  // One-tap handler: user grants sound permission for the whole feed.
  // Remember the choice locally so future sessions never need the tap.
  function enableSound() {
    setSoundEnabled(true);
    setNeedsSoundTap(false);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('mitype-wave-sound', '1');
      } catch {
        // localStorage unavailable; non-fatal.
      }
    }
    // Immediately unmute and (re)play the currently active video.
    // The click that triggered this counts as a user gesture, so iOS
    // Safari will allow the unmuted play() that follows.
    if (activeId) {
      const el = videoRefs.current.get(activeId);
      if (el) {
        el.muted = false;
        el.play().catch(() => {});
      }
    }
  }

  // Toggle the other direction — user wants quiet again.
  function disableSound() {
    setSoundEnabled(false);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('mitype-wave-sound');
      } catch {
        // Non-fatal.
      }
    }
    if (activeId) {
      const el = videoRefs.current.get(activeId);
      if (el) el.muted = true;
    }
  }

  async function handleLike(videoId: string) {
    // Optimistic UI: flip immediately.
    setItems((prev) =>
      prev.map((it) =>
        it.id === videoId
          ? {
              ...it,
              likedByMe: !it.likedByMe,
              likeCount: it.likedByMe ? Math.max(0, it.likeCount - 1) : it.likeCount + 1,
            }
          : it
      )
    );
    const res = await apiFetch('/api/wave/like', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
    if (!res.ok) {
      // Roll back on failure.
      setItems((prev) =>
        prev.map((it) =>
          it.id === videoId
            ? {
                ...it,
                likedByMe: !it.likedByMe,
                likeCount: it.likedByMe ? Math.max(0, it.likeCount - 1) : it.likeCount + 1,
              }
            : it
        )
      );
      toast.error('Could not save like');
    }
  }

  async function handleDismiss(videoId: string) {
    const res = await apiFetch('/api/wave/dismiss', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
    if (res.ok) {
      setItems((prev) => prev.filter((it) => it.id !== videoId));
    } else {
      toast.error('Could not dismiss');
    }
  }

  // Creator-only: delete one of your own videos. Server enforces the
  // 1-hour ownership window AND keeps the row soft-deleted so the
  // 3-per-24h post limit still counts it.
  async function handleDelete(videoId: string) {
    if (!confirm('Delete this video? This cannot be undone.')) return;
    const res = await apiFetch('/api/wave/delete', {
      method: 'POST',
      body: JSON.stringify({ videoId }),
    });
    const json = await res.json().catch(() => ({} as any));
    if (res.ok) {
      toast.success('Video deleted');
      setItems((prev) => prev.filter((it) => it.id !== videoId));
    } else {
      toast.error(json.error ?? 'Could not delete video');
    }
    setMenuVideoId(null);
  }

  // Whether the viewer is the creator of a given video.
  function isOwnVideo(item: WaveItem): boolean {
    return Boolean(user && item.creator && item.creator.userId === user.id);
  }

  // Whether the viewer is the creator of a given video AND it's still
  // inside the 1-hour delete window. Drives the "Delete video" option
  // in the More menu.
  function canDelete(item: WaveItem): boolean {
    if (!isOwnVideo(item)) return false;
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    return ageMs <= 60 * 60 * 1000;
  }

  // Human-readable "X minutes ago" type string used to explain why
  // delete is unavailable when past the 1-hour window.
  function minutesSincePost(item: WaveItem): number {
    const ms = Date.now() - new Date(item.createdAt).getTime();
    return Math.floor(ms / (60 * 1000));
  }

  async function handleReport(videoId: string) {
    if (!confirm('Report this video for review?')) return;
    const res = await apiFetch('/api/wave/report', {
      method: 'POST',
      body: JSON.stringify({ videoId, reason: 'user-reported' }),
    });
    if (res.ok) {
      toast.success('Reported. Thanks for helping keep Mitype safe.');
      setItems((prev) => prev.filter((it) => it.id !== videoId));
    } else {
      toast.error('Could not submit report');
    }
    setMenuVideoId(null);
  }

  // Mobile-friendly save flow. We fetch the watermarked video as a blob
  // then try the Web Share API first (which gives users a "Save to Photos"
  // option on iOS / "Save video" on Android). If that's unavailable, we
  // fall back to a direct download via an object URL.
  async function handleSave(item: WaveItem) {
    if (savingId) return;
    setSavingId(item.id);
    try {
      const res = await fetch(item.videoUrl);
      if (!res.ok) throw new Error('Could not fetch video');
      const blob = await res.blob();
      const filename = `mitype-${item.id}.${blob.type.includes('webm') ? 'webm' : 'mp4'}`;
      const file = new File([blob], filename, { type: blob.type || 'video/mp4' });

      const navAny = navigator as Navigator & {
        share?: (data: ShareData) => Promise<void>;
        canShare?: (data: ShareData) => boolean;
      };

      if (typeof navAny.share === 'function' && navAny.canShare?.({ files: [file] })) {
        try {
          await navAny.share({ files: [file], title: 'Mitype' });
          return;
        } catch (e: any) {
          if (e?.name === 'AbortError') return;
          // Fall through to direct download on other errors.
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success('Video saved');
    } catch (err: any) {
      console.error('[wave] save error:', err);
      toast.error('Could not save video');
    } finally {
      setSavingId(null);
    }
  }

  async function handleBlock(creatorId: string) {
    if (!confirm("Block this creator? You won't see their posts again.")) return;
    const res = await apiFetch('/api/wave/block', {
      method: 'POST',
      body: JSON.stringify({ blockedUserId: creatorId }),
    });
    if (res.ok) {
      toast.success('Creator blocked');
      setItems((prev) => prev.filter((it) => it.creator?.userId !== creatorId));
    } else {
      toast.error('Could not block');
    }
    setMenuVideoId(null);
  }

  function timeRemaining(expiresAt: string): string {
    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return 'expiring';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  return (
    <main
      style={{
        height: '100vh',
        width: '100vw',
        background: '#0a0604',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: 'max(16px, env(safe-area-inset-top)) 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 50,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)',
        }}
      >
        <Link
          href="/dashboard"
          aria-label="Back to dashboard"
          style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: 22,
            fontWeight: 700,
            padding: '6px 10px',
          }}
        >
          ←
        </Link>
        <div
          style={{
            color: 'white',
            fontSize: 18,
            fontWeight: 800,
            letterSpacing: '-0.3px',
            textAlign: 'center',
            maxWidth: '60%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {categoryFilter ? categoryFilter : 'The Wave'}
        </div>
        <Link
          href="/wave/create"
          aria-label="Post a new video"
          style={{
            background: '#c8956c',
            color: 'white',
            textDecoration: 'none',
            fontSize: 22,
            fontWeight: 800,
            padding: '4px 12px 6px',
            borderRadius: 100,
            display: 'inline-block',
            lineHeight: 1,
          }}
        >
          +
        </Link>
      </div>

      {/* Persistent sound toggle — always visible at bottom-left so the
          user has clear control. Browsers force the initial state to
          muted on iOS Safari etc., so we surface this prominently. Once
          the user enables sound, the choice is remembered forever on
          this device via localStorage. */}
      <button
        type="button"
        onClick={soundEnabled ? disableSound : enableSound}
        aria-label={soundEnabled ? 'Mute' : 'Tap to unmute'}
        style={{
          position: 'absolute',
          bottom: 'max(20px, env(safe-area-inset-bottom))',
          left: 12,
          zIndex: 50,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: soundEnabled
            ? 'rgba(0,0,0,0.55)'
            : 'rgba(200,149,108,0.95)',
          border: soundEnabled
            ? '1px solid rgba(255,255,255,0.15)'
            : 'none',
          color: 'white',
          fontSize: soundEnabled ? 18 : 13,
          fontWeight: 700,
          padding: soundEnabled ? '8px 12px' : '10px 16px',
          borderRadius: 100,
          cursor: 'pointer',
          backdropFilter: 'blur(6px)',
          fontFamily: 'inherit',
          boxShadow: soundEnabled
            ? 'none'
            : '0 6px 18px rgba(200,149,108,0.5)',
        }}
      >
        {soundEnabled ? (
          <span aria-hidden="true">🔊</span>
        ) : (
          <>
            <span aria-hidden="true" style={{ fontSize: 18 }}>🔇</span>
            Tap to unmute
          </>
        )}
      </button>

      {/* Scroll container */}
      <div
        ref={containerRef}
        style={{
          height: '100%',
          width: '100%',
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {loading && (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 15,
          }}>
            Loading the wave…
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            padding: 32,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🌊</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 12px' }}>
              {categoryFilter
                ? `No ${categoryFilter} videos yet`
                : 'The Wave is quiet right now'}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 320, marginBottom: 28 }}>
              {categoryFilter
                ? 'Be the first to tag a video with this category — or browse the whole feed.'
                : 'Be the first to post a video. Show your craft. Your people are waiting.'}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                href="/wave/create"
                style={{
                  background: '#c8956c',
                  color: 'white',
                  textDecoration: 'none',
                  fontSize: 16,
                  fontWeight: 700,
                  padding: '14px 32px',
                  borderRadius: 100,
                  boxShadow: '0 8px 24px rgba(200,149,108,0.4)',
                }}
              >
                Post a video
              </Link>
              {categoryFilter && (
                <Link
                  href="/wave"
                  style={{
                    background: 'rgba(255,255,255,0.12)',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: 16,
                    fontWeight: 700,
                    padding: '14px 28px',
                    borderRadius: 100,
                    border: '1px solid rgba(255,255,255,0.2)',
                  }}
                >
                  See the full Wave
                </Link>
              )}
            </div>
          </div>
        )}

        {items.map((item) => (
          <section
            key={item.id}
            data-video-id={item.id}
            style={{
              height: '100%',
              width: '100%',
              scrollSnapAlign: 'start',
              position: 'relative',
              background: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(item.id, el);
                else videoRefs.current.delete(item.id);
              }}
              src={item.videoUrl}
              loop
              playsInline
              // Start muted only when sound isn't yet enabled — the
              // IntersectionObserver flips `el.muted = !soundEnabled`
              // and gracefully retries muted if the browser blocks
              // unmuted autoplay.
              muted={!soundEnabled}
              preload="metadata"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                background: '#000',
              }}
            />

            {/* Mitype watermark — CSS overlay so the brand is always
                visible in the player, regardless of how the video is
                cropped (the baked-in watermark gets clipped on
                landscape videos shown in a portrait viewport). */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                top: 'max(120px, calc(env(safe-area-inset-top) + 105px))',
                right: 16,
                fontSize: 14,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.85)',
                letterSpacing: '-0.3px',
                textShadow: '0 1px 3px rgba(0,0,0,0.55)',
                pointerEvents: 'none',
              }}
            >
              mitype
            </div>

            {/* Compatibility badge — top-left */}
            {item.compatibility > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 'max(76px, calc(env(safe-area-inset-top) + 60px))',
                  left: 16,
                  background: 'rgba(200,149,108,0.95)',
                  color: 'white',
                  padding: '6px 14px',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: '-0.2px',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
                }}
              >
                {item.compatibility}% Compatible
              </div>
            )}

            {/* Expires-in badge — top-right */}
            <div
              style={{
                position: 'absolute',
                top: 'max(76px, calc(env(safe-area-inset-top) + 60px))',
                right: 16,
                background: 'rgba(0,0,0,0.55)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: 100,
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              ⏱ {timeRemaining(item.expiresAt)}
            </div>

            {/* Category badge */}
            {item.category && (
              <div
                style={{
                  position: 'absolute',
                  top: 'max(120px, calc(env(safe-area-inset-top) + 105px))',
                  left: 16,
                  background: 'rgba(0,0,0,0.55)',
                  color: 'white',
                  padding: '5px 11px',
                  borderRadius: 100,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {item.category}
              </div>
            )}

            {/* Creator card — flush to the LEFT edge of the screen.
                NOTE: the caption is intentionally NOT rendered here because
                the editor already bakes a styled caption pill into the
                video frame itself. Rendering it again caused the captions
                to visually collide at the bottom of the screen. */}
            <div
              style={{
                position: 'absolute',
                // Sit well clear of the in-video caption pill, which is
                // painted near the bottom of the video frame.
                bottom: 'max(96px, calc(env(safe-area-inset-bottom) + 88px))',
                left: 12,
                right: 80,
                color: 'white',
                pointerEvents: 'auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              {item.creator && (
                <Link
                  href={`/profile/${item.creator.username}`}
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    background: 'rgba(0,0,0,0.45)',
                    padding: '6px 14px 6px 6px',
                    borderRadius: 100,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.15)',
                      backgroundImage: item.creator.avatarUrl
                        ? `url(${item.creator.avatarUrl})`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1.5px solid white',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '-0.2px' }}>
                    @{item.creator.username}
                  </span>
                </Link>
              )}
              {item.sharedCategories.length > 0 && (
                <p
                  style={{
                    fontSize: 12,
                    color: 'white',
                    margin: 0,
                    fontWeight: 600,
                    background: 'rgba(0,0,0,0.45)',
                    padding: '5px 12px',
                    borderRadius: 100,
                    display: 'inline-block',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  ✓ You both create {item.sharedCategories.slice(0, 2).join(' · ')}
                  {item.sharedCategories.length > 2 && ` +${item.sharedCategories.length - 2}`}
                </p>
              )}
            </div>

            {/* Action bar — bottom-right */}
            <div
              style={{
                position: 'absolute',
                bottom: 'max(28px, env(safe-area-inset-bottom))',
                right: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
                alignItems: 'center',
              }}
            >
              {/* Like */}
              <button
                type="button"
                onClick={() => handleLike(item.id)}
                aria-label={item.likedByMe ? 'Unlike' : 'Like'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: 4,
                }}
              >
                <span style={{ fontSize: 32, lineHeight: 1, color: item.likedByMe ? '#ff4f6d' : 'white' }}>
                  {item.likedByMe ? '❤️' : '🤍'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>
                  {item.likeCount}
                </span>
              </button>

              {/* Message */}
              {item.creator && (
                <Link
                  href={`/profile/${item.creator.username}`}
                  aria-label="Message creator"
                  style={{
                    color: 'white',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    padding: 4,
                  }}
                >
                  <span style={{ fontSize: 32, lineHeight: 1 }}>💬</span>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>Chat</span>
                </Link>
              )}

              {/* Dismiss */}
              <button
                type="button"
                onClick={() => handleDismiss(item.id)}
                aria-label="Skip this video"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: 4,
                }}
              >
                <span style={{ fontSize: 30, lineHeight: 1 }}>✕</span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>Skip</span>
              </button>

              {/* Save — fetches the watermarked video and offers it via the
                  share sheet (iOS "Save to Photos") or a direct download. */}
              <button
                type="button"
                onClick={() => handleSave(item)}
                disabled={savingId === item.id}
                aria-label="Save this video"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: savingId === item.id ? 'wait' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  padding: 4,
                  opacity: savingId === item.id ? 0.6 : 1,
                }}
              >
                <span style={{ fontSize: 28, lineHeight: 1 }}>
                  {savingId === item.id ? '⏳' : '⬇️'}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700 }}>
                  {savingId === item.id ? 'Saving' : 'Save'}
                </span>
              </button>

              {/* More */}
              <button
                type="button"
                onClick={() => setMenuVideoId(menuVideoId === item.id ? null : item.id)}
                aria-label="More options"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1, fontWeight: 800 }}>⋯</span>
              </button>
            </div>

            {/* More menu */}
            {menuVideoId === item.id && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 130,
                  right: 16,
                  background: 'rgba(20,14,8,0.95)',
                  borderRadius: 14,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  zIndex: 60,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                }}
              >
                {/* OWN video: always surface the Delete state so the
                    creator understands the 1-hour window — clickable
                    inside the window, greyed-out + explanatory outside. */}
                {isOwnVideo(item) ? (
                  canDelete(item) ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      style={{ ...menuButtonStyle, color: '#ff6b6b', fontWeight: 700 }}
                    >
                      🗑️ Delete video
                    </button>
                  ) : (
                    <div
                      style={{
                        ...menuButtonStyle,
                        color: 'rgba(255,255,255,0.55)',
                        cursor: 'default',
                        whiteSpace: 'normal',
                        maxWidth: 220,
                        lineHeight: 1.4,
                      }}
                    >
                      🗑️ Delete window closed
                      <div style={{ fontSize: 11, marginTop: 2, fontWeight: 400 }}>
                        Posted {minutesSincePost(item)} min ago — videos can only
                        be deleted within 1 hour of posting. This video will
                        auto-expire 24 hours after posting.
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleReport(item.id)}
                      style={menuButtonStyle}
                    >
                      🚩 Report video
                    </button>
                    {item.creator && (
                      <button
                        type="button"
                        onClick={() => handleBlock(item.creator!.userId)}
                        style={menuButtonStyle}
                      >
                        🚫 Block creator
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setMenuVideoId(null)}
                  style={{ ...menuButtonStyle, color: 'rgba(255,255,255,0.6)' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </section>
        ))}

        {hasMore && items.length > 0 && (
          <div
            data-sentinel="true"
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.5)',
              fontSize: 14,
            }}
          >
            Loading more…
          </div>
        )}
      </div>

      {showTutorial && <WaveTutorial onDismiss={handleTutorialDone} />}
    </main>
  );
}

const menuButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'white',
  fontSize: 14,
  padding: '12px 16px',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
