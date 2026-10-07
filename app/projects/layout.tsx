import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Project Rooms | Mitype' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
