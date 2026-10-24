'use client';
// /moments: MI Moments.
//
// A public photo carousel for subscribers. Photos sit on a rotating 3D
// ring: swipe or drag left and right to spin. Photos are shown in a mixed
// order and every photo is shown once before the ring comes back around
// to the first one. Double tap a photo to like it, tap the heart to
// unlike. The plus button opens the editor and posts a new photo.
//
// Access: active or trialing subscribers only (enforced here and by RLS).
// While MOMENTS_LIVE is false only admins can open this page.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { safeUpload } from '../lib/safeUpload';
import { checkRateLimit, LIMITS, rateLimitMessage } from '../lib/rateLimit';
import { MOMENTS_LIVE } from '../lib/momentsFlags';
import { loadImage } from './momentsImage';
import { MomentEditor } from './MomentEditor';

interface Moment {
  id: string;
  userId: string;
  username: string;
  imageUrl: string;
  storagePath: string;
  likeCount: number;
  liked: boolean;
}

const STEP = 60;            // degrees between cards on the circle
const DRAG_PER_PHOTO = 150; // pixels of drag that move one photo
const EDGE_GUARD = 24;      // px at the screen edge left to the phone's back gesture
const MIN_CARDS = 5;        // blank cards pad the ring so neighbors always show
const PAGE = 1000;

const mod = (n: number, m: number) => ((n % m) + m) % m;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Fixed ribbon background (does not move with the carousel). Two peach
// ribbons flow down the screen with MI MOMENTS written along them.
const RIBBON_LEFT =
  'M -260 440 C -120 430, -40 400, 20 405 C 70 405, 100 395, 140 400 C 230 420, 300 470, 335 560 C 370 650, 360 700, 310 780 C 250 880, 210 960, 210 1060 C 205 1160, 220 1230, 270 1295 C 320 1360, 360 1380, 400 1400 C 470 1440, 530 1530, 545 1620 C 560 1730, 540 1880, 495 2040';
const RIBBON_RIGHT =
  'M 930 -160 C 945 -40, 920 110, 875 215 C 830 320, 770 480, 755 650 C 748 760, 790 810, 840 835 C 900 860, 920 920, 990 990 C 1060 1060, 1100 1200, 1095 1400 C 1090 1480, 1110 1560, 1140 1650 C 1175 1740, 1260 1800, 1400 1860';
const RIBBON_TEXT = 'MI MOMENTS  •  '.repeat(8);

function RibbonBackground() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1125 2000"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <defs>
        <linearGradient id="momentsRibbonFade" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="2000">
          <stop offset="0" stopColor="#4a2810" />
          <stop offset="1" stopColor="#b98457" />
        </linearGradient>
        <path id="momentsRibbonL" d={RIBBON_LEFT} />
        <path id="momentsRibbonR" d={RIBBON_RIGHT} />
      </defs>
      <g fill="none" stroke="url(#momentsRibbonFade)" strokeWidth="120" strokeLinecap="round">
        <use href="#momentsRibbonL" />
        <use href="#momentsRibbonR" />
      </g>
      <g fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="56" fontWeight="800" letterSpacing="9" fill="none" stroke="#f3dcc0" strokeWidth="2.5" strokeLinejoin="round">
        <text dy="20"><textPath href="#momentsRibbonL">{RIBBON_TEXT}</textPath></text>
        <text dy="20"><textPath href="#momentsRibbonR">{RIBBON_TEXT}</textPath></text>
      </g>
    </svg>
  );
}

