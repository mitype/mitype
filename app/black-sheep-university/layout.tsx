import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Black Sheep University | Mitype' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
