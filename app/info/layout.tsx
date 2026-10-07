import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Information Center | Mitype' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
