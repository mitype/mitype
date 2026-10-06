'use client';
// /black-sheep-university/youtube - YouTube Masterclass.
// Thin wrapper: the reader, gating, and copy protection live in the
// shared CourseViewer. Lesson content lives in ../_course/youtubeModules.ts.

import { CourseViewer } from '../_course/CourseViewer';
import { MODULES } from '../_course/youtubeModules';

export default function YouTubeMasterclassPage() {
  return (
    <CourseViewer
      title="YouTube Masterclass"
      badgeBg="rgba(204,0,0,0.08)"
      badge={(
        <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
          <rect x="2" y="10" width="44" height="28" rx="9" fill="#CC0000" />
          <path d="M20 17.5 L32 24 L20 30.5 Z" fill="white" />
        </svg>
      )}
      modules={MODULES}
    />
  );
}
