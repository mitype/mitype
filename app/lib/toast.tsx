'use client';
// Lightweight toast system with no external deps.
//
// Usage:
//   import { toast } from '@/app/lib/toast';
//   toast.success('Profile saved!');
//   toast.error('Something went wrong.');
//
// Mount <Toaster /> once in app/layout.tsx. It subscribes to a
// module-level event bus so any component (client or server-emitted
// through a client boundary) can call `toast(...)` without prop-drilling.

import { useEffect, useState } from 'react';

type ToastType = 'success' | 'error' | 'info';

export interface ToastRecord {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = (t: ToastRecord) => void;

const listeners = new Set<Listener>();
let nextId = 1;

function emit(type: ToastType, message: string) {
  const record: ToastRecord = { id: nextId++, type, message };
  listeners.forEach((l) => l(record));
}

export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};

const COLORS: Record<ToastType, { bg: string; border: string; fg: string; icon: string }> = {
  success: { bg: '#f0faf2', border: 'rgba(34,197,94,0.3)', fg: '#16a34a', icon: '✓' },
  error:   { bg: '#fff0f0', border: 'rgba(220,100,100,0.3)', fg: '#c07070', icon: '⚠' },
  info:    { bg: '#fff8f0', border: 'rgba(200,149,108,0.3)', fg: '#c8956c', icon: 'ℹ' },
};

export function Toaster() {
  const [items, setItems] = useState<ToastRecord[]>([]);

  useEffect(() => {
    const listener: Listener = (t) => {
      setItems((prev) => [...prev, t]);
      // Auto-dismiss after 4 seconds
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== t.id));
      }, 4000);
    };
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  function dismiss(id: number) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        pointerEvents: 'none',
        maxWidth: 'calc(100vw - 48px)',
      }}
    >
      {items.map((t) => {
        const c = COLORS[t.type];
        return (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            style={{
              pointerEvents: 'auto',
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: 14,
              padding: '12px 16px 12px 14px',
              minWidth: 260,
              maxWidth: 380,
              boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              color: c.fg,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Helvetica Neue', Arial, sans-serif",
              animation: 'mitype-toast-in 180ms ease-out',
            }}
          >
            <span aria-hidden="true" style={{ fontSize: 16, lineHeight: '20px', flexShrink: 0 }}>{c.icon}</span>
            <span style={{ flex: 1, color: '#1a1208', fontWeight: 500, lineHeight: 1.45 }}>{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                color: '#a89278',
                fontSize: 18,
                lineHeight: '20px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <style>{`
        @keyframes mitype-toast-in {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
