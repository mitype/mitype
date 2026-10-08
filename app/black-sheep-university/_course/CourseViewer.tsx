'use client';
// Shared reader for every Black Sheep University masterclass.
//
// Each masterclass page (youtube, amazon, and future ones) is a thin
// wrapper that passes its title, badge, and modules to this component.
// Gating, module sidebar, progress bar, lesson viewer, copy protection,
// and the mobile one panel at a time layout all live here.
//
// Copy protection (display only, same approach real course platforms
// use; nothing fully stops a screenshot, but this removes the easy
// paths):
//   - No download or export control anywhere.
//   - Right click and text selection are disabled on the lesson body.
//   - A faint watermark of the viewer's own username is tiled across
//     the lesson body, so a screenshot is traceable.
//   - Content is only rendered through this gated page.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { FeatureInfoButton } from '../../components/FeatureInfoButton';
import type { Module } from './types';
import { CertificateModal } from './CertificateModal';

interface Props {
  title: string;
  badge: React.ReactNode;
  badgeBg: string;
  modules: Module[];
  /** Optional interactive blocks keyed by lesson id, rendered after the
   *  lesson text (used for tools like the cottage bakery state finder). */
  lessonExtras?: Record<string, React.ReactNode>;
  /** Short stable id for the course (youtube, amazon, cottage-bakery). */
  courseSlug: string;
}

