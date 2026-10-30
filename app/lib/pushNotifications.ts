// Client helpers for phone (web push) notifications.
//
// A member turns notifications on from the menu. We register the service
// worker, ask the browser for permission, subscribe, and save the phone's
// address in `push_subscriptions` (members can only touch their own rows).
// The server then sends a push whenever someone interacts with them.

import { supabase } from './supabaseClient';

export type PushState =
  | 'unsupported'     // browser cannot do push at all
  | 'needs-install'   // iPhone/iPad: must be added to the Home Screen first
  | 'blocked'         // permission denied in the phone settings
  | 'off'             // available, not turned on
  | 'on';             // turned on for this device

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

function isStandalone(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = window.atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === 'undefined') return 'unsupported';
  const hasPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!hasPush) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (isIos() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'denied') return 'blocked';
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    if (sub && Notification.permission === 'granted') return 'on';
  } catch {
    /* fall through */
  }
  return 'off';
}

export async function enablePush(userId: string): Promise<'on' | 'blocked'> {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error('Notifications are not set up yet.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'blocked';

  const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  const json = sub.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) throw new Error('Could not turn on notifications.');

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      { user_id: userId, endpoint: json.endpoint, p256dh, auth, user_agent: navigator.userAgent.slice(0, 200) },
      { onConflict: 'user_id,endpoint' },
    );
  if (error) throw new Error('Could not turn on notifications.');
  return 'on';
}

/** Turns notifications off for this device (and removes its saved address). */
export async function disablePush(userId?: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration('/sw.js');
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      if (userId) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint);
      }
      await sub.unsubscribe();
    }
  } catch {
    /* best effort */
  }
}
