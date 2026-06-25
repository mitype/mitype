'use client';
// One responsive hamburger nav used on every page of the site.
//
// The layout: optional Back button + Mitype wordmark on the left,
// optional notification bell + hamburger button on the right. Tapping
// the hamburger reveals a vertical drawer listing every primary route
// (Dashboard, Discover, The Wave Feed, Spotlight, Weekly, Messages,
// Edit Profile, Sign Out). Same list, every page, every screen size —
// clean and predictable. Subscription is intentionally not in the
// drawer — it surfaces on the dashboard welcome instead.
//
// Why hamburger on desktop too: the messages page especially gets
// crowded with horizontal links + back button + brand + actions all
// competing for space. A pure hamburger pattern eliminates that
// every-page sizing battle and gives users one consistent menu.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BackButton } from './BackButton';
import { NotificationBell } from './NotificationBell';
import { UnreadBadge } from './UnreadBadge';
import { useUnreadCounts } from '../lib/useUnreadCounts';
import { supabase } from '../lib/supabaseClient';

interface Props {
  /** Pass this to enable the unread badge on the menu's dot and the
   *  Messages row + the notification bell. */
  userId?: string | null;
  showBack?: boolean;
  backFallbackHref?: string;
  /** Brand accent — 'bronze' (default) or 'purple' for business pages. */
  accent?: 'bronze' | 'purple';
  /** Whether to render the notification bell next to the hamburger.
   *  Default true when userId is present. */
  showBell?: boolean;
  /** Optional ' · business' suffix next to the mitype wordmark. */
  brandSuffix?: string;
  /** Hide the Sign Out row (e.g. on a public profile preview). */
  hideSignOut?: boolean;
}

export function SiteNav({
  userId,
  showBack = false,
  backFallbackHref = '/dashboard',
  accent = 'bronze',
  showBell,
  brandSuffix,
  hideSignOut,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { unread } = useUnreadCounts(userId ?? undefined);

  const accentColor = accent === 'purple' ? 'var(--brand-business)' : 'var(--brand-personal)';
  const accentText = accent === 'purple' ? 'var(--brand-business-deep)' : 'var(--brand-personal-text-mid)';
  const borderColor = accent === 'purple'
    ? 'rgba(139,92,246,0.18)'
    : 'rgba(200,149,108,0.15)';
  const bgColor = accent === 'purple'
    ? 'rgba(246,243,251,0.95)'
    : 'rgba(250,246,240,0.95)';

  const wantsBell = (showBell ?? true) && !!userId;

  async function handleSignOut() {
    await supabase.auth.signOut();
    setOpen(false);
    router.push('/');
  }

  // Each drawer item renders as a soft, full-width pill — bronze (or
  // purple on business pages) tinted background, accent-colored text,
  // no emojis. Tight, professional, scannable. The unread badge for
  // Messages still tucks into the right edge.
  const pillBg = accent === 'purple'
    ? 'rgba(139,92,246,0.08)'
    : 'rgba(200,149,108,0.08)';
  const pillBorder = accent === 'purple'
    ? 'rgba(139,92,246,0.18)'
    : 'rgba(200,149,108,0.2)';
  const pillText = accent === 'purple' ? 'var(--brand-business-deep)' : '#6b4f33';

  function NavLink({
    href, label, badge,
  }: { href: string; label: string; badge?: number }) {
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '13px 20px',
          color: pillText,
          fontSize: 15,
          fontWeight: 700,
          textDecoration: 'none',
          borderRadius: 100,
          background: pillBg,
          border: `1px solid ${pillBorder}`,
          letterSpacing: '0.1px',
        }}
      >
        <span>{label}</span>
        {badge !== undefined && badge > 0 && (
          <span style={{ marginLeft: 'auto' }}>
            <UnreadBadge count={badge} />
          </span>
        )}
      </Link>
    );
  }

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: bgColor,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${borderColor}`,
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 20px',
        gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {showBack && (
            <BackButton fallbackHref={backFallbackHref} />
          )}
          <Link href="/dashboard" style={{
            fontSize: 22,
            fontWeight: 900,
            color: accentColor,
            letterSpacing: '-1px',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            mitype
            {brandSuffix && (
              <span style={{ color: 'var(--brand-text-primary)' }}>{brandSuffix}</span>
            )}
          </Link>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {wantsBell && userId && (
            <NotificationBell userId={userId} tone={accent} />
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            style={{
              width: 40,
              height: 40,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: accentText,
              padding: 6,
              borderRadius: 8,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              {open ? (
                <>
                  <path d="M7 7 L19 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M7 19 L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M4 8 H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 13 H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M4 18 H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
            {!open && unread.total > 0 && (
              <span style={{
                position: 'absolute',
                top: 4,
                right: 4,
                width: 9,
                height: 9,
                background: accentColor,
                borderRadius: '50%',
                border: '2px solid white',
                boxSizing: 'content-box',
              }} />
            )}
          </button>
        </div>
      </div>

      {open && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '10px 16px 18px',
          gap: 8,
          borderTop: `1px solid ${borderColor}`,
          maxWidth: 720,
          margin: '0 auto',
          width: '100%',
        }}>
          <NavLink href="/dashboard"    label="Dashboard" />
          <NavLink href="/discover"     label="Discover" />
          <NavLink href="/wave"         label="The Wave Feed" />
          <NavLink href="/spotlight"    label="Spotlight" />
          <NavLink href="/weekly"       label="Weekly" />
          <NavLink href="/messages"     label="Messages" badge={unread.total} />
          {/* Small Businesses entry. Soft purple outline on white, mirroring
              the Mi Home Goods entry beneath it. Routes to the dedicated
              /businesses listing page (empty state if none yet). */}
          <Link
            href="/businesses"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 20px',
              color: 'var(--brand-business-deep)',
              fontSize: 15,
              fontWeight: 800,
              textDecoration: 'none',
              borderRadius: 100,
              background: 'white',
              border: '1px solid rgba(139,92,246,0.4)',
              letterSpacing: '0.1px',
              boxShadow: '0 8px 22px rgba(139,92,246,0.18)',
            }}
          >
            <span>🏪 Small Businesses</span>
          </Link>
          {/* Mi Home Goods. Soft green outline on white, matching the
              tone of the Small Business CTA on the landing page. */}
          <Link
            href="/home-goods"
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '13px 20px',
              color: 'var(--brand-market)',
              fontSize: 15,
              fontWeight: 800,
              textDecoration: 'none',
              borderRadius: 100,
              background: 'white',
              border: '1px solid rgba(21,128,61,0.4)',
              letterSpacing: '0.1px',
              boxShadow: '0 8px 22px rgba(21,128,61,0.18)',
            }}
          >
            <span>🏡 Mi Home Goods</span>
          </Link>
          <NavLink href="/edit-profile" label="Edit Profile" />
          {!hideSignOut && userId && (
            <button
              type="button"
              onClick={handleSignOut}
              style={{
                marginTop: 6,
                padding: '13px 20px',
                background: 'transparent',
                border: `1px solid ${borderColor}`,
                borderRadius: 100,
                color: 'var(--brand-personal-text-mid)',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                letterSpacing: '0.1px',
                textAlign: 'left',
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
