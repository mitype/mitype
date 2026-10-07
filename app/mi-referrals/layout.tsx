import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Mi Referrals | Mitype' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