export function CourseViewer({ title, badge, badgeBg, modules, lessonExtras, courseSlug }: Props) {
  const router = useRouter();
  const allLessons = useMemo(() => modules.flatMap((m) => m.lessons), [modules]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [watermarkLabel, setWatermarkLabel] = useState('');
  const [activeLessonId, setActiveLessonId] = useState(allLessons[0].id);
  // On narrow screens the sidebar and lesson viewer can't sit side by
  // side without squeezing the lesson text, so only one panel shows at
  // a time there (see .bsu-course-grid in globals.css).
  const [mobileView, setMobileView] = useState<'list' | 'lesson'>('list');
  // Saved to the bsu_progress table (and mirrored in localStorage so
  // progress still works if the table has not been created yet).
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [username, setUsername] = useState('');
  const [isReferrer, setIsReferrer] = useState(false);
  const [certDate, setCertDate] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      const subscribed = sub?.status === 'active' || sub?.status === 'trialing';
      if (!subscribed) {
        router.push('/subscription');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('username, is_referrer')
        .eq('user_id', user.id)
        .maybeSingle();
      setWatermarkLabel(profile?.username ? `@${profile.username}` : user.email ?? user.id);
      setUsername(profile?.username ?? '');
      setIsReferrer(profile?.is_referrer === true);

      // Saved progress: database first, localStorage as a safety net.
      const validIds = new Set(allLessons.map((l) => l.id));
      let ids: string[] = [];
      try {
        const raw = window.localStorage.getItem(`bsu-progress-${courseSlug}-${user.id}`);
        if (raw) ids = JSON.parse(raw);
      } catch { /* ignore */ }
      try {
        const { data: rows, error } = await supabase
          .from('bsu_progress')
          .select('lesson_id')
          .eq('user_id', user.id)
          .eq('course', courseSlug);
        if (!error && rows) ids = [...ids, ...rows.map((r: { lesson_id: string }) => r.lesson_id)];
      } catch { /* table may not exist yet */ }
      setCompleted(new Set(ids.filter((id) => validIds.has(id))));

      let savedDate: string | null = null;
      try {
        const { data: cert, error } = await supabase
          .from('bsu_certificates')
          .select('completed_at')
          .eq('user_id', user.id)
          .eq('course', courseSlug)
          .maybeSingle();
        if (!error && cert?.completed_at) savedDate = cert.completed_at;
      } catch { /* table may not exist yet */ }
      if (!savedDate) {
        try { savedDate = window.localStorage.getItem(`bsu-cert-${courseSlug}-${user.id}`); } catch { /* ignore */ }
      }
      setCertDate(savedDate);

      setLoading(false);
    })();
  }, [router, allLessons, courseSlug]);

  const activeLesson = useMemo(
    () => allLessons.find((l) => l.id === activeLessonId) ?? allLessons[0],
    [allLessons, activeLessonId]
  );
  const percent = Math.round((completed.size / allLessons.length) * 100);

  function backToModules() {
    setMobileView('list');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Marking a lesson complete returns the user to the full module list.
  function markComplete(id: string) {
    const next = new Set(completed);
    next.add(id);
    setCompleted(next);
    backToModules();

    if (userId) {
      try {
        window.localStorage.setItem(`bsu-progress-${courseSlug}-${userId}`, JSON.stringify([...next]));
      } catch { /* ignore */ }
      Promise.resolve(
        supabase.from('bsu_progress').upsert(
          { user_id: userId, course: courseSlug, lesson_id: id },
          { onConflict: 'user_id,course,lesson_id', ignoreDuplicates: true },
        ),
      ).catch(() => { /* table may not exist yet */ });

      // First time every lesson is done: record the date and show the certificate.
      if (next.size >= allLessons.length && !certDate) {
        const now = new Date().toISOString();
        setCertDate(now);
        try { window.localStorage.setItem(`bsu-cert-${courseSlug}-${userId}`, now); } catch { /* ignore */ }
        Promise.resolve(
          supabase.from('bsu_certificates').upsert(
            { user_id: userId, course: courseSlug, completed_at: now },
            { onConflict: 'user_id,course', ignoreDuplicates: true },
          ),
        ).catch(() => { /* table may not exist yet */ });
        setShowCert(true);
      }
    }
  }

  const finished = percent === 100 || !!certDate;
  const shareUrl = isReferrer && username
    ? `https://mitypeapp.com/?ref=${encodeURIComponent(username)}`
    : 'https://mitypeapp.com';

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        background: 'var(--brand-personal-bg-cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <p style={{ color: 'var(--brand-personal)', fontSize: 18 }}>Loading...</p>
      </main>
    );
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--brand-personal-bg-cream)',
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      paddingBottom: 60,
    }}>
      <SiteNav userId={userId} showBack backFallbackHref="/black-sheep-university" />

      {/* Course header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid rgba(200,149,108,0.15)',
        padding: '22px 24px',
      }}>
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14,
            background: badgeBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {badge}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
              Black Sheep University
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.5px' }}>
              {title}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
            <div style={{ flex: 1, height: 8, borderRadius: 100, background: 'rgba(200,149,108,0.12)', overflow: 'hidden' }}>
              <div style={{ width: `${percent}%`, height: '100%', background: 'var(--brand-personal)', borderRadius: 100, transition: 'width 0.3s ease' }} />
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--brand-personal)', whiteSpace: 'nowrap' }}>
              {percent}% complete
            </span>
          </div>
        </div>
      </div>

      {finished && username && (
        <div style={{ maxWidth: 1040, margin: '20px auto 0', padding: '0 24px' }}>
          <div style={{
            background: 'white', border: '1px solid rgba(200,149,108,0.35)', borderRadius: 18,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 15, fontWeight: 900, color: 'var(--brand-text-primary)' }}>
                You completed the {title}.
              </p>
              <p style={{ fontSize: 13, color: 'var(--brand-personal-text-mid)', marginTop: 2 }}>
                Download your certificate or share it with your followers.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCert(true)}
              style={{
                padding: '11px 20px', borderRadius: 100, border: 'none', background: 'var(--brand-personal)',
                color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              View my certificate
            </button>
          </div>
        </div>
      )}

      {showCert && username && (
        <CertificateModal
          open={showCert}
          onClose={() => setShowCert(false)}
          username={username}
          courseTitle={title}
          courseSlug={courseSlug}
          completedAt={certDate ? new Date(certDate) : new Date()}
          shareUrl={shareUrl}
        />
      )}

      <div
        className="bsu-course-grid"
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: '28px 24px',
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 280px) 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* Sidebar: modules + lessons */}
        <nav
          className={`bsu-sidebar${mobileView === 'lesson' ? ' bsu-sidebar--hidden-mobile' : ''}`}
          style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.15)',
            borderRadius: 20,
            padding: 10,
            position: 'sticky',
            top: 84,
            maxHeight: 'calc(100vh - 110px)',
            overflowY: 'auto',
          }}
        >
          {modules.map((mod) => (
            <div key={mod.id} style={{ marginBottom: 10 }}>
              <p style={{
                fontSize: 11.5, fontWeight: 800, color: 'var(--brand-personal-text-light)',
                textTransform: 'uppercase', letterSpacing: '0.4px',
                padding: '8px 10px 4px',
              }}>
                {mod.title}
              </p>
              {mod.lessons.map((lesson) => {
                const isActive = lesson.id === activeLessonId;
                const isDone = completed.has(lesson.id);
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => { setActiveLessonId(lesson.id); setMobileView('lesson'); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      textAlign: 'left',
                      padding: '9px 10px',
                      borderRadius: 12,
                      border: 'none',
                      cursor: 'pointer',
                      background: isActive ? 'rgba(200,149,108,0.1)' : 'transparent',
                      color: isActive ? 'var(--brand-personal)' : 'var(--brand-personal-text-head)',
                      fontFamily: 'inherit',
                      fontSize: 13.5,
                      fontWeight: isActive ? 800 : 600,
                    }}
                  >
                    <span style={{
                      width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                      border: `1.5px solid ${isDone ? 'var(--brand-market)' : 'rgba(200,149,108,0.4)'}`,
                      background: isDone ? 'var(--brand-market)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, color: 'white',
                    }}>
                      {isDone ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1 }}>{lesson.title}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Lesson viewer */}
        <div
          className={`bsu-lesson${mobileView === 'list' ? ' bsu-lesson--hidden-mobile' : ''}`}
          style={{
            background: 'white',
            border: '1px solid rgba(200,149,108,0.15)',
            borderRadius: 24,
            padding: '32px 36px',
            position: 'relative',
            overflow: 'hidden',
            userSelect: 'none',
            WebkitUserSelect: 'none',
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="bsu-mobile-back-button"
            onClick={() => setMobileView('list')}
            aria-label="Back to modules"
            style={{
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              padding: '0 0 16px',
              fontSize: 14,
              fontWeight: 800,
              color: 'var(--brand-personal)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              position: 'relative',
              zIndex: 1,
            }}
          >
            ← All modules
          </button>
          {/* Watermark: faint, tiled, carries the viewer's own username
              so a leaked screenshot is traceable. */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: 'repeat(6, 1fr)',
              opacity: 0.05,
              transform: 'rotate(-18deg) scale(1.3)',
              zIndex: 0,
            }}
          >
            {Array.from({ length: 18 }).map((_, i) => (
              <span key={i} style={{ fontSize: 13, fontWeight: 800, color: 'var(--brand-personal)', whiteSpace: 'nowrap' }}>
                {watermarkLabel}
              </span>
            ))}
          </div>

          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
              {activeLesson.minutes} min lesson
            </p>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.5px', marginBottom: 20 }}>
              {activeLesson.title}
            </h2>

            {activeLesson.body.map((para, i) => {
              if (para.startsWith('## ')) {
                return (
                  <h3 key={i} style={{ fontSize: 18, fontWeight: 800, color: 'var(--brand-text-primary)', margin: '24px 0 10px', letterSpacing: '-0.2px' }}>
                    {para.slice(3)}
                  </h3>
                );
              }
              if (para.startsWith('* ')) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, fontSize: 15.5, lineHeight: 1.65, color: 'var(--brand-personal-text-head)', marginBottom: 8, paddingLeft: 4 }}>
                    <span aria-hidden="true" style={{ color: 'var(--brand-personal)', fontWeight: 900 }}>•</span>
                    <span style={{ flex: 1 }}>{para.slice(2)}</span>
                  </div>
                );
              }
              return (
                <p key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--brand-personal-text-head)', marginBottom: 16 }}>
                  {para}
                </p>
              );
            })}

            {lessonExtras?.[activeLesson.id]}

            {activeLesson.links && activeLesson.links.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '20px 0 8px' }}>
                {activeLesson.links.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '12px 16px',
                      background: 'rgba(200,149,108,0.08)',
                      border: '1px solid rgba(200,149,108,0.25)',
                      borderRadius: 14,
                      color: 'var(--brand-personal)',
                      fontSize: 14,
                      fontWeight: 800,
                      textDecoration: 'none',
                    }}
                  >
                    <span>{l.label}</span>
                    <span aria-hidden="true">↗</span>
                  </a>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => markComplete(activeLesson.id)}
              disabled={completed.has(activeLesson.id)}
              style={{
                marginTop: 12,
                padding: '12px 26px',
                background: completed.has(activeLesson.id) ? 'rgba(21,128,61,0.12)' : 'var(--brand-personal)',
                color: completed.has(activeLesson.id) ? 'var(--brand-market)' : 'white',
                border: 'none',
                borderRadius: 100,
                fontSize: 14,
                fontWeight: 800,
                cursor: completed.has(activeLesson.id) ? 'default' : 'pointer',
              }}
            >
              {completed.has(activeLesson.id) ? '✓ Lesson complete' : 'Mark lesson complete'}
            </button>

            <div style={{ marginTop: 18 }}>
              <button
                type="button"
                onClick={backToModules}
                style={{
                  padding: '12px 26px',
                  background: 'transparent',
                  color: 'var(--brand-personal)',
                  border: '1.5px solid rgba(200,149,108,0.5)',
                  borderRadius: 100,
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                ← Back to course modules
              </button>
            </div>
          </div>
        </div>
      </div>

      <FeatureInfoButton featureKey="black_sheep_university" />
    </main>
  );
}
