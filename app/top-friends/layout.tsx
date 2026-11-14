import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Top Friends | Mitype' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
