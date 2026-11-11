// Keeps the private command center out of search engines and link previews.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Command center',
  robots: { index: false, follow: false, nocache: true },
};

export default function CommandLayout({ children }: { children: ReactNode }) {
  return children;
}
