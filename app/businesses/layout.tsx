import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Small Businesses | Mitype' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
