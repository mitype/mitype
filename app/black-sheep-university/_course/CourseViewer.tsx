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

interface Props {
  title: string;
  badge: React.ReactNode;
  badgeBg: string;
  modules: Module[];
}

export function CourseViewer({ title, badge, badgeBg, modules }: Props) {
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
  // Local only for now. Completed lesson ids should eventually be read
  // from and written to a progress table so they survive across devices.
  const [completed, setCompleted] = useState<Set<string>>(new Set());

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
        .select('username')
        .eq('user_id', user.id)
        .maybeSingle();
      setWatermarkLabel(profile?.username ? `@${profile.username}` : user.email ?? user.id);

      setLoading(false);
    })();
  }, [router]);

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
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    backToModules();
  }

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
