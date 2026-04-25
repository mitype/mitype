'use client';
// Install Mitype as a PWA — small banner at the bottom of the screen.
//
// Three platforms behave differently here:
//
//   * Chrome / Edge (desktop + Android) — fires `beforeinstallprompt`. We
//     stash the event and show our own banner; tapping "Install" calls
//     `prompt()` on the stashed event.
//
//   * iOS Safari — does NOT fire the event and gives no programmatic API.
//     We detect iOS by UA and show an instructions banner ("Tap share →
//     Add to Home Screen") instead.
//
//   * Already installed — `display-mode: standalone` is true, so we render
//     nothing.
//
// Dismissals are sticky in localStorage so the banner doesn't follow people
// around. We also delay showing it for ~10s so it doesn't interrupt the
// first thing they're trying to do.

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'mitype-install-dismissed-v1';
const SHOW_DELAY_MS = 10000;

// The standard BeforeInstallPromptEvent isn't in lib.dom.d.ts. Re-declare
// just the bits we use.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // iPad on iOS 13+ reports as Mac; sniff for that case too.
  const isIpadOS =
    ua.includes('Mac') && typeof document !== 'undefined' && 'ontouchend' in document;
  return /iPhone|iPad|iPod/i.test(ua) || isIpadOS;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  // iOS-specific flag on navigator.
  // @ts-expect-error — non-standard
  if (window.navigator.standalone) return true;
  return false;
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosTip, setShowIosTip] = useState(false);
  const [visible, setVisible] = useState(false);

  // Capture the install prompt for browsers that support it.
  useEffect(() => {
    if (isStandalone()) return;

    let dismissed = false;
    try {
      dismissed = window.localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (dismissed) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS path: no event ever fires, so we have to surface the tip ourselves.
    if (isIos()) {
      setShowIosTip(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  // Reveal after a delay so we don't interrupt the user's first task.
  useEffect(() => {
    if (!deferred && !showIosTip) return;
    const t = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
  }, [deferred, showIosTip]);

  // If the app gets installed via the browser's own UI, hide.
  useEffect(() => {
    function onInstalled() {
      setDeferred(null);
      setShowIosTip(false);
      setVisible(false);
      try {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  async function install() {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      // Either way we hide — the user has decided. Only persist dismissal
      // if they actively said no, so accepted users still get the
      // appinstalled flow.
      setDeferred(null);
      setVisible(false);
      if (outcome === 'dismissed') {
        try {
          window.localStorage.setItem(STORAGE_KEY, '1');
        } catch {
          /* ignore */
        }
      }
    } catch {
      // Prompt threw (rare) — just hide and remember.
      dismiss();
    }
  }

  if (!visible) return null;
  if (!deferred && !showIosTip) return null;

  const isIosTip = !deferred && showIosTip;

  return (
    <div
      role="dialog"
      aria-label="Install Mitype"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 950,
        maxWidth: 460,
        margin: '0 auto',
        background: 'linear-gradient(135deg, #fff8ec 0%, #fff3ec 100%)',
        border: '1px solid rgba(200,149,108,0.35)',
        borderRadius: 18,
        padding: '14px 14px 14px 18px',
        boxShadow: '0 18px 40px rgba(26,18,8,0.22)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        animation: 'mitype-install-fade 0.3s ease-out',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #e8d5c4 0%, #c8956c 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 900,
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        m
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            color: '#1a1208',
            fontSize: 14,
            fontWeight: 800,
            margin: '0 0 2px',
          }}
        >
          {isIosTip ? 'Add Mitype to your Home Screen' : 'Install Mitype'}
        </p>
        <p style={{ color: '#6b5744', fontSize: 12, margin: 0, lineHeight: 1.4 }}>
          {isIosTip
            ? 'Tap the Share icon, then “Add to Home Screen.”'
            : 'One tap, no app store. Open Mitype like a real app.'}
        </p>
      </div>

      {!isIosTip && (
        <button
          type="button"
          onClick={install}
          style={{
            padding: '10px 16px',
            background: '#c8956c',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            fontFamily: 'inherit',
          }}
        >
          Install
        </button>
      )}

      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install banner"
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: 'none',
          background: 'transparent',
          color: '#a89278',
          fontSize: 18,
          cursor: 'pointer',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          fontFamily: 'inherit',
        }}
      >
        ×
      </button>

      <style>{`
        @keyframes mitype-install-fade {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
