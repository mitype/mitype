'use client';
// Menu row for turning phone notifications on or off.

import { useEffect, useState } from 'react';
import { getPushState, enablePush, disablePush, PushState } from '../lib/pushNotifications';
import { toast } from '../lib/toast';

interface Props {
  userId: string;
  pillBg: string;
  pillBorder: string;
  pillText: string;
}

export function PushNotificationsToggle({ userId, pillBg, pillBorder, pillText }: Props) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [help, setHelp] = useState('');

  useEffect(() => {
    let alive = true;
    getPushState().then((s) => { if (alive) setState(s); });
    return () => { alive = false; };
  }, []);

  if (state === null || state === 'unsupported') return null;

  async function onClick() {
    if (busy) return;
    if (state === 'needs-install') {
      setHelp('To get notifications on iPhone, tap the Share button in Safari, choose Add to Home Screen, then open Mitype from your Home Screen and turn this on.');
      return;
    }
    if (state === 'blocked') {
      setHelp('Notifications are blocked for Mitype. Turn them on in your phone Settings, then come back here.');
      return;
    }
    setHelp('');
    setBusy(true);
    try {
      if (state === 'on') {
        await disablePush(userId);
        setState('off');
        toast.success('Phone notifications are off.');
      } else {
        const result = await enablePush(userId);
        setState(result);
        if (result === 'on') toast.success('Phone notifications are on.');
        else setHelp('Notifications are blocked for Mitype. Turn them on in your phone Settings, then come back here.');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not change notifications.');
    } finally {
      setBusy(false);
    }
  }

  const label =
    state === 'on' ? 'Phone notifications: On' :
    state === 'blocked' ? 'Phone notifications: Blocked' :
    'Turn on phone notifications';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', padding: '13px 20px', color: pillText, fontSize: 15, fontWeight: 700,
          borderRadius: 100, background: pillBg, border: `1px solid ${pillBorder}`, letterSpacing: '0.1px',
          cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        {busy ? 'Working...' : label}
      </button>
      {help && (
        <p style={{ margin: '0 8px', fontSize: 13, lineHeight: 1.45, color: pillText }}>{help}</p>
      )}
    </div>
  );
}
