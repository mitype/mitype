'use client';
// useFoldableViewport — exposes fold-aware viewport state so layouts
// can adapt to Apple's iPhone Duo (and any other book-style foldable).
//
// The iPhone Duo has two display modes:
//   * Outer (folded): 5.49" 2088x1422, 4:3 aspect, ~433pt logical wide.
//     Behaves like a squat iPhone. Standard mobile layout still works.
//   * Inner (unfolded): 7.76" 2713x1920, ~1.41:1, ~610pt logical wide.
//     Closer to a small tablet. Room for two-column layouts.
//
// When the fold hinge is exposed to the browser, CSS environment
// variables env(viewport-segment-*) become available and the media
// query `(horizontal-viewport-segments: 2)` matches — Safari and
// Chromium both support this. We read both here.
//
// Callers get a plain snapshot they can render against; this hook does
// not manage its own subscribe/unsubscribe cadence beyond a single
// resize listener, so it's cheap to include on every page.

import { useEffect, useState } from 'react';

export interface FoldableViewport {
  /** Current width in CSS pixels. */
  width: number;
  /** Current height in CSS pixels. */
  height: number;
  /** True when the browser exposes two horizontal viewport segments,
   *  i.e. the app is spanned across the fold with the hinge visible. */
  isSpanning: boolean;
  /** True when the viewport is wide enough to host a two-column layout
   *  (iPhone Duo unfolded, iPad mini portrait, and any small tablet). */
  isUnfolded: boolean;
  /** True when the viewport is at standard mobile width (single column). */
  isMobile: boolean;
  /** True when the viewport aspect is 4:3-ish (outer folded display or
   *  landscape mobile). Useful for adjusting media that assumes 9:16. */
  isSquareish: boolean;
}

// 600 CSS pixels is the standard breakpoint for "small tablet or wider".
// iPhone Duo unfolded reports ~610pt in portrait, which lands cleanly
// above it. Standard iPhone Pro Max reports 430pt, well below it.
const UNFOLDED_MIN_WIDTH = 600;

function computeSnapshot(): FoldableViewport {
  if (typeof window === 'undefined') {
    return {
      width: 375, height: 812,
      isSpanning: false, isUnfolded: false, isMobile: true, isSquareish: false,
    };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const aspect = h > 0 ? w / h : 0;
  // "Squareish" covers 4:3 (0.75) through 5:4 (0.8) — the outer folded
  // display sits inside that band in portrait orientation.
  const isSquareish = aspect >= 0.7 && aspect <= 0.85;
  const isSpanning =
    typeof window.matchMedia === 'function' &&
    (window.matchMedia('(horizontal-viewport-segments: 2)').matches ||
     window.matchMedia('(vertical-viewport-segments: 2)').matches);
  return {
    width: w,
    height: h,
    isSpanning,
    isUnfolded: w >= UNFOLDED_MIN_WIDTH,
    isMobile: w < UNFOLDED_MIN_WIDTH,
    isSquareish,
  };
}

export function useFoldableViewport(): FoldableViewport {
  const [snapshot, setSnapshot] = useState<FoldableViewport>(() => computeSnapshot());

  useEffect(() => {
    function update() { setSnapshot(computeSnapshot()); }
    window.addEventListener('resize', update);
    // orientationchange fires when the user rotates or unfolds. Not
    // strictly required (resize also fires) but adds a safety net.
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return snapshot;
}
