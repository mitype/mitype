'use client';
// /projects — List of shared project rooms the user is part of.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';
import { SiteNav } from '../components/SiteNav';
import { liquidGlass } from '../lib/liquidGlass';

interface ProjectRow {
  id: string; title: string; description: string | null;
  participant_ids: string[]; status: string; updated_at: string;
}

export default function ProjectsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const [subRes, projRes] = await Promise.all([
        supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle(),
        supabase.from('project_rooms')
          .select('id, title, description, participant_ids, status, updated_at')
          .contains('participant_ids', [user.id])
          .order('updated_at', { ascending: false }),
      ]);
      const s = subRes.data?.status;
      setIsSubscribed(s === 'active' || s === 'trialing');
      setProjects(projRes.data ?? []);
      setLoading(false);
    })();
  }, [router]);

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/dashboard" />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6 }}>Workspace</p>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.8px', marginBottom: 8 }}>Project Rooms</h1>
        <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.5, marginBottom: 20 }}>
          Shared workspaces for creators who are teaming up. Each room has a title, description, task list, and deadline. All participants see everything.
        </p>
        <Link href={isSubscribed ? '/projects/new' : '/subscription'}
          style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '10px 22px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none', marginBottom: 20 }}>
          {isSubscribed ? 'Start a project room' : 'Subscribe to start'}
        </Link>
        {loading ? <p style={{ textAlign: 'center', color: 'var(--brand-personal)', padding: '48px 0' }}>Loading...</p>
          : projects.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', background: 'white', border: '1px solid rgba(200,149,108,0.15)', borderRadius: 16, color: 'var(--brand-personal-text-light)', fontSize: 14 }}>
              No project rooms yet. Start one after you connect with a collaborator.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}
                  style={{ ...liquidGlass({ tone: 'clear', radius: 14, variant: 'lite' }), display: 'block', padding: '14px 16px', textDecoration: 'none', color: 'var(--brand-text-primary)' }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.2px' }}>{p.title}</h3>
                  <p style={{ fontSize: 12, color: 'var(--brand-personal-text-light)', margin: 0 }}>
                    {p.participant_ids.length} collaborator{p.participant_ids.length === 1 ? '' : 's'} · {p.status}
                  </p>
                </Link>
              ))}
            </div>
          )}
      </div>
    </main>
  );
}