export default function MomentsPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [meId, setMeId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [deck, setDeck] = useState<Moment[]>([]);
  const [pos, setPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [pop, setPop] = useState<{ id: string; n: number } | null>(null);
  const [editing, setEditing] = useState<{ img: HTMLImageElement; url: string } | null>(null);
  const [vw, setVw] = useState(390);
  const [vh, setVh] = useState(800);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef({ x: 0, pos: 0, moved: 0, t: 0, lastX: 0, lastT: 0, v: 0, active: false });
  const lastTap = useRef(0);

  // ---- load -----------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) { router.replace('/login'); return; }

      const [{ data: sub }, { data: me }] = await Promise.all([
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('profiles').select('is_admin').eq('user_id', user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const subscribed = sub?.status === 'active' || sub?.status === 'trialing';
      const admin = !!me?.is_admin;
      if (!subscribed) { router.replace('/subscription'); return; }
      if (!MOMENTS_LIVE && !admin) { router.replace('/dashboard'); return; }
      setMeId(user.id);
      setIsAdmin(admin);

      // Load every photo (metadata only; images load as the ring reaches
      // them), a page at a time.
      const list: Array<Record<string, unknown>> = [];
      for (let from = 0; ; from += PAGE) {
        const { data: rows } = await supabase
          .from('moments')
          .select('id, user_id, image_url, storage_path, like_count')
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (cancelled) return;
        list.push(...(rows ?? []));
        if (!rows || rows.length < PAGE) break;
      }

      const userIds = [...new Set(list.map((r) => r.user_id as string))];
      const names = new Map<string, string>();
      for (let i = 0; i < userIds.length; i += 200) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('user_id, username')
          .in('user_id', userIds.slice(i, i + 200));
        (profs ?? []).forEach((p) => names.set(p.user_id as string, p.username as string));
      }
      const { data: mine } = await supabase
        .from('moment_likes')
        .select('moment_id')
        .eq('user_id', user.id);
      if (cancelled) return;
      const likedIds = new Set((mine ?? []).map((m) => m.moment_id as string));

      setDeck(shuffle(list.map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        username: names.get(r.user_id as string) ?? 'member',
        imageUrl: r.image_url as string,
        storagePath: r.storage_path as string,
        likeCount: (r.like_count as number) ?? 0,
        liked: likedIds.has(r.id as string),
      }))));
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [router]);

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth);
      setVh(window.visualViewport?.height ?? window.innerHeight);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // The ring is the photos plus blank "add yours" cards, so there are
  // always cards on both sides to swipe to, even before anyone posts.
  const items = useMemo<Array<Moment | null>>(() => {
    const blanks = deck.length < MIN_CARDS ? MIN_CARDS - deck.length : 1;
    return [...deck, ...Array.from({ length: blanks }, () => null)];
  }, [deck]);
  const len = items.length;
  const cardH = Math.max(280, Math.min(vh - 250, Math.round(((vw * 0.8) * 16) / 9)));
  const cardW = Math.round((cardH * 9) / 16);
  // Radius of a circle whose flat cards touch edge to edge.
  const radius = Math.round(cardW / 2 / Math.tan((STEP / 2) * (Math.PI / 180)));
  const current = mod(Math.round(pos), len);
  const currentMoment = items[current];

  const go = useCallback((target: number) => setPos(target), []);

  // ---- likes ------------------------------------------------------------------
  const setLiked = useCallback(async (id: string, next: boolean) => {
    let prevLiked = false;
    setDeck((d) => d.map((m) => {
      if (m.id !== id) return m;
      prevLiked = m.liked;
      if (m.liked === next) return m;
      return { ...m, liked: next, likeCount: Math.max(0, m.likeCount + (next ? 1 : -1)) };
    }));
    if (prevLiked === next) return;
    const { error } = next
      ? await supabase.from('moment_likes').insert({ moment_id: id, user_id: meId })
      : await supabase.from('moment_likes').delete().eq('moment_id', id).eq('user_id', meId);
    if (error && error.code !== '23505') {
      setDeck((d) => d.map((m) => (m.id === id
        ? { ...m, liked: !next, likeCount: Math.max(0, m.likeCount + (next ? -1 : 1)) }
        : m)));
      toast.error('Could not save that like. Try again.');
    }
  }, [meId]);

  // ---- gestures ---------------------------------------------------------------
  function onDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    // A touch that starts at the very edge of the screen belongs to the
    // phone's own back gesture; leave it alone.
    if (e.clientX < EDGE_GUARD || e.clientX > window.innerWidth - EDGE_GUARD) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, pos: Math.round(pos), moved: 0, t: Date.now(), lastX: e.clientX, lastT: Date.now(), v: 0, active: true };
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.x;
    d.moved = Math.max(d.moved, Math.abs(dx));
    // Follow the finger, but never more than one photo away from where
    // the gesture started, so a swipe can never skip a photo.
    setPos(d.pos + Math.max(-1, Math.min(1, -dx / DRAG_PER_PHOTO)));
  }
  function onCancel() {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setDragging(false);
    setPos(d.pos);
  }
  function onUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setDragging(false);
    if (d.moved < 8) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      if (e.clientX < mid - cardW / 2) { go(Math.round(d.pos) - 1); return; }
      if (e.clientX > mid + cardW / 2) { go(Math.round(d.pos) + 1); return; }
      const now = Date.now();
      const m = items[mod(Math.round(d.pos), len)];
      if (!m) {
        // Tapping a blank card opens the photo picker.
        lastTap.current = 0;
        fileRef.current?.click();
      } else if (now - lastTap.current < 320) {
        lastTap.current = 0;
        setPop({ id: m.id, n: now });
        if (!m.liked) void setLiked(m.id, true);
      } else {
        lastTap.current = now;
      }
      setPos(Math.round(d.pos));
      return;
    }
    // One swipe moves exactly one photo: a drag past a third of a photo,
    // or a quick flick, goes to the next one; a short slow drag snaps back.
    const dx = e.clientX - d.x;
    const elapsed = Math.max(1, Date.now() - d.t);
    const flick = Math.abs(dx) > 24 && Math.abs(dx) / elapsed > 0.35;
    const far = Math.abs(dx) > DRAG_PER_PHOTO / 3;
    const step = flick || far ? (dx < 0 ? 1 : -1) : 0;
    go(d.pos + step);
  }

  // The only way out is the X button. Swiping back from the screen edge
  // (iPhone Safari) would otherwise leave this page, so keep one extra
  // history entry in front and re-add it whenever the browser pops it.
  useEffect(() => {
    window.history.pushState({ moments: true }, '', window.location.href);
    function onPop() {
      window.history.pushState({ moments: true }, '', window.location.href);
    }
    window.addEventListener('popstate', onPop);
    const prev = document.documentElement.style.overscrollBehaviorX;
    document.documentElement.style.overscrollBehaviorX = 'none';
    return () => {
      window.removeEventListener('popstate', onPop);
      document.documentElement.style.overscrollBehaviorX = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editing) return;
      if (e.key === 'ArrowRight') setPos((p) => Math.round(p) + 1);
      if (e.key === 'ArrowLeft') setPos((p) => Math.round(p) - 1);
      if (e.key === 'Escape') router.push('/dashboard');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, router]);

  // ---- upload -----------------------------------------------------------------
  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== '') {
      toast.error('Choose a photo to post.');
      return;
    }
    try {
      setEditing(await loadImage(file));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That photo could not be opened.');
    }
  }

  async function postPhoto(blob: Blob) {
    const path = `${meId}/${crypto.randomUUID()}.jpg`;
    const up = await safeUpload(blob, { bucket: 'moments', path, kind: 'image', filename: 'moment.jpg' });
    const { data, error } = await supabase
      .from('moments')
      .insert({ user_id: meId, image_url: up.publicUrl, storage_path: path })
      .select('id')
      .single();
    if (error || !data) {
      await supabase.storage.from('moments').remove([path]);
      throw new Error('Could not post your photo. Try again.');
    }
    const { data: prof } = await supabase.from('profiles').select('username').eq('user_id', meId).maybeSingle();
    const fresh: Moment = {
      id: data.id as string,
      userId: meId,
      username: (prof?.username as string) ?? 'you',
      imageUrl: up.publicUrl,
      storagePath: path,
      likeCount: 0,
      liked: false,
    };
    const at = Math.min(mod(Math.round(pos), len) + 1, deck.length);
    setDeck((d) => { const n = [...d]; n.splice(at, 0, fresh); return n; });
    setPos(at);
    if (editing) URL.revokeObjectURL(editing.url);
    setEditing(null);
    toast.success('Your photo is on MI Moments.');
  }

  // ---- report and delete ------------------------------------------------------
  async function report() {
    if (!currentMoment) return;
    if (!window.confirm('Report this photo for review?')) return;
    if (!(await checkRateLimit(LIMITS.MOMENT_REPORT))) { toast.error(rateLimitMessage(LIMITS.MOMENT_REPORT)); return; }
    const { error } = await supabase
      .from('moment_reports')
      .insert({ moment_id: currentMoment.id, reporter_user_id: meId });
    if (error && error.code !== '23505') toast.error('Could not send the report. Try again.');
    else toast.success('Thanks. We will take a look.');
  }

  async function remove() {
    if (!currentMoment) return;
    if (!window.confirm('Delete this photo? This cannot be undone.')) return;
    const m = currentMoment;
    await supabase.storage.from('moments').remove([m.storagePath]);
    const { error } = await supabase.from('moments').delete().eq('id', m.id);
    if (error) { toast.error('Could not delete the photo. Try again.'); return; }
    setDeck((d) => d.filter((x) => x.id !== m.id));
    toast.success('Photo deleted.');
  }

  // ---- ring cards -------------------------------------------------------------
  const cards = useMemo(() => {
    const r = Math.round(pos);
    const half = Math.min(2, Math.floor((len - 1) / 2));
    const out: { m: number; moment: Moment | null }[] = [];
    for (let m = r - half; m <= r + half; m++) out.push({ m, moment: items[mod(m, len)] });
    return out;
  }, [items, pos, len]);

  const canDelete = !!currentMoment && (currentMoment.userId === meId || isAdmin);

  // ---- render -----------------------------------------------------------------
  const iconBtn: React.CSSProperties = {
    width: 46, height: 46, borderRadius: '50%', border: '1px solid rgba(200,149,108,0.3)',
    background: 'rgba(255,255,255,0.85)', color: 'var(--brand-personal-text-head)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
  };
  const heartPath = 'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.9 4.5 6.6 4.5c2 0 3.6 1.1 5.4 3 1.8-1.9 3.4-3 5.4-3 3.7 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        background: '#6e6e72', overscrollBehavior: 'none',
      }}
    >
      {/* Ambient backdrop: soft brand color fields plus the current photo,
          blurred. Radial gradients instead of blurred blobs so every
          browser paints the full screen without seams. */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 42%, #d4d4d7 0%, #9a9a9e 50%, #55555a 100%)',
        }}
      >
        {currentMoment && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentMoment.id}
            src={currentMoment.imageUrl}
            alt=""
            style={{
              position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', objectFit: 'cover',
              transform: 'scale(1.3)', filter: 'blur(28px) saturate(1.2)', opacity: 0.35,
            }}
          />
        )}
        <RibbonBackground />
      </div>

      <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(12px + env(safe-area-inset-top)) 56px 4px' }}>
        <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', margin: -1 }}>MI Moments</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icon-512.png" alt="Mitype" width={64} height={64} style={{ width: 64, height: 64, borderRadius: 16, boxShadow: '0 6px 18px rgba(90,60,30,0.3)', background: '#e9e9e9' }} />
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          aria-label="Close MI Moments"
          style={{ ...iconBtn, position: 'absolute', right: 14, top: 'calc(14px + env(safe-area-inset-top))', width: 40, height: 40, fontSize: 22 }}
        >
          <span aria-hidden style={{ lineHeight: 1, fontWeight: 700 }}>×</span>
        </button>
      </div>

      {!ready ? (
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-personal-text-mid)', fontSize: 15 }}>
          Loading moments...
        </div>
      ) : (
        <div
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={(e) => onUp(e)}
          onPointerCancel={onCancel}
          style={{
            position: 'relative', flex: 1, minHeight: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
            perspective: 1400, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: dragging ? 'grabbing' : 'grab',
          }}
        >
          <div style={{ position: 'relative', width: cardW, height: cardH, transformStyle: 'preserve-3d', transform: `translateZ(${-radius}px)` }}>
            {cards.map(({ m, moment }) => {
              const rel = m - pos;
              const isFront = Math.abs(rel) < 0.5;
              // Cards stand on a real circle (a carousel): each one is
              // turned around the center and pushed out by the radius.
              const ar = Math.abs(rel);
              return (
                <div
                  key={m}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 20, overflow: 'hidden',
                    background: moment ? '#3b2d1f' : '#fbf1e6',
                    border: moment ? 'none' : '2px dashed rgba(160,122,77,0.55)',
                    boxSizing: 'border-box',
                    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
                    transform: `rotateY(${rel * STEP}deg) translateZ(${radius}px)`,
                    transition: dragging ? 'none' : 'transform .45s cubic-bezier(.2,.8,.2,1)',
                    boxShadow: '0 14px 34px rgba(60,35,15,0.3)',
                  }}
                >
                  {moment ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={moment.imageUrl}
                        alt={`Photo by ${moment.username}`}
                        draggable={false}
                        loading={Math.abs(rel) <= 2 ? 'eager' : 'lazy'}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                      />
                      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110, background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))', pointerEvents: 'none' }} />
                      <div style={{ position: 'absolute', left: 14, bottom: 14, right: 74, color: 'white', fontSize: 15, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
                        @{moment.username}
                      </div>
                      <button
                        type="button"
                        aria-label={moment.liked ? 'Unlike photo' : 'Like photo'}
                        aria-pressed={moment.liked}
                        onClick={(e) => { e.stopPropagation(); if (isFront) void setLiked(moment.id, !moment.liked); }}
                        style={{ position: 'absolute', right: 8, bottom: 8, background: 'none', border: 'none', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, cursor: 'pointer', padding: 8, fontFamily: 'inherit' }}
                      >
                        <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden fill={moment.liked ? '#ff4d6d' : 'none'} stroke={moment.liked ? '#ff4d6d' : 'white'} strokeWidth="2" strokeLinejoin="round">
                          <path d={heartPath} />
                        </svg>
                        <span style={{ fontSize: 13, fontWeight: 800, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{moment.likeCount}</span>
                      </button>
                      {pop && pop.id === moment.id && isFront && (
                        <svg key={pop.n} width="110" height="110" viewBox="0 0 24 24" aria-hidden fill="#ff4d6d" style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: -55, marginTop: -55, pointerEvents: 'none', animation: 'momentPop .75s ease-out forwards' }}>
                          <path d={heartPath} />
                        </svg>
                      )}
                    </>
                  ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--brand-personal-text-head)', textAlign: 'center', padding: 20 }}>
                      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--brand-personal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 300 }}>
                        <span aria-hidden style={{ lineHeight: 1, marginTop: -3 }}>+</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 17, fontWeight: 900 }}>Add your photo</p>
                      <p style={{ margin: 0, fontSize: 13, color: 'var(--brand-personal-text-mid)', lineHeight: 1.4 }}>Tap to share a moment with the community</p>
                    </div>
                  )}
                  <div aria-hidden style={{ position: 'absolute', inset: 0, background: '#1a1208', opacity: Math.min(ar, 1) * 0.3, pointerEvents: 'none' }} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {ready && (
        <p style={{ position: 'relative', flex: '0 0 auto', margin: '0 0 4px', textAlign: 'center', fontSize: 12.5, color: '#f2f2f4', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          Swipe to spin. Double tap to like.
        </p>
      )}

      <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, padding: '6px 0 calc(20px + env(safe-area-inset-bottom))' }}>
        <button type="button" onClick={report} aria-label="Report this photo" disabled={!currentMoment} style={{ ...iconBtn, visibility: currentMoment ? 'visible' : 'hidden' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></svg>
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Add a photo"
          style={{ width: 64, height: 64, borderRadius: '50%', border: 'none', background: 'var(--brand-personal)', color: 'white', fontSize: 36, fontWeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, boxShadow: '0 8px 22px rgba(160,122,77,0.45)' }}
        >
          <span aria-hidden style={{ lineHeight: 1, marginTop: -3 }}>+</span>
        </button>
        <button type="button" onClick={remove} aria-label="Delete this photo" style={{ ...iconBtn, visibility: canDelete ? 'visible' : 'hidden' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
        </button>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ display: 'none' }} />
      <style>{`@keyframes momentPop{0%{transform:scale(.3);opacity:0}30%{transform:scale(1.15);opacity:1}100%{transform:scale(1) translateY(-30px);opacity:0}}`}</style>

      {editing && (
        <MomentEditor
          img={editing.img}
          src={editing.url}
          onCancel={() => { URL.revokeObjectURL(editing.url); setEditing(null); }}
          onPost={postPhoto}
        />
      )}
    </div>
  );
}
