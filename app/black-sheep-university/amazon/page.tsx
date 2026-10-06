'use client';
// /black-sheep-university/amazon - Amazon Seller Masterclass.
// Thin wrapper around the shared CourseViewer. Lesson content lives in
// ../_course/amazonModules*.ts.

import { CourseViewer } from '../_course/CourseViewer';
import { AMAZON_MODULES } from '../_course/amazonModules';

export default function AmazonMasterclassPage() {
  return (
    <CourseViewer
      title="Amazon Seller Masterclass"
      badgeBg="rgba(200,149,108,0.14)"
      badge={(
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3.5 8.5 12 4l8.5 4.5v7L12 20l-8.5-4.5v-7Z" stroke="#a07a4d" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M3.5 8.5 12 13l8.5-4.5M12 13v7" stroke="#a07a4d" strokeWidth="1.7" strokeLinejoin="round" />
          <path d="M16 3.5h4v4M20 3.5l-5 5" stroke="#a07a4d" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      modules={AMAZON_MODULES}
    />
  );
}
