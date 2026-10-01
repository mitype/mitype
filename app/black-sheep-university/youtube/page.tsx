'use client';
// /black-sheep-university/youtube - YouTube Masterclass.
//
// This is the UI shell + placeholder curriculum for the first Black
// Sheep University course. Real lesson copy gets written and dropped
// into MODULES below once approved; the page itself (gating, module
// sidebar, progress ring, lesson viewer, copy protection, watermark)
// is fully built and does not change when content is added.
//
// Copy protection (display-only, same approach real course platforms
// use - nothing fully stops a screenshot, but this removes the easy
// paths):
//   - No download/export control anywhere on this page.
//   - Right-click and text selection are disabled on the lesson body.
//   - A faint watermark of the viewer's own username/email is tiled
//     across the lesson body, so a screenshot is traceable.
//   - Content is only ever rendered through this gated page; there is
//     no static file or public URL serving the lesson text.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { FeatureInfoButton } from '../../components/FeatureInfoButton';

interface Lesson {
  id: string;
  title: string;
  minutes: number;
  body: string[];
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

// Placeholder curriculum. Each lesson's `body` holds 1-2 short
// placeholder paragraphs just to prove out the reading layout; the
// real $600-value lesson content replaces these once written.
const MODULES: Module[] = [
  {
    id: 'equipment',
    title: 'Module 1: Equipment & Setup',
    lessons: [
      { id: 'cameras-mics', title: 'Cameras, Mics & Lighting That Actually Matter', minutes: 14, body: ['Placeholder lesson content. Full lesson covers budget-tier, mid-tier, and pro-tier gear recommendations matched to YouTube\'s current upload and streaming requirements.'] },
      { id: 'software', title: 'Recording & Editing Software Stack', minutes: 11, body: ['Placeholder lesson content. Full lesson walks through free vs paid editing software and export settings tuned for YouTube.'] },
    ],
  },
  {
    id: 'content-strategy',
    title: 'Module 2: Content Strategy & Production',
    lessons: [
      { id: 'niche', title: 'Finding and Owning Your Niche', minutes: 12, body: ['Placeholder lesson content.'] },
      { id: 'production', title: 'Planning, Filming & Editing Workflow', minutes: 16, body: ['Placeholder lesson content.'] },
    ],
  },
  {
    id: 'seo',
    title: 'Module 3: SEO & Discoverability',
    lessons: [
      { id: 'titles-thumbnails', title: 'Titles, Thumbnails & Click-Through Rate', minutes: 13, body: ['Placeholder lesson content.'] },
      { id: 'metadata', title: 'Descriptions, Tags & Chapters for Search', minutes: 10, body: ['Placeholder lesson content.'] },
      { id: 'algorithm', title: 'How the Suggested & Search Algorithm Works', minutes: 15, body: ['Placeholder lesson content.'] },
    ],
  },
  {
    id: 'monetization',
    title: 'Module 4: Monetization & the YouTube Shop',
    lessons: [
      { id: 'ypp', title: 'YouTube Partner Program Requirements', minutes: 9, body: ['Placeholder lesson content. Full lesson covers current Tier 1 and Tier 2 monetization thresholds.'] },
      { id: 'shop', title: 'Setting Up and Using YouTube Shopping', minutes: 12, body: ['Placeholder lesson content. Full lesson covers the Shopping affiliate program and product tagging.'] },
      { id: 'multiple-streams', title: 'Ad Revenue, Memberships, Super Chat & Sponsors', minutes: 14, body: ['Placeholder lesson content.'] },
    ],
  },
  {
    id: 'growth',
    title: 'Module 5: Growing Subscribers & Community',
    lessons: [
      { id: 'retention', title: 'Hooking Viewers & Building Retention', minutes: 13, body: ['Placeholder lesson content.'] },
      { id: 'community', title: 'Community Tab, Shorts & Cross-Promotion', minutes: 11, body: ['Placeholder lesson content.'] },
    ],
  },
  {
    id: 'advertising',
    title: 'Module 6: Brand Deals & Commercial Advertising',
    lessons: [
      { id: 'brand-deals', title: 'Landing and Pricing Brand Deals', minutes: 14, body: ['Placeholder lesson content.'] },
      { id: 'disclosure', title: 'FTC Disclosure & Commercial Ad Rules', minutes: 9, body: ['Placeholder lesson content.'] },
      { id: 'capstone', title: 'Capstone: Your 90-Day Channel Plan', minutes: 18, body: ['Placeholder lesson content.'] },
    ],
  },
];

const ALL_LESSONS = MODULES.flatMap((m) => m.lessons);

export default function YouTubeMasterclassPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [watermarkLabel, setWatermarkLabel] = useState('');
  const [activeLessonId, setActiveLessonId] = useState(ALL_LESSONS[0].id);
  // On narrow screens the sidebar and lesson viewer can't sit
  // side-by-side without squeezing the lesson text into a sliver, so
  // only one panel shows at a time there. Desktop ignores this and
  // always shows both (see .bsu-course-grid in globals.css).
  const [mobileView, setMobileView] = useState<'list' | 'lesson'>('list');
  // Local-only for this UI preview. Once real content ships, completed
  // lesson ids should be read from / written to a
  // `university_progress` table so progress survives across devices.
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
    () => ALL_LESSONS.find((l) => l.id === activeLessonId) ?? ALL_LESSONS[0],
    [activeLessonId]
  );
  const percent = Math.round((completed.size / ALL_LESSONS.length) * 100);

  function markComplete(id: string) {
    setCompleted((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
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
            background: 'rgba(204,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
              <rect x="2" y="10" width="44" height="28" rx="9" fill="#CC0000" />
              <path d="M20 17.5 L32 24 L20 30.5 Z" fill="white" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
              Black Sheep University
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.5px' }}>
              YouTube Masterclass
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
          {MODULES.map((mod) => (
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
          {/* Watermark: faint, tiled, carries the viewer's own
              username/email so a leaked screenshot is traceable. */}
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

            {activeLesson.body.map((para, i) => (
              <p key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--brand-personal-text-head)', marginBottom: 16 }}>
                {para}
              </p>
            ))}

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
          </div>
        </div>
      </div>

      <FeatureInfoButton featureKey="black_sheep_university" />
    </main>
  );
}
