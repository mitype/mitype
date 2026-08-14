'use client';
// One-time toast that announces the new info-icon system to every
// user on their next dashboard visit. Gated by localStorage so it
// only ever fires once per device.

import { useEffect } from 'react';
import { toast } from '../lib/toast';

const SEEN_KEY = 'mitype-feature-info-announce-seen-v1';

export function FeatureInfoAnnouncement() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (window.localStorage.getItem(SEEN_KEY) === '1') return;
      // Delay so the dashboard has time to render before the toast pops.
      const t = setTimeout(() => {
        toast.info(
          'New: tap the small (i) icon in the bottom-right of any page for a full guide to that feature. Or open the burger menu and tap Information Center for a complete breakdown of every Mitype feature in one place. Explore Discover, Wave, The Current, Messages, Brand Deals, Collab Board, Meetups, Project Rooms, Small Businesses, Mi Home Goods, and more.',
          { duration: 15000 }
        );
        try { window.localStorage.setItem(SEEN_KEY, '1'); } catch {}
      }, 1400);
      return () => clearTimeout(t);
    } catch {
      // localStorage unavailable, skip silently.
    }
  }, []);
  return null;
}
