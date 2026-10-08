'use client';
// /black-sheep-university/cottage-bakery - Cottage Bakery Masterclass.
// Thin wrapper around the shared CourseViewer. Lesson content lives in
// ../_course/cottageModules*.ts and the state rules data in
// ../_course/cottageStateRules.ts.

import { notFound } from 'next/navigation';
import { COTTAGE_BAKERY_LIVE } from '../_course/releaseFlags';
import { CourseViewer } from '../_course/CourseViewer';
import { COTTAGE_MODULES } from '../_course/cottageModules';
import { StateRulesFinder } from '../_course/StateRulesFinder';
import { PriceCalculator, CapTracker } from '../_course/CourseTools';
import { LabelBuilder, RecipeScaler, PrintableChecklists, SeasonalCalendar } from '../_course/CourseTools2';

export default function CottageBakeryMasterclassPage() {
  // Hidden until the launch announcement is ready (see releaseFlags.ts).
  if (!COTTAGE_BAKERY_LIVE) notFound();
  return (
    <CourseViewer
      courseSlug="cottage-bakery"
      title="Cottage Bakery Masterclass"
      badgeBg="rgba(200,149,108,0.14)"
      badge={(
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M4 12 6.5 5h19L28 12Z" fill="#a07a4d" opacity="0.25" stroke="#a07a4d" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M4 12c0 2 2 3 4 3s4-1 4-3c0 2 2 3 4 3s4-1 4-3c0 2 2 3 4 3s4-1 4-3" stroke="#a07a4d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7 15v13M25 15v13" stroke="#a07a4d" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M5 21h22v2H5z" fill="#a07a4d" />
          <path d="M11 21c0-2 1.2-3.5 3-3.5s3 1.5 3 3.5" stroke="#a07a4d" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="21" cy="19" r="1.8" fill="#a07a4d" />
        </svg>
      )}
      modules={COTTAGE_MODULES}
      lessonExtras={{
        'state-rules': <StateRulesFinder />,
        'cost-per-unit': <PriceCalculator />,
        'cap-and-growth-math': <CapTracker />,
        'label-design': <LabelBuilder />,
        'recipe-testing': <RecipeScaler />,
        'checklists': <PrintableChecklists />,
        'seasonal': <SeasonalCalendar />,
      }}
    />
  );
}
