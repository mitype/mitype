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
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 4h2.2l2 11h10.4l2-8H6.4" stroke="#a07a4d" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="9" cy="19" r="1.5" fill="#a07a4d" />
          <circle cx="17" cy="19" r="1.5" fill="#a07a4d" />
        </svg>
      )}
      modules={AMAZON_MODULES}
    />
  );
}
